// pages/api/socket.ts or app/api/socket/route.ts (if using app router)
import { NextApiRequest, NextApiResponse } from "next";
import { initializeSocket } from "@/lib/socket/server";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    console.log("Setting up Socket.IO server...");

    // Initialize Socket.IO server
    const socketServer = initializeSocket(res.socket.server);
    res.socket.server.io = socketServer;
  }

  res.end();
}

// If using App Router (app/api/socket/route.ts)
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Socket.IO will be initialized when this route is first called
  return new Response("Socket.IO server ready");
}
