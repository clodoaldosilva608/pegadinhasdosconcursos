import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
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
