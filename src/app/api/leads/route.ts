// Funil de captação (LGPD): armazena e-mail + WhatsApp de quem autorizou
// receber novidades e ofertas. Consentimento explícito é obrigatório.

import { NextRequest, NextResponse } from "next/server";
import { dbReady } from "@/lib/db";
import { clientIp, isEmail, normalizeEmail, rateLimitHit } from "@/lib/access";

export const dynamic = "force-dynamic";

const SOURCES = new Set(["landing", "app", "gate", "admin"]);

/** Normaliza WhatsApp brasileiro para só dígitos (DDD + número). */
function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
}

export async function POST(req: NextRequest) {
  if (rateLimitHit(`leads:${clientIp(req)}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; whatsapp?: string; consent?: boolean; source?: string }
    | null;

  const email = normalizeEmail(String(body?.email ?? ""));
  if (!isEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Informe um e-mail válido." },
      { status: 400 }
    );
  }
  if (body?.consent !== true) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Para receber novidades é preciso autorizar o envio (LGPD). Sem autorização, não armazenamos seus dados.",
      },
      { status: 400 }
    );
  }

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : null;
  const whatsapp = normalizeWhatsapp(String(body?.whatsapp ?? ""));
  if (typeof body?.whatsapp === "string" && body.whatsapp.trim() && !whatsapp) {
    return NextResponse.json(
      { ok: false, message: "WhatsApp inválido. Use DDD + número (ex.: 61 98888-7777)." },
      { status: 400 }
    );
  }
  const source = SOURCES.has(String(body?.source ?? "")) ? String(body?.source) : "landing";

  try {
    const db = await dbReady();
    const lead = await db.lead.upsert({
      where: { email },
      update: { name: name ?? undefined, whatsapp: whatsapp ?? undefined, consent: true, source },
      create: { email, name, whatsapp, consent: true, source },
      select: { id: true, email: true, source: true },
    });
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    console.error("[leads]", error);
    return NextResponse.json(
      { ok: false, message: "Não consegui cadastrar agora. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
