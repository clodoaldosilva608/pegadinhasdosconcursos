import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = {
  title: "Entrar · Detector de Pegadinhas",
  description:
    "Acesse sua conta do Detector de Pegadinhas com e-mail e senha — ou crie a sua em segundos. Quem pagou entra e o acesso é liberado em qualquer aparelho.",
};

export default function EntrarPage() {
  return <AuthPage />;
}
