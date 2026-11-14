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
  title: "Pegadinhas dos Concursos | Detector Inteligente",
  description:
    "Descubra as pegadinhas das bancas examinadoras, identifique distratores e aprenda com o Método 3C: Conteúdo, Cauda e Contexto.",
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
  // redes sociais), ele já chega com a identidade oficial da marca, a
  // descrição e o endereço do app.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Pegadinhas dos Concursos",
    title: "Pegadinhas dos Concursos | Detector Inteligente",
    description:
      "Descubra as pegadinhas das bancas examinadoras, identifique distratores e aprenda com o Método 3C: Conteúdo, Cauda e Contexto.",
    images: [
      {
        url: "/banner-share-v3.png",
        width: 1200,
        height: 630,
        alt: "Pegadinhas dos Concursos — A pegadinha que a banca preparou, decifrada antes da prova!",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pegadinhas dos Concursos | Detector Inteligente",
    description:
      "Descubra as pegadinhas das bancas examinadoras, identifique distratores e aprenda com o Método 3C: Conteúdo, Cauda e Contexto.",
    images: ["/banner-share-v3.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07152F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
