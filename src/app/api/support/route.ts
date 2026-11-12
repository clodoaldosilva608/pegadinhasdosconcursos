// POST /api/support — mensagem do botão "Suporte" (landing/bloqueio).
// O e-mail de suporte NUNCA aparece na página: a mensagem é gravada no banco
// e o dono responde pela caixa de entrada do painel (/admin → Suporte).
// Se o usuário preferir e-mail/WhatsApp, GET /api/support/contact entrega o
// canal sob demanda (nunca no HTML/JS da página).

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import { clientIp, isEmail, rateLimitHit } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Anti-abuso: 5 mensagens / 10 min por IP.
  if (rateLimitHit(`support:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Muitas mensagens enviadas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; message?: string }
    | null;

  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim().slice(0, 120) || null;
  const message = String(body?.message ?? "").trim().slice(0, 4000);

  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, message: "Informe um e-mail válido." }, { status: 400 });
  }
  if (message.length < 5) {
    return NextResponse.json(
      { ok: false, message: "Escreva sua dúvida ou problema na mensagem." },
      { status: 400 }
    );
  }

  try {
    const db = await dbReady();
    await db.supportMessage.create({ data: { email, name, message } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[support POST]", error);
    return NextResponse.json(
      { ok: false, message: "Não consegui registrar agora. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
