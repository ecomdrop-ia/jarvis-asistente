"use strict";

/**
 * YARBIS Electron shell.
 *
 * Loads the Next.js UI in a chromium-backed BrowserWindow with two critical
 * tweaks that don't exist in a plain browser:
 *
 *   1. autoplayPolicy: "no-user-gesture-required"
 *      — agent's TTS audio plays the instant the WebSocket delivers it,
 *        no need to click anything first.
 *
 *   2. setPermissionRequestHandler granting "media"
 *      — microphone is opened automatically. macOS still asks once at the
 *        OS level on the first launch; after that it's silent.
 *
 * Closing the window does NOT exit the app — it only hides it. The mic
 * stays open, the WebRTC connection stays alive, YARBIS keeps listening.
 * To actually quit, use Cmd+Q or the YARBIS menu → Quit.
 */

const {
  app,
  BrowserWindow,
  Menu,
  Notification,
  session,
  shell,
} = require("electron");
const http = require("http");
const path = require("path");

const TARGET_URL = process.env.YARBIS_UI_URL || "http://localhost:3000";
const KIOSK = process.env.YARBIS_KIOSK === "1";
const DEV = process.env.YARBIS_DEV === "1";
// Local-only command server — voice-bridge POSTs here to control the window.
// Bound to 127.0.0.1 so it's not reachable from the network.
const COMMAND_PORT = parseInt(process.env.YARBIS_CMD_PORT || "9871", 10);

// Permissive autoplay so TTS plays immediately on connect.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("enable-features", "WebRtcHideLocalIpsWithMdns");

let mainWindow = null;
let isQuitting = false;
let hasShownBackgroundNotice = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0A1618",
    title: "YARBIS",
    titleBarStyle: "hiddenInset",
    fullscreen: KIOSK,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: "no-user-gesture-required",
      sandbox: true,
      // CRITICAL for "always listening" mode: when the window is hidden,
      // Chromium would otherwise throttle JS timers and pause the
      // mic/WebRTC streams. Disable that — we want the renderer to keep
      // running at full speed even with no visible window.
      backgroundThrottling: false,
    },
  });

  // Auto-grant microphone (and only microphone). Everything else is denied.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, perm, cb) => {
    cb(perm === "media" || perm === "microphone");
  });
  mainWindow.webContents.session.setPermissionCheckHandler((_wc, perm) => {
    return perm === "media" || perm === "microphone";
  });

  mainWindow.loadURL(TARGET_URL);

  if (DEV) mainWindow.webContents.openDevTools({ mode: "detach" });

  // ─── Hide-on-close ───────────────────────────────────────────────────
  // Critical for "always listening" mode: if we let the window close
  // normally, webContents tears down → microphone closes → WebRTC dies.
  // By intercepting close, the renderer keeps running in background.
  mainWindow.on("close", (e) => {
    if (isQuitting) return; // genuine Quit — let it close
    e.preventDefault();
    mainWindow.hide();
    showBackgroundNoticeOnce();
  });

  // Retry loading if the Next.js dev server isn't ready yet.
  mainWindow.webContents.on("did-fail-load", (_e, errorCode) => {
    if (errorCode === -3) return; // ERR_ABORTED, e.g. dev server reload
    setTimeout(() => mainWindow && mainWindow.loadURL(TARGET_URL), 2000);
  });

  return mainWindow;
}

function showBackgroundNoticeOnce() {
  if (hasShownBackgroundNotice) return;
  hasShownBackgroundNotice = true;

  if (Notification.isSupported()) {
    new Notification({
      title: "YARBIS sigue activo",
      body:
        "El asistente sigue escuchando en background. Click en el ícono del Dock para volver a abrir la ventana.",
      silent: true,
    }).show();
  }
}

function buildAppMenu() {
  // Replace the default menu so users have a clear way to show/hide and
  // quit the app — and so Cmd+W maps to "hide" (its natural macOS feel)
  // rather than "destroy webContents".
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: "YARBIS",
            submenu: [
              { label: "Acerca de YARBIS", role: "about" },
              { type: "separator" },
              {
                label: "Mostrar ventana",
                accelerator: "CmdOrCtrl+Shift+Y",
                click: () => mainWindow?.show(),
              },
              {
                label: "Ocultar ventana",
                accelerator: "CmdOrCtrl+H",
                click: () => mainWindow?.hide(),
              },
              { type: "separator" },
              {
                label: "Cerrar YARBIS (matar voice loop)",
                accelerator: "CmdOrCtrl+Q",
                click: () => {
                  isQuitting = true;
                  app.quit();
                },
              },
            ],
          },
        ]
      : []),
    {
      label: "Editar",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "Ver",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Local command server.
 *
 * Lets the Python voice-bridge tell the Electron window to do things —
 * show, hide, fullscreen, etc. — without us having to wire up a full IPC
 * channel.  Runs on 127.0.0.1 only.
 *
 *   POST /show-fullscreen   → bring window to front + enter fullscreen
 *   POST /show              → bring window to front (no fullscreen change)
 *   POST /hide              → hide window (mic stays open)
 *   POST /exit-fullscreen   → leave fullscreen
 *
 * Errors and unknown routes return 404.
 */
function startCommandServer() {
  const handlers = {
    "show-fullscreen": () => {
      if (!mainWindow) return;
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.setFullScreen(true);
      mainWindow.focus();
      app.focus({ steal: true });
    },
    "show": () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.focus();
      app.focus({ steal: true });
    },
    "hide": () => mainWindow?.hide(),
    "exit-fullscreen": () => mainWindow?.setFullScreen(false),
  };

  const server = http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405); return res.end();
    }
    const cmd = req.url?.replace(/^\//, "") ?? "";
    const handler = handlers[cmd];
    if (!handler) {
      res.writeHead(404); return res.end(`unknown command: ${cmd}`);
    }
    try {
      handler();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, command: cmd }));
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  server.on("error", (err) => {
    console.error(`[yarbis-cmd] command server error:`, err.message);
  });

  server.listen(COMMAND_PORT, "127.0.0.1", () => {
    console.log(`[yarbis-cmd] listening on http://127.0.0.1:${COMMAND_PORT}`);
  });
}

app.whenReady().then(() => {
  // Ask macOS for mic access at the OS level on first launch.
  if (process.platform === "darwin") {
    const { systemPreferences } = require("electron");
    systemPreferences.askForMediaAccess?.("microphone").catch(() => {});
  }

  buildAppMenu();
  createWindow();
  startCommandServer();

  // Clicking the Dock icon re-opens the window if it was hidden.
  app.on("activate", () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
});

// Real exit only happens via Cmd+Q (which sets isQuitting = true via the
// menu) or via SIGTERM (e.g. when launchd stops the job).
app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  // On macOS keep the app running even with no windows — that's how the
  // "always listening" mode works. The user must explicitly Quit.
  if (process.platform !== "darwin") app.quit();
});
