"use client";

import type {
  BlueprintFormInput,
  BlueprintProviderName,
  CreateBlueprintRequest,
} from "@qa-ai/shared";
import {
  DraftingCompass,
  FileText,
  Loader2,
  Network,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CanvasEditor,
  type CanvasValue,
} from "@/components/blueprint/canvas-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCreateBlueprint } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Mode = "form" | "canvas" | "prompt";

const MODES: { id: Mode; label: string; icon: typeof FileText; hint: string }[] =
  [
    { id: "form", label: "Formulário", icon: FileText, hint: "Campos + tags" },
    { id: "canvas", label: "Canvas", icon: Network, hint: "Grafo visual" },
    { id: "prompt", label: "Prompt", icon: Sparkles, hint: "Texto livre" },
  ];

const PROVIDERS: { id: BlueprintProviderName | "auto"; label: string }[] = [
  { id: "auto", label: "Padrão da conta" },
  { id: "claude", label: "Claude" },
  { id: "openai", label: "GPT" },
  { id: "gemini", label: "Gemini" },
];

export default function NewBlueprintPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("form");
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<BlueprintProviderName | "auto">(
    "auto",
  );
  const [error, setError] = useState<string | null>(null);
  const create = useCreateBlueprint();

  // form
  const [form, setForm] = useState<BlueprintFormInput>({
    objective: "",
    appType: "web app",
    features: [],
    audience: "B2C",
    scale: "MVP",
    integrations: [],
    constraints: "",
    compliance: [],
  });
  // canvas
  const [canvas, setCanvas] = useState<CanvasValue>({ nodes: [], edges: [] });
  const [canvasNotes, setCanvasNotes] = useState("");
  // prompt
  const [prompt, setPrompt] = useState("");

  function buildRequest(): CreateBlueprintRequest | string {
    if (!title.trim()) return "Dê um título ao blueprint.";
    const base = {
      title: title.trim(),
      provider: provider === "auto" ? undefined : provider,
    };
    if (mode === "form") {
      if (form.objective.trim().length < 3) return "Descreva o objetivo.";
      return { ...base, input: { mode: "form", form } };
    }
    if (mode === "canvas") {
      if (canvas.nodes.length === 0)
        return "Adicione ao menos um componente ao canvas.";
      return {
        ...base,
        input: { mode: "canvas", canvas: { ...canvas, notes: canvasNotes } },
      };
    }
    if (prompt.trim().length < 10)
      return "Descreva o projeto com mais detalhe.";
    return { ...base, input: { mode: "prompt", prompt: prompt.trim() } };
  }

  function generate() {
    const req = buildRequest();
    if (typeof req === "string") {
      setError(req);
      return;
    }
    setError(null);
    // Criação é assíncrona: a resposta volta na hora (status PENDING) e a
    // própria página de detalhe acompanha o progresso por polling.
    create.mutate(req, {
      onSuccess: (bp) => router.push(`/blueprints/${bp.id}`),
      onError: (err) =>
        setError(err instanceof Error ? err.message : "Falha ao gerar blueprint"),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <DraftingCompass className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Projetar com QA</h1>
          <p className="text-sm text-muted-foreground">
            Descreva o projeto e a IA monta o plano de desenvolvimento com
            qualidade embutida.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Título do projeto
            </label>
            <Input
              placeholder="Ex.: Marketplace B2B de peças"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* seletor de modo */}
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
                  mode === m.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent",
                )}
              >
                <m.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {m.hint}
                </span>
              </button>
            ))}
          </div>

          {mode === "form" && <FormMode value={form} onChange={setForm} />}

          {mode === "canvas" && (
            <div className="space-y-3">
              <CanvasEditor value={canvas} onChange={setCanvas} />
              <textarea
                placeholder="Notas adicionais sobre o projeto (opcional)…"
                value={canvasNotes}
                onChange={(e) => setCanvasNotes(e.target.value)}
                className="min-h-[70px] w-full rounded-md border border-border bg-transparent p-3 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          {mode === "prompt" && (
            <textarea
              placeholder="Ex.: Quero um marketplace B2B com autenticação, pagamentos via Stripe, chat em tempo real e painel administrativo. Público empresarial, escala média…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[180px] w-full rounded-md border border-border bg-transparent p-3 text-sm outline-none focus:border-primary"
            />
          )}

          {/* provider + ação */}
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Modelo de IA
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors",
                      provider === p.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={generate} disabled={create.isPending} size="lg">
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Criando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Gerar blueprint
                </>
              )}
            </Button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Modo formulário ----------

function FormMode({
  value,
  onChange,
}: {
  value: BlueprintFormInput;
  onChange: (v: BlueprintFormInput) => void;
}) {
  const set = <K extends keyof BlueprintFormInput>(
    k: K,
    v: BlueprintFormInput[K],
  ) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Objetivo</label>
        <textarea
          placeholder="O que o produto precisa resolver?"
          value={value.objective}
          onChange={(e) => set("objective", e.target.value)}
          className="min-h-[70px] w-full rounded-md border border-border bg-transparent p-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Tipo"
          value={value.appType}
          options={["web app", "mobile", "API", "marketplace", "SaaS", "interno"]}
          onChange={(v) => set("appType", v)}
        />
        <SelectField
          label="Público"
          value={value.audience}
          options={["B2C", "B2B", "B2B2C", "interno"]}
          onChange={(v) => set("audience", v)}
        />
        <SelectField
          label="Escala"
          value={value.scale}
          options={["MVP", "média", "alta", "enterprise"]}
          onChange={(v) => set("scale", v)}
        />
      </div>

      <TagField
        label="Funcionalidades"
        placeholder="auth, pagamentos, chat…"
        tags={value.features}
        onChange={(t) => set("features", t)}
      />
      <TagField
        label="Integrações"
        placeholder="Stripe, SendGrid, S3…"
        tags={value.integrations}
        onChange={(t) => set("integrations", t)}
      />
      <TagField
        label="Conformidade / normas"
        placeholder="LGPD, WCAG AA, PCI-DSS…"
        tags={value.compliance}
        onChange={(t) => set("compliance", t)}
      />

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Restrições</label>
        <Input
          placeholder="Ex.: precisa rodar on-premise, orçamento enxuto…"
          value={value.constraints}
          onChange={(e) => set("constraints", e.target.value)}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-background">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function TagField({
  label,
  placeholder,
  tags,
  onChange,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (t: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border p-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-foreground"
          >
            {t}
            <button
              type="button"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              aria-label={`Remover ${t}`}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}
