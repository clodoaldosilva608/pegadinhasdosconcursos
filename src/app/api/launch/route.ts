// Estado do lançamento gratuito, calculado com o relógio do servidor.
// O frontend usa esta rota para decidir entre acesso livre e paywall,
// sem confiar no relógio do aparelho do usuário.

import { NextResponse } from "next/server";
import { LAUNCH_FREE_UNTIL_ISO, isLaunchFreeNow } from "@/lib/launch";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    launchFree: isLaunchFreeNow(),
    freeUntil: LAUNCH_FREE_UNTIL_ISO,
    serverNow: new Date().toISOString(),
  });
}
