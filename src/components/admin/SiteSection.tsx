"use client";

// Aba "Site" do painel: gerencia páginas, elementos e funcionalidades da
// aplicação (SiteConfig). Tudo aqui é refletido na landing, no /api/launch,
// no paywall e nas rotas de IA na próxima carga das páginas.

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Values = Record<string, string>;

const inputCls =
  "w-full rounded-xl border border-[#e7d9c4] bg-white/90 px-3.5 py-2.5 text-sm font-semibold text-[#233028] placeholder:text-[#c4ac93] focus:border-[#0e9b78] focus:outline-none focus:ring-2 focus:ring-[#0e9b78]/25";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17b98c] to-[#0e9b78] px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-900/20 transition hover:from-[#0fa87f] hover:to-[#0b7d61] disabled:opacity-70";

const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c8b4] bg-white/80 px-3 py-2 text-xs font-extrabold text-[#6f5b47] transition hover:bg-white disabled:opacity-60";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-black uppercase tracking-widest text-[#8a7462]">{label}</span>
      {children}
      {hint && <span className="text-[11px] font-semibold text-[#a08a77]">{hint}</span>}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-[#fdf9f2] p-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e9b78]"
      />
      <span className="min-w-0">
        <span className="block text-xs font-extrabold text-[#233028]">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] font-semibold text-[#8a7462]">{hint}</span>}
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dp-card rounded-2xl p-4">
      <h3 className="text-sm font-extrabold dp-text-ink">{title}</h3>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </div>
  );
}

