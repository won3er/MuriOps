"use client";

import { ALL_CATEGORIES, Severity, type AnalysisDetail, type Issue } from "@qa-ai/shared";
import { motion } from "framer-motion";
import { Download, FileSearch, Loader2, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisStatusBadge } from "@/components/status-badge";
import { IssueCard } from "@/components/issue-card";
import { ScoreBars } from "@/components/score-bars";
import { ScoreRing } from "@/components/score-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useCreateRemediationPlan } from "@/lib/queries";
import { securityGroupOf } from "@/lib/security-groups";
import { cn } from "@/lib/utils";

const IN_PROGRESS = ["QUEUED", "CRAWLING", "ANALYZING", "AI_REVIEW"];
const CATEGORY_LABEL: Record<string, string> = {
  UI: "UI",
  UX: "UX",
  PERFORMANCE: "Performance",
  SEO: "SEO",
  ACCESSIBILITY: "Acessibilidade",
  SECURITY: "Segurança",
  CONSOLE: "Console",
  NETWORK: "Network",
  DEEP_SECURITY: "Segurança Avançada",
};

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const createRemediation = useCreateRemediationPlan();
  const [data, setData] = useState<AnalysisDetail | null>(null);
  const [category, setCategory] = useState<string>("");
  const [securityGroup, setSecurityGroup] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showIgnored, setShowIgnored] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async () => {
    const filters = {
      ...(category ? { category } : {}),
      ...(severity ? { severity } : {}),
      ...(search ? { search } : {}),
      ...(showIgnored ? { status: "ALL" } : {}),
    };
    const detail = await api.getAnalysis(id, filters).catch(() => null);
    if (detail) setData(detail);
    return detail;
  }, [id, category, severity, search, showIgnored]);

  // Análise que rodou só a auditoria de segurança: nesse caso os pills
  // principais viram os próprios tipos de check (TLS, DNS, segredos...),
  // no mesmo nível que UI/UX/SEO aparecem numa análise normal.
  const isSecurityOnly =
    data?.categories.length === 1 && data.categories[0] === "DEEP_SECURITY";

  const availableCategories = useMemo(
    () => ALL_CATEGORIES.filter((c) => data?.categories.includes(c)),
    [data?.categories],
  );

  const securityGroupOptions = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.issues.map((i) => securityGroupOf(i.title)))];
  }, [data]);

  const visibleIssues = useMemo(() => {
    if (!data) return [];
    if (!securityGroup) return data.issues;
    return data.issues.filter(
      (i: Issue) => securityGroupOf(i.title) === securityGroup,
    );
  }, [data, securityGroup]);

  async function downloadPdf() {
    if (!data) return;
    setDownloading(true);
    try {
      await api.downloadReportPdf(data.id, data.version);
    } finally {
      setDownloading(false);
    }
  }

  function generateApplication() {
    if (!data) return;
    createRemediation.mutate(
      { sourceType: "analysis", sourceId: data.id },
      { onSuccess: (plan) => router.push(`/aplicacao/${plan.id}`) },
    );
  }

  // Refetch on filter change.
  useEffect(() => {
    load();
  }, [load]);

  // Poll while in progress.
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const detail = await load();
      if (detail && !IN_PROGRESS.includes(detail.status)) {
        clearInterval(pollRef.current);
      }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  if (!data) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const inProgress = IN_PROGRESS.includes(data.status);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {isSecurityOnly ? "Análise de Segurança" : "Análise QA padrão"} v
              {data.version}
            </h1>
            <AnalysisStatusBadge status={data.status} />
          </div>
          <p className="tabular text-sm text-muted-foreground">
            {data.pagesDiscovered} página(s) · {data.issueCount} problema(s)
          </p>
        </div>
        <div className="flex items-center gap-4">
          {data.status === "COMPLETED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateApplication}
              disabled={createRemediation.isPending}
              title="Transforma os problemas encontrados num checklist de mudanças aplicáveis"
            >
              {createRemediation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              Gerar Aplicação
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadPdf}
            disabled={downloading || inProgress}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Baixar PDF
          </Button>
          <Link
            href={`/projects/${data.projectId}`}
            className="text-sm text-primary hover:underline"
          >
            Ver projeto
          </Link>
        </div>
      </div>

      {inProgress && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Análise em andamento… esta página atualiza automaticamente.
          </CardContent>
        </Card>
      )}

      {data.status === "FAILED" && (
        <Card>
          <CardContent className="py-6 text-red-400">
            A análise falhou: {data.error}
          </CardContent>
        </Card>
      )}

      {data.score && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="flex items-center justify-center py-8">
              <ScoreRing score={data.score.overall} />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="py-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                Notas por dimensão
              </h2>
              <ScoreBars scores={data.score.categories} />
            </CardContent>
          </Card>
        </div>
      )}

      {data.aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="py-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> Resumo da IA
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {data.aiSummary}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {isSecurityOnly ? (
          <FilterPills
            value={securityGroup}
            onChange={setSecurityGroup}
            options={securityGroupOptions.map((g) => ({ value: g, label: g }))}
          />
        ) : (
          <FilterPills
            value={category}
            onChange={setCategory}
            options={availableCategories.map((c) => ({
              value: c,
              label: CATEGORY_LABEL[c] ?? c,
            }))}
          />
        )}
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-9 rounded-md border border-input bg-background/60 px-2 text-sm"
          >
            <option value="">Toda severidade</option>
            {Object.values(Severity).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="relative flex-1 sm:flex-none">
            <FileSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-8 sm:w-48"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showIgnored}
              onChange={(e) => setShowIgnored(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Mostrar descartados pela IA
          </label>
        </div>
      </div>

      {/* Lista de problemas */}
      <div className="space-y-3">
        {visibleIssues.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {inProgress
                ? "Coletando problemas…"
                : "Nenhum problema encontrado com os filtros atuais. 🎉"}
            </CardContent>
          </Card>
        ) : (
          visibleIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </div>
    </div>
  );
}

function FilterPills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Pill active={value === ""} onClick={() => onChange("")}>
        Tudo
      </Pill>
      {options.map((o) => (
        <Pill
          key={o.value}
          active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
