// POST /api/app-track — registra/atualiza a visita de um aparelho no app.
// Base do KPI "Usuários do app" e da aba homônima no painel: cada aparelho
// que abre o /app (portal de acesso ou plataforma liberada) aparece aqui com
// plano, aparelho, visitas e 1ª/última visita.
// O plano/e-mail informado é o do acesso pago verificado neste aparelho —
// sem acesso, fica como uso gratuito do lançamento.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import { clientIp, rateLimitHit } from "@/lib/access";

export const dynamic = "force-dynamic";

const PLAN_VALUES = new Set(["free", "pass30", "lifetime"]);

export async function POST(req: NextRequest) {
  // Anti-abuso: 60 registros / 10 min por IP (abrir o app repetidamente não
  // deve estourar, mas bots não devem inflar a base).
  if (rateLimitHit(`app-track:${clientIp(req)}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, message: "Muitas requisições." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as
    | { deviceId?: string; plan?: string; email?: string }
    | null;

  const deviceId = String(body?.deviceId ?? "").trim().slice(0, 80);
  if (deviceId.length < 8) {
    return NextResponse.json({ ok: false, message: "deviceId inválido." }, { status: 400 });
  }

  const planRaw = String(body?.plan ?? "free").trim().toLowerCase();
  const plan = PLAN_VALUES.has(planRaw) ? planRaw : "free";
  const emailRaw = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
  const email = emailRaw.includes("@") ? emailRaw : null;
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 300) || null;

  try {
    const db = await dbReady();
    await db.appUser.upsert({
      where: { deviceId },
      create: { deviceId, plan, email, userAgent, visits: 1 },
      update: {
        visits: { increment: 1 },
        plan,
        ...(email ? { email } : {}),
        ...(userAgent ? { userAgent } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[app-track POST]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
