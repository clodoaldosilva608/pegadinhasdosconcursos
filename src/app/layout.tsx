import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pegadinhasdosconcursos.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Detector de Pegadinhas · Con-curso",
  description:
    "A ferramenta que te explica os distratores das questões e aprofunda o conteúdo pelo gabarito. Mande a questão, confirme o que marcou e entenda a pegadinha.",
  keywords: ["concursos", "distratores", "pegadinhas", "questões", "estudos", "Con-curso"],
  manifest: "/manifest.webmanifest",
  applicationName: "Pegadinhas",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pegadinhas",
  },
  formatDetection: {
    telephone: false,
  },
  // Cartão do convite: quando o link é compartilhado (WhatsApp, Telegram,
  // redes sociais), ele já chega com banner, descrição e o endereço do app.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Detector de Pegadinhas · Con-curso",
    title: "Detector de Pegadinhas · Con-curso",
    description:
      "Mande a questão, confirme o que marcou e veja a pegadinha que a banca preparou: o distrator, o operador semântico e o porquê de cada letra (Método 3C).",
    images: [
      {
        url: "/banner-share.png",
        width: 1200,
        height: 630,
        alt: "Detector de Pegadinhas — análise da questão com o Método 3C",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Detector de Pegadinhas · Con-curso",
    description:
      "Mande a questão, confirme o que marcou e veja a pegadinha que a banca preparou — pelo Método 3C.",
    images: ["/banner-share.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e9b78",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${nunito.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-nunito), Nunito, ui-sans-serif, system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
        {/* Registro do service worker (PWA instalável, shell offline) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});}",
          }}
        />
      </body>
    </html>
  );
}
