import type { Metadata } from "next";
import { AccessGate } from "@/components/access/AccessGate";
import { DetectorApp } from "@/components/detector/DetectorApp";

export const metadata: Metadata = {
  title: "Plataforma · Detector de Pegadinhas",
};

export default function AppPage() {
  return (
    <AccessGate>
      <DetectorApp />
    </AccessGate>
  );
}
