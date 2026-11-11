"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, X, ScanText, PenLine } from "lucide-react";

interface UploadZoneProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  disabled?: boolean;
}

const MAX_IMAGES = 4;
// Compressão no cliente: mantém cada imagem leve o suficiente para APIs
// serverless (limite de ~4,5 MB por requisição na Vercel) e agiliza o OCR.
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read error"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode error"));
      el.src = dataUrl;
    });
    const longest = Math.max(img.width, img.height);
    const scale = Math.min(1, MAX_EDGE / Math.max(1, longest));
    if (scale === 1 && dataUrl.length <= 900_000) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return out.length < dataUrl.length ? out : dataUrl;
  } catch {
    // Se não der para comprimir (ex.: formato incomum), usa o original.
    return dataUrl;
  }
}

export function UploadZone({
  images,
  onImagesChange,
  notes,
  onNotesChange,
  disabled,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);

  const addFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_IMAGES);
      const dataUrls: string[] = [];
      for (const f of imgs) {
        try {
          dataUrls.push(await compressImage(f));
        } catch {
          // ignore single failure
        }
      }
      if (dataUrls.length) {
        onImagesChange([...images, ...dataUrls].slice(0, MAX_IMAGES));
      }
    },
    [images, onImagesChange]
  );

  // Colar imagem com Ctrl+V
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const files = items
        .filter((i) => i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f));
      if (files.length) {
        e.preventDefault();
        setPasteHint(true);
        setTimeout(() => setPasteHint(false), 1500);
        void addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, disabled]);

  return (
    <section className="space-y-3" aria-label="Enviar questão">
      <div
        role="button"
        tabIndex={0}
        aria-label="Cole o print da questão, arraste uma imagem ou escolha do dispositivo"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          void addFiles(Array.from(e.dataTransfer.files));
        }}
        className={`relative flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          dragging
            ? "border-[#0e9b78] bg-emerald-50/90 scale-[1.01]"
            : "border-[#c9a284]/60 bg-white/55 hover:bg-white/80"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e0f3ed] text-[#0e9b78]">
          <ScanText className="h-6 w-6" aria-hidden="true" />
        </div>

        {images.length === 0 ? (
          <>
            <p className="text-sm sm:text-base font-bold dp-text-ink">
              Cole o print aqui (Ctrl+V) ou arraste a imagem
            </p>
            <p className="text-xs sm:text-sm text-[#8a7462] font-medium">
              Questão longa? Mande até {MAX_IMAGES} imagens. Elas viram uma questão só.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#0e9b78] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-900/20 transition hover:bg-[#0b7d61]"
              disabled={disabled}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              Escolher imagem
            </button>
          </>
        ) : (
          <div className="w-full">
            <div className="flex flex-wrap items-stretch justify-center gap-3">
              {images.map((src, i) => (
                <div
                  key={i}
                  className="group relative h-28 w-24 overflow-hidden rounded-xl border-2 border-white shadow-md"
                >
                  <img src={src} alt={`Imagem ${i + 1} da questão`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remover imagem ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onImagesChange(images.filter((_, idx) => idx !== i));
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  className="flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#c9a284]/70 text-[#8a7462] transition hover:border-[#0e9b78] hover:text-[#0e9b78]"
                  disabled={disabled}
                >
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[11px] font-bold">Adicionar</span>
                </button>
              )}
            </div>
            {pasteHint && (
              <p className="mt-2 text-xs font-bold text-[#0e9b78]">Imagem colada!</p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <div className="relative">
        <PenLine
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#a08a77]"
          aria-hidden="true"
        />
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={disabled}
          rows={2}
          maxLength={600}
          placeholder="Questão em texto, dúvida ou observação? Escreva aqui (opcional)"
          aria-label="Observação opcional sobre a questão"
          className="w-full resize-none rounded-2xl border border-[#e4d2bf] bg-white/85 p-3 pl-9 text-sm dp-text-ink placeholder:text-[#a89380] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25"
        />
        <span className="pointer-events-none absolute bottom-2.5 right-3 text-[10px] font-semibold text-[#b39b85] tabular-nums">
          {notes.length}/600
        </span>
      </div>
    </section>
  );
}
