// Compartilhar a plataforma com os amigos (Web Share API + WhatsApp/Telegram).

export function appUrl(): string {
  if (typeof window !== "undefined" && window.location.origin.startsWith("http")) {
    return window.location.origin;
  }
  return "https://pegadinhasdosconcursos.vercel.app";
}

export function shareText(): string {
  return (
    "Descobri o Detector de Pegadinhas: você manda a questão e ele mostra a pegadinha " +
    "que a banca preparou — o distrator, o operador semântico e o porquê de cada alternativa. " +
    `Vale demais para concurso: ${appUrl()}`
  );
}

export function whatsappLink(): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText())}`;
}

export function telegramLink(): string {
  const text = "Descobri o Detector de Pegadinhas — mostra a pegadinha da banca antes de você errar.";
  return `https://t.me/share/url?url=${encodeURIComponent(appUrl())}&text=${encodeURIComponent(text)}`;
}

export async function nativeShare(): Promise<"shared" | "unsupported" | "cancelled"> {
  if (typeof navigator === "undefined" || !navigator.share) return "unsupported";
  try {
    await navigator.share({ title: "Detector de Pegadinhas · Con-curso", text: shareText(), url: appUrl() });
    return "shared";
  } catch {
    return "cancelled";
  }
}

export async function copyAppLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(appUrl());
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = appUrl();
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      return true;
    } catch {
      return false;
    }
  }
}
