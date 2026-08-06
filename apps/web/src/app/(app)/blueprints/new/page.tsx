"use client";

import type {
  BlueprintFormInput,
  BlueprintProviderName,
  CreateBlueprintRequest,
} from "@qa-ai/shared";
import { AlertTriangle, FileText, FolderKanban, Loader2, Network, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  CanvasEditor,
  type CanvasValue,
} from "@/components/blueprint/canvas-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useCreateBlueprint, useProjects } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Mode = "project" | "form" | "canvas" | "prompt";

const MODES: {
  id: Mode;
  label: string;
  icon: typeof FileText;
  hint: string;
}[] = [
  { id: "project", label: "Projeto atual", icon: FolderKanban, hint: "Dados, análises e GitHub" },
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
  const searchParams = useSearchParams();
  const prefillPrompt = searchParams.get("prompt");
  const prefillTitle = searchParams.get("title");
  const prefillProjectId = searchParams.get("projectId");
  const [mode, setMode] = useState<Mode>(prefillPrompt ? "prompt" : "project");
  const [title, setTitle] = useState(prefillTitle ?? "");
  const [projectId, setProjectId] = useState(prefillProjectId ?? "");
  const [businessContext, setBusinessContext] = useState("");
  const [provider, setProvider] = useState<BlueprintProviderName | "auto">(
    "auto",
  );
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const create = useCreateBlueprint();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  // O Blueprint precisa de IA de verdade pra produzir um plano específico
  // deste projeto — sem chave conectada, o back recusa a criação (ver
  // AiKeyRequiredError). Checa aqui pra já orientar o usuário antes de tentar.
  useEffect(() => {
    api
      .getAiSettings()
      .then((s) => setAiConfigured(s.configured))
      .catch(() => setAiConfigured(null));
  }, []);

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
  const [prompt, setPrompt] = useState(prefillPrompt ?? "");

  function buildRequest(): CreateBlueprintRequest | string {
    if (mode === "project" && !projectId) return "Escolha o projeto que será projetado.";
    if (!title.trim() && mode !== "project") return "Dê um título ao blueprint.";
    const base = {
      title: title.trim() || `Projeção — ${projects.find((p) => p.id === projectId)?.name ?? "projeto"}`,
      provider: provider === "auto" ? undefined : provider,
    };
    if (mode === "project") {
      return {
        ...base,
        projectId,
        input: {
          mode: "project",
          ...(businessContext.trim() ? { businessContext: businessContext.trim() } : {}),
        },
      };
    }
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
        setError(
          err instanceof Error ? err.message : "Falha ao gerar blueprint",
        ),
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Projetar", href: "/blueprints" },
          { label: "Novo blueprint" },
        ]}
        title="Novo blueprint"
        description="Comece pelo projeto atual. A projeção usa dados cadastrados, análises recentes e a estrutura do GitHub quando ele estiver conectado."
      />

      {aiConfigured === false && (
        <Card className="border-amber-500/30 bg-amber-500/[0.06]">
          <CardContent className="flex items-start gap-3 pt-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Conecte uma IA antes de gerar</p>
              <p className="text-muted-foreground">
                O Blueprint usa IA para desenhar um plano específico para o seu
                projeto — sem uma chave conectada, não é possível gerar um
                plano confiável.{" "}
                <Link href="/settings" className="text-primary hover:underline">
                  Conectar em Configurações
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-5 pt-5">
          {/* seletor de modo */}
          <div
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            role="radiogroup"
            aria-label="Formato de entrada"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors sm:flex-col sm:text-center",
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

          {mode === "project" && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
              <div className="space-y-1">
                <label htmlFor="blueprint-project" className="text-xs text-muted-foreground">Projeto atual</label>
                <select
                  id="blueprint-project"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    const selected = projects.find((p) => p.id === e.target.value);
                    if (!title.trim() && selected) setTitle(`Projeção — ${selected.name}`);
                  }}
                  disabled={projectsLoading}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">{projectsLoading ? "Carregando projetos…" : "Selecione um projeto"}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name} — {project.url}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-muted-foreground">
                O MuriOps reúne a descrição cadastrada, a última análise concluída e, se houver conexão GitHub, apenas os manifestos de dependências e a estrutura do repositório. Nenhum token ou código-fonte é enviado como contexto.
              </p>
              <div className="space-y-1">
                <label htmlFor="blueprint-business-context" className="text-xs text-muted-foreground">Nicho, público ou objetivo de negócio <span className="text-muted-foreground">(opcional)</span></label>
                <textarea
                  id="blueprint-business-context"
                  value={businessContext}
                  onChange={(e) => setBusinessContext(e.target.value)}
                  placeholder="Ex.: plataforma B2B para agendamento de serviços; prioridade é reduzir abandono no cadastro e cumprir LGPD."
                  className="min-h-[88px] w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {mode !== "project" && (
            <div className="space-y-1">
              <label htmlFor="blueprint-title" className="text-xs text-muted-foreground">Título do projeto</label>
              <Input id="blueprint-title" placeholder="Ex.: Marketplace B2B de peças" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}

          {mode === "form" && <FormMode value={form} onChange={setForm} />}

          {mode === "canvas" && (
            <div className="space-y-3">
              <CanvasEditor value={canvas} onChange={setCanvas} />
              <textarea
                id="blueprint-canvas-notes"
                aria-label="Notas adicionais sobre o canvas"
                placeholder="Notas adicionais sobre o projeto (opcional)…"
                value={canvasNotes}
                onChange={(e) => setCanvasNotes(e.target.value)}
                className="min-h-[70px] w-full rounded-md border border-border bg-transparent p-3 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          {mode === "prompt" && (
            <textarea
              id="blueprint-prompt"
              aria-label="Descrição livre do projeto"
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
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label="Modelo de IA"
              >
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={provider === p.id}
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
            <Button
              type="button"
              onClick={generate}
              disabled={create.isPending || aiConfigured === false}
              size="lg"
              className="w-full sm:w-auto"
            >
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
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
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
        <label
          htmlFor="blueprint-objective"
          className="text-xs text-muted-foreground"
        >
          Objetivo
        </label>
        <textarea
          id="blueprint-objective"
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
          options={[
            "web app",
            "mobile",
            "API",
            "marketplace",
            "SaaS",
            "interno",
          ]}
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
        <label
          htmlFor="blueprint-constraints"
          className="text-xs text-muted-foreground"
        >
          Restrições
        </label>
        <Input
          id="blueprint-constraints"
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
  const id = useId();

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
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
  const id = useId();

  function commit() {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
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
          id={id}
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
