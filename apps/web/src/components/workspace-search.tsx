"use client";

import {
  Activity,
  ArrowUpCircle,
  FileSearch,
  FolderKanban,
  Github,
  LayoutDashboard,
  Search,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEARCH_ITEMS = [
  { title: "Visão geral", description: "Painel e indicadores do workspace", href: "/dashboard", icon: LayoutDashboard, terms: "inicio início dashboard visão geral métricas" },
  { title: "Projetos", description: "Cadastre e gerencie projetos", href: "/projects", icon: FolderKanban, terms: "projeto sites cadastrar" },
  { title: "Análises", description: "Análise QA padrão e Análise de Segurança", href: "/analyses", icon: FileSearch, terms: "analisar análise qa segurança crawler relatório" },
  { title: "Aplicações", description: "Planos de remediação e conexões", href: "/aplicacao", icon: Wrench, terms: "aplicar aplicação plano remediação checklist" },
  { title: "Monitoramento", description: "Fluxos críticos e monitoramento sintético", href: "/monitoramento", icon: Activity, terms: "monitoramento fluxos críticos criticos flow synthetic" },
  { title: "Conexões GitHub e MCP", description: "Configure repositórios, token e servidor MCP", href: "/aplicacao?view=connections", icon: Github, terms: "github mcp token repositório repositorio integração conexão api" },
  { title: "Atualizações", description: "Investigue dependências do projeto", href: "/atualizar", icon: ArrowUpCircle, terms: "atualizar dependência dependencias package manifest github" },
  { title: "Configurações", description: "Perfil, organização e chave de IA", href: "/settings", icon: Settings, terms: "configuração configurações ia chave organização conta" },
] as const;

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function WorkspaceSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const results = useMemo(() => {
    const words = normalized(query).split(/\s+/).filter(Boolean);
    if (!words.length) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter((item) => {
      const haystack = normalized(`${item.title} ${item.description} ${item.terms}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [query]);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={compact ? "h-7 w-7" : "h-9 w-9"}
        onClick={() => setOpen(true)}
        aria-label="Pesquisar no workspace"
        title="Pesquisar no workspace (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-start bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pesquisar no workspace">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Fechar pesquisa"
          />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                  if (event.key === "Enter" && results[0]) goTo(results[0].href);
                }}
                placeholder="Pesquisar análises, GitHub, cronograma, conexões…"
                className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.length ? results.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => goTo(item.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-md border bg-background text-primary"><item.icon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-sm font-medium">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.description}</span></span>
                </button>
              )) : (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma funcionalidade encontrada para “{query}”.</p>
              )}
            </div>
            <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">Use Ctrl+K para abrir rapidamente. Enter abre o primeiro resultado.</p>
          </div>
        </div>
      )}
    </>
  );
}
