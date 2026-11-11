import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await dbReady();
    let account = await db.account.findUnique({ where: { id: "internal" } });
    if (!account) {
      account = await db.account.create({
        data: { id: "internal", planLabel: "Conta interna", analysesLeft: 988, noDeadline: true },
      });
    }
    return NextResponse.json({
      planLabel: account.planLabel,
      analysesLeft: account.analysesLeft,
      noDeadline: account.noDeadline,
    });
  } catch (error) {
    console.error("[account GET]", error);
    return NextResponse.json(
      { planLabel: "Conta interna", analysesLeft: 988, noDeadline: true },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await dbReady();
    const body = await req.json().catch(() => ({}));
    await db.account.upsert({
      where: { id: "internal" },
      update: {},
      create: { id: "internal", planLabel: "Conta interna", analysesLeft: 988, noDeadline: true },
    });

    if (body?.reset) {
      const reset = await db.account.update({
        where: { id: "internal" },
        data: { analysesLeft: 988 },
      });
      return NextResponse.json({
        planLabel: reset.planLabel,
        analysesLeft: reset.analysesLeft,
        noDeadline: reset.noDeadline,
      });
    }

    const account = await db.account.findUnique({ where: { id: "internal" } });
    return NextResponse.json({
      planLabel: account?.planLabel ?? "Conta interna",
      analysesLeft: account?.analysesLeft ?? 988,
      noDeadline: account?.noDeadline ?? true,
    });
  } catch (error) {
    console.error("[account POST]", error);
    return NextResponse.json({ error: "Erro ao acessar conta" }, { status: 500 });
  }
}
