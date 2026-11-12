// GET /api/support/contact — entrega o canal de suporte (e-mail/WhatsApp)
// SOMENTE sob demanda, quando o usuário clica em "prefiro falar por e-mail/
// WhatsApp" no modal. O endereço nunca é incluído no HTML/JS da página.

import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimitHit } from "@/lib/access";
import { getSiteConfig } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (rateLimitHit(`support-contact:${clientIp(req)}`, 30, 60 * 1000)) {
    return NextResponse.json({ ok: false, message: "Aguarde um instante." }, { status: 429 });
  }

  const values = await getSiteConfig();
  return NextResponse.json({
    ok: true,
    email: values.support_email || null,
    whatsapp: values.support_whatsapp || null,
  });
}
