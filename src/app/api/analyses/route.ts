// GET /api/analyses — histórico de análises da conta logada (últimas 25).
// A análise é vinculada ao e-mail da sessão no momento do POST /api/analyze.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import { sessionEmail } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = sessionEmail(req);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "SESSION_REQUIRED", message: "Entre com sua conta." },
      { status: 401 }
    );
  }
  try {
    const db = await dbReady();
    const items = await db.analysis.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        banca: true,
        organization: true,
        questionText: true,
        correctLetter: true,
        userMarked: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("[analyses GET]", error);
    return NextResponse.json({ ok: false, error: "Erro ao carregar o histórico" }, { status: 500 });
  }
}