// datetime-local <-> ISO (a data é exibida no fuso do navegador do admin)
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function SiteSection() {
  const { toast } = useToast();
  const [values, setValues] = useState<Values | null>(null);
  const [saving, setSaving] = useState(false);
  const [freeUntilLocal, setFreeUntilLocal] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.status === 401) {
      window.location.reload();
      return;
    }
    const json = (await res.json()) as { ok: boolean; values: Values };
    if (json.ok) {
      setValues(json.values);
      setFreeUntilLocal(isoToLocalInput(json.values.launch_free_until ?? ""));
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const set = (key: string, value: string) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  };
  const toggle = (key: string, next: boolean) => set(key, next ? "1" : "0");
  const isOn = (key: string) => (values?.[key] ?? "1") === "1";

  const save = async () => {
    if (!values) return;
    setSaving(true);
    try {
      const payload: Values = { ...values };
      if (freeUntilLocal) payload.launch_free_until = localInputToIso(freeUntilLocal);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: payload }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string; values?: Values };
      if (res.ok && json.ok) {
        toast({
          title: "Site atualizado",
          description: json.message ?? "As páginas já mostram as mudanças na próxima carga.",
        });
        if (json.values) setValues(json.values);
      } else {
        toast({ title: "Erro ao salvar", description: json.message ?? "Tente novamente." });
      }
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Restaurar todos os textos e ajustes para o padrão?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const json = (await res.json()) as { ok: boolean; values?: Values; message?: string };
      if (res.ok && json.ok && json.values) {
        setValues(json.values);
        setFreeUntilLocal(isoToLocalInput(json.values.launch_free_until ?? ""));
        toast({ title: "Padrões restaurados", description: json.message });
      } else {
        toast({ title: "Erro ao restaurar", description: "Tente novamente." });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!values) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[#6f5b47]">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <p className="text-sm font-extrabold">Carregando configurações…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-xs font-semibold text-[#6f5b47]">
          Controle das páginas, elementos e funcionalidades. Alterações valem para toda a
          aplicação na próxima carga (landing, cronômetro, bloqueio e rotas de IA).
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void reset()} disabled={saving} className={btnGhost}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restaurar padrões
          </button>
          <button type="button" onClick={() => void save()} disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Group title="Lançamento & acesso">
          <Toggle
            label="Acesso gratuito de lançamento ativo"
            hint="Enquanto ligado e dentro da data, a plataforma abre sem pagar."
            checked={isOn("launch_free_enabled")}
            onChange={(next) => toggle("launch_free_enabled", next)}
          />
          <Field label="Encerramento do acesso grátis" hint="Data/hora em que a janela gratuita fecha.">
            <input
              type="datetime-local"
              value={freeUntilLocal}
              onChange={(event) => setFreeUntilLocal(event.target.value)}
              className={inputCls}
            />
          </Field>
          <Toggle
            label="Cronômetro regressivo na página"
            hint="Mostra a contagem “o acesso grátis termina em…”."
            checked={isOn("launch_countdown_enabled")}
            onChange={(next) => toggle("launch_countdown_enabled", next)}
          />
          <Toggle
            label="Decoração natalina na faixa de lançamento"
            hint="Pisca-pisca, neve caindo e Papai Noel acenando no cartão “100% grátis” da landing."
            checked={isOn("launch_christmas_enabled")}
            onChange={(next) => toggle("launch_christmas_enabled", next)}
          />
          <Field label="Texto do selo de lançamento">
            <input
              value={values.launch_badge ?? ""}
              onChange={(event) => set("launch_badge", event.target.value)}
              className={inputCls}
            />
          </Field>
          <Toggle
            label="Exigir pagamento fora da janela grátis (paywall)"
            hint="Desligue para manter a plataforma aberta mesmo depois do prazo."
            checked={isOn("paywall_enabled")}
            onChange={(next) => toggle("paywall_enabled", next)}
          />
        </Group>

        <Group title="Textos da página inicial">
          <Field label="Título principal (hero)">
            <input value={values.hero_title ?? ""} onChange={(event) => set("hero_title", event.target.value)} className={inputCls} />
          </Field>
          <Field label="Subtítulo do hero">
            <textarea
              value={values.hero_subtitle ?? ""}
              onChange={(event) => set("hero_subtitle", event.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Benefícios do hero" hint="Separe cada item com barra vertical |">
            <textarea
              value={values.hero_bullets ?? ""}
              onChange={(event) => set("hero_bullets", event.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Group>

        <Group title="Seções visíveis da landing">
          <Toggle label="“O que é” (ferramentas)" checked={isOn("section_features")} onChange={(next) => toggle("section_features", next)} />
          <Toggle label="“Como usar” (passos)" checked={isOn("section_steps")} onChange={(next) => toggle("section_steps", next)} />
          <Toggle label="“Avisos” (funil de captação)" checked={isOn("section_leads")} onChange={(next) => toggle("section_leads", next)} />
          <Toggle label="“Planos”" checked={isOn("section_plans")} onChange={(next) => toggle("section_plans", next)} />
          <Toggle label="“Dúvidas” (FAQ)" checked={isOn("section_faq")} onChange={(next) => toggle("section_faq", next)} />
        </Group>

        <Group title="Seção de avisos (funil)">
          <Field label="Título da seção">
            <input value={values.leads_title ?? ""} onChange={(event) => set("leads_title", event.target.value)} className={inputCls} />
          </Field>
          <Field label="Descrição da seção">
            <textarea
              value={values.leads_subtitle ?? ""}
              onChange={(event) => set("leads_subtitle", event.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Group>

        <Group title="Planos (exibição)">
          <Field label="Preço · Passe 30 dias">
            <input value={values.plans_pass30_price ?? ""} onChange={(event) => set("plans_pass30_price", event.target.value)} className={inputCls} />
          </Field>
          <Field label="Preço · Vitalício">
            <input value={values.plans_lifetime_price ?? ""} onChange={(event) => set("plans_lifetime_price", event.target.value)} className={inputCls} />
          </Field>
          <Field label="Preço âncora do vitalício (riscado)">
            <input value={values.plans_lifetime_anchor ?? ""} onChange={(event) => set("plans_lifetime_anchor", event.target.value)} className={inputCls} />
          </Field>
        </Group>

        <Group title="Recuperação de venda (anti-abandono)">
          <Toggle
            label="Banner de recuperação para quem clicou e não pagou"
            hint="Mostra o que a pessoa ganha vs. o que arrisca, com o botão de finalizar o Pix."
            checked={isOn("recovery_banner_enabled")}
            onChange={(next) => toggle("recovery_banner_enabled", next)}
          />
          <p className="text-[11px] font-semibold text-[#a08a77]">
            Abandonos do checkout da Cakto chegam na aba “Recuperação”, com WhatsApp/e-mail em 1 clique.
          </p>
        </Group>

        <Group title="Compartilhamento (divulgação)">
          <Toggle
            label="Seção “Compartilhar” na landing"
            hint="Cartão de convite completo: banner, descrição, link, WhatsApp/Telegram/copiar."
            checked={isOn("section_share")}
            onChange={(next) => toggle("section_share", next)}
          />
          <Field label="Título da seção de compartilhamento">
            <input value={values.share_title ?? ""} onChange={(event) => set("share_title", event.target.value)} className={inputCls} />
          </Field>
          <Field label="Descrição (mensagem de incentivo)">
            <textarea
              value={values.share_subtitle ?? ""}
              onChange={(event) => set("share_subtitle", event.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Group>

        <Group title="Suporte (interno)">
          <Field
            label="E-mail de suporte"
            hint="Nunca aparece na página: só na caixa de entrada do painel e quando o usuário pede o canal."
          >
            <input value={values.support_email ?? ""} onChange={(event) => set("support_email", event.target.value)} className={inputCls} />
          </Field>
          <Field label="WhatsApp de suporte (opcional)" hint="Somente dígitos com DDI/DDD, ex.: 5511999998888. Vazio = botão oculto.">
            <input value={values.support_whatsapp ?? ""} onChange={(event) => set("support_whatsapp", event.target.value)} className={inputCls} />
          </Field>
        </Group>

        <Group title="Rodapé">
          <Field label="Nota legal do rodapé">
            <textarea
              value={values.footer_note ?? ""}
              onChange={(event) => set("footer_note", event.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Group>
      </div>
    </div>
  );
}
