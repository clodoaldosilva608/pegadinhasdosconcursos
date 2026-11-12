// Leads (funil) — painel admin.
// GET  /api/admin/leads?q=&source=&page=&pageSize=  lista paginada
// POST /api/admin/leads                              cria manualmente

import { NextRequest, NextResponse } from "next/server";
import { adminDenied } from "@/lib/adminAuth";
import { dbReady } from "@/lib/db";
import { isEmail, normalizeEmail } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const source = (searchParams.get("source") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? "20") || 20));

  const where = {
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
            { whatsapp: { contains: q } },
          ],
        }
      : {}),
    ...(source ? { source } : {}),
  };

  try {
    const db = await dbReady();
    const [items, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.lead.count({ where }),
    ]);
    return NextResponse.json({ ok: true, items, total, page, pageSize });
  } catch (error) {
    console.error("[admin/leads GET]", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = adminDenied(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as
    | { email?: string; name?: string; whatsapp?: string; consent?: boolean; source?: string; notes?: string }
    | null;

  const email = normalizeEmail(String(body?.email ?? ""));
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, message: "E-mail inválido." }, { status: 400 });
  }

  try {
    const db = await dbReady();
    const lead = await db.lead.upsert({
      where: { email },
      update: {
        name: body?.name?.trim() || undefined,
        whatsapp: body?.whatsapp?.replace(/\D/g, "") || undefined,
        consent: body?.consent !== false,
        source: body?.source || "admin",
        notes: body?.notes?.slice(0, 500) || undefined,
      },
      create: {
        email,
        name: body?.name?.trim() || null,
        whatsapp: body?.whatsapp?.replace(/\D/g, "") || null,
        consent: body?.consent !== false,
        source: body?.source || "admin",
        notes: body?.notes?.slice(0, 500) || null,
      },
    });
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    console.error("[admin/leads POST]", error);
    return NextResponse.json({ ok: false, error: "Erro ao salvar lead" }, { status: 500 });
  }
}
