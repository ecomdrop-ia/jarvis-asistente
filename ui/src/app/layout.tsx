import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

// Display HUD typeface — JetBrains Mono. Modern monospace used by Linear,
// Vercel, GitHub. Reads as "professional terminal" rather than "retro arcade".
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Wordmark / sci-fi accent typeface — Orbitron. Used SPARINGLY:
// only for the "BIENVENIDO, SEÑOR" headline and the YARBIS wordmark.
// It's the canonical "Iron Man HUD" font — too heavy-handed to use
// across the whole UI, but exactly right for the hero moment.
const orbitron = Orbitron({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

// Body font — Inter. Clean sans-serif for long-form content (quotes, status
// labels). Pairs perfectly with JetBrains Mono.
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "YARBIS — Lab Assistant",
  description: "Your AI Real-time Builder Intelligence System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${jetbrainsMono.variable} ${inter.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-screen overflow-hidden">{children}</body>
    </html>
  );
}
