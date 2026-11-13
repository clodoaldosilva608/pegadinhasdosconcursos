import type { Metadata } from "next";
import { AccountGate } from "@/components/access/AccountGate";
import { AccessGate } from "@/components/access/AccessGate";
import { DetectorApp } from "@/components/detector/DetectorApp";
import { SplashScreen } from "@/components/pwa/SplashScreen";

export const metadata: Metadata = {
  title: "Plataforma · Detector de Pegadinhas",
};

export default function AppPage() {
  return (
    <>
      {/* Splash de abertura (Task 23): animação da marca, duração = do vídeo.
          FORA dos gates: monta 1× por load e roda já durante a validação de
          acesso — revalidações do AccountGate não reiniciam a animação. */}
      <SplashScreen />
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
