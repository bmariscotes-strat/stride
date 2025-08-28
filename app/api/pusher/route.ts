import { pusher } from "@/lib/websocket/pusher";
import { NextRequest, NextResponse } from "next/server";

interface PusherRequest {
  channel: string;
  event: string;
  data: any;
}

export async function POST(request: NextRequest) {
  try {
    const { channel, event, data }: PusherRequest = await request.json();

    await pusher.trigger(channel, event, data);

    return NextResponse.json({ message: "Event triggered successfully" });
  } catch (error) {
    console.error("Pusher trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger event" },
      { status: 500 }
    );
  }
}
