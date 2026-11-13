import type { Metadata } from "next";
import { AccountGate } from "@/components/access/AccountGate";
import { AccessGate } from "@/components/access/AccessGate";
import { DetectorApp } from "@/components/detector/DetectorApp";

export const metadata: Metadata = {
  title: "Plataforma · Detector de Pegadinhas",
};

export default function AppPage() {
  return (
    // Task 21: sem cadastro não acessa — conta primeiro, depois o paywall
    // (comprador logado recebe o token de acesso automaticamente).
    <AccountGate>
      <AccessGate>
        <DetectorApp />
      </AccessGate>
    </AccountGate>
  );
}
