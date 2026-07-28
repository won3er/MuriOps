"use client";

import { Check, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ActionError } from "@/components/action-error";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type Provider = "claude" | "openai" | "gemini";

const PROVIDERS: { value: Provider; label: string; hint: string }[] = [
  { value: "claude", label: "Claude (Anthropic)", hint: "sk-ant-..." },
  { value: "openai", label: "OpenAI", hint: "sk-..." },
  { value: "gemini", label: "Gemini (Google)", hint: "AIzaSy..." },
];

export default function SettingsPage() {
  const [configured, setConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("claude");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  async function loadSettings() {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = await api.getAiSettings();
      setConfigured(settings.configured);
      setMaskedKey(settings.maskedKey);
      if (settings.provider) setProvider(settings.provider);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function save() {
    if (apiKey.trim().length < 10) return;
    setSaving(true);
    setSaved(false);
    setActionError(null);
    try {
      await api.saveAiSettings(provider, apiKey.trim());
      setConfigured(true);
      setMaskedKey(`••••${apiKey.trim().slice(-4)}`);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      setActionError(error);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        "Remover sua chave de IA? Sem uma chave própria, os resumos e sugestões de IA param de funcionar (a coleta e o score continuam normais).",
      )
    )
      return;
    setRemoving(true);
    setActionError(null);
    try {
      await api.deleteAiSettings();
      setConfigured(false);
      setMaskedKey(null);
    } catch (error) {
      setActionError(error);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <PageHeader
        eyebrow="Plataforma"
        title="Configurações"
        description="Gerencie o provedor usado pela organização para interpretações e planos gerados por IA."
      />

      {loading ? (
        <div
          className="flex items-center gap-2 rounded-lg border bg-card px-5 py-8 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Consultando configurações…
        </div>
      ) : loadError ? (
        <div className="space-y-3">
          <ActionError
            error={loadError}
            message="Não foi possível carregar as configurações de IA."
          />
          <Button type="button" variant="outline" onClick={loadSettings}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card>
            <CardContent className="space-y-6 py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Chave de IA</h2>
                {configured && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Configurada
                  </span>
                )}
              </div>

              {configured && maskedKey && (
                <div className="flex items-start justify-between gap-3 rounded-md border bg-background/40 px-3 py-2 text-sm">
                  <span className="min-w-0 break-words">
                    Provider atual:{" "}
                    <strong>
                      {PROVIDERS.find((p) => p.value === provider)?.label}
                    </strong>{" "}
                    — chave{" "}
                    <code className="break-all text-muted-foreground">
                      {maskedKey}
                    </code>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={remove}
                    disabled={removing}
                    aria-label="Remover chave"
                  >
                    {removing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Provedor de IA</label>
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  role="radiogroup"
                  aria-label="Provedor de IA"
                >
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={provider === p.value}
                      onClick={() => setProvider(p.value)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        provider === p.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-input text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="ai-api-key" className="text-sm font-medium">
                  Nova chave de API{" "}
                  <span className="text-muted-foreground">
                    ({PROVIDERS.find((p) => p.value === provider)?.hint})
                  </span>
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="ai-api-key"
                    type="password"
                    placeholder="Cole sua chave aqui"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    onClick={save}
                    disabled={saving || apiKey.trim().length < 10}
                    className="sm:min-w-24"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                      <>
                        <Check className="h-4 w-4" /> Salvo
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A chave é criptografada e nunca é exibida novamente por
                  completo.
                </p>
                {provider === "gemini" && (
                  <p className="text-xs text-muted-foreground">
                    Gere a chave em Google AI Studio (aistudio.google.com → "Get
                    API key"). O formato correto começa com{" "}
                    <code className="text-foreground">AIzaSy</code> — chaves em
                    outro formato (ex: começando com "AQ.") não funcionam com
                    essa integração e retornam erro de autenticação.
                  </p>
                )}
                <ActionError
                  error={actionError}
                  message="Não foi possível atualizar a chave de IA. Confira os dados e tente novamente."
                />
              </div>
            </CardContent>
          </Card>
          <aside className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">
                Como a chave é usada
              </h2>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                <li>Criptografada antes de ser armazenada.</li>
                <li>Descriptografada apenas durante a operação solicitada.</li>
                <li>Nunca usada como fallback para outra organização.</li>
                <li>Revogue também no provedor ao encerrar o acesso.</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-semibold">Sem chave configurada</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Coleta e score continuam funcionando. Resumos e planos usam
                respostas determinísticas, sem chamada externa de IA.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
