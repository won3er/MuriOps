"use client";

import { Check, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    api
      .getAiSettings()
      .then((s) => {
        setConfigured(s.configured);
        setMaskedKey(s.maskedKey);
        if (s.provider) setProvider(s.provider);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (apiKey.trim().length < 10) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.saveAiSettings(provider, apiKey.trim());
      setConfigured(true);
      setMaskedKey(`••••${apiKey.trim().slice(-4)}`);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Remover sua chave de IA? As análises voltarão a usar a chave padrão do sistema.")) return;
    setRemoving(true);
    try {
      await api.deleteAiSettings();
      setConfigured(false);
      setMaskedKey(null);
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use sua própria chave de IA para gerar os resumos e sugestões das
          análises. Sem chave configurada, o sistema usa a chave padrão do
          servidor — a coleta e o score funcionam normalmente de qualquer forma.
        </p>
      </div>

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
            <div className="flex items-center justify-between rounded-md border bg-background/40 px-3 py-2 text-sm">
              <span>
                Provider atual:{" "}
                <strong>
                  {PROVIDERS.find((p) => p.value === provider)?.label}
                </strong>{" "}
                — chave <code className="text-muted-foreground">{maskedKey}</code>
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
            <label className="text-sm font-medium">Provider</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
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
            <label className="text-sm font-medium">
              Nova chave de API{" "}
              <span className="text-muted-foreground">
                ({PROVIDERS.find((p) => p.value === provider)?.hint})
              </span>
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Cole sua chave aqui"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <Button onClick={save} disabled={saving || apiKey.trim().length < 10}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A chave é criptografada e nunca é exibida novamente por completo.
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
