// Compartilhar a plataforma com os amigos.
// O convite sai completo: banner (imagem Open Graph), descrição e o link do app.

export const SHARE_TITLE = "Detector de Pegadinhas · Con-curso";

export function appUrl(): string {
  if (typeof window !== "undefined" && window.location.origin.startsWith("http")) {
    return window.location.origin;
  }
  return "https://pegadinhasdosconcursos.vercel.app";
}

/** Banner social (1200×630) que aparece como prévia do link no WhatsApp/Telegram. */
export function bannerUrl(): string {
  return `${appUrl()}/banner-share.png`;
}

export function shareDescription(): string {
  return (
    "Descobri o Detector de Pegadinhas: você manda a questão e ele mostra a pegadinha " +
    "que a banca preparou — o distrator, o operador semântico e o porquê de cada alternativa. " +
    "Vale demais para concurso:"
  );
}

export function shareText(): string {
  return `${shareDescription()} ${appUrl()}`;
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
    await navigator.share({ title: SHARE_TITLE, text: shareText(), url: appUrl() });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "unsupported";
  }
}

/** Copia o convite completo (descrição + link), não apenas o endereço. */
export async function copyInvite(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(shareText());
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = shareText();
      input.setAttribute("readonly", "true");
      input.style.position = "fixed";
      input.style.opacity = "0";
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

interface FileShareData extends ShareData {
  files?: File[];
}

/**
 * Compartilha o banner como imagem (quando o aparelho aceita arquivos no
 * Share Sheet — Android/iOS). Sem suporte, baixa o PNG para envio manual.
 */
export async function shareBannerImage(): Promise<"shared" | "downloaded" | "cancelled"> {
  try {
    const response = await fetch(bannerUrl());
    const blob = await response.blob();
    const file = new File([blob], "detector-de-pegadinhas.png", { type: "image/png" });
    if (typeof navigator !== "undefined" && navigator.share) {
      const data: FileShareData = { files: [file], title: SHARE_TITLE, text: shareText() };
      if (typeof navigator.canShare !== "function" || navigator.canShare(data)) {
        await navigator.share(data);
        return "shared";
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  }
  try {
    const anchor = document.createElement("a");
    anchor.href = bannerUrl();
    anchor.download = "detector-de-pegadinhas.png";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch {
    window.open(bannerUrl(), "_blank");
  }
  return "downloaded";
}
