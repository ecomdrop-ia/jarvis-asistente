import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

// Per-room JWT for the local LiveKit Server. Browser asks for a token, joins
// the room, and the voice-bridge agent (running as a worker) joins the same
// room from the Python side.
export async function GET(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LIVEKIT_API_KEY/SECRET not configured" },
      { status: 500 },
    );
  }

  const room = req.nextUrl.searchParams.get("room") ?? "yarbis-lab";
  const identity = `elkin-${Date.now()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: "1h",
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, url: process.env.NEXT_PUBLIC_LIVEKIT_URL, room });
}
