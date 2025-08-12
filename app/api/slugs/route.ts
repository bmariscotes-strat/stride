// app/api/slugs/route.ts or /pages/api/slugs.ts depending on your structure
import { NextRequest, NextResponse } from "next/server";
import { getSlugById } from "@/lib/services/utils/getters";

export async function POST(req: NextRequest) {
  const { teamId, projectId } = await req.json();

  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }

  try {
    const slugs = await getSlugById(teamId, projectId);
    return NextResponse.json(slugs);
  } catch (err) {
    console.error("[API] Failed to fetch slugs:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
