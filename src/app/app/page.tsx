import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AccountGate } from "@/components/access/AccountGate";
import { AccessGate } from "@/components/access/AccessGate";
import { DetectorApp } from "@/components/detector/DetectorApp";
import { SplashScreen } from "@/components/pwa/SplashScreen";

export const metadata: Metadata = {
  title: "Plataforma · Detector de Pegadinhas",
};

export default async function AppPage() {
  // Splash de abertura (Task 23/25): UMA vez por sessão de navegador. O
  // SplashScreen marca o cookie de sessão "splash=1" quando toca; o server
  // decide aqui, no SSR — sem flash de overlay e sem repetir em reloads ou
  // no retorno pós-despedida do logout.
  const showSplash = !(await cookies()).get("splash");
  return (
    <>
      {showSplash && <SplashScreen />}
      {/* Task 21: sem cadastro não acessa — conta primeiro, depois o paywall
          (comprador logado recebe o token de acesso automaticamente). */}
      <AccountGate>
        <AccessGate>
          <DetectorApp />
        </AccessGate>
      </AccountGate>
    </>
  );
}
