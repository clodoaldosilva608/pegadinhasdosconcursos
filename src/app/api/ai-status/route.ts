import { NextResponse } from "next/server";
import { hasServerAi } from "@/lib/zai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const serverAi = await hasServerAi();
    return NextResponse.json({ serverAi });
  } catch {
    return NextResponse.json({ serverAi: false });
  }
}
