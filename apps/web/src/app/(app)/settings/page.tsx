"use client";

import {
  AlertTriangle,
  Check,
  Download,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ActionError } from "@/components/action-error";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { GoogleReauthButton } from "@/components/google-reauth-button";

type Provider = "claude" | "openai" | "gemini";

const PROVIDERS: { value: Provider; label: string; hint: string }[] = [
  { value: "claude", label: "Claude (Anthropic)", hint: "sk-ant-..." },
  { value: "openai", label: "OpenAI", hint: "sk-..." },
  { value: "gemini", label: "Gemini (Google)", hint: "AIzaSy..." },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [googleCredential, setGoogleCredential] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  // ---- E-mail (Resend) — usado pelos alertas de Fluxos Críticos ----
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailMaskedKey, setEmailMaskedKey] = useState<string | null>(null);
  const [emailFromAddress, setEmailFromAddress] = useState<string | null>(null);
  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailFromInput, setEmailFromInput] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailRemoving, setEmailRemoving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailActionError, setEmailActionError] = useState<unknown>(null);

  async function loadSettings() {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = await api.getAiSettings();
      setConfigured(settings.configured);
      setMaskedKey(settings.maskedKey);
      if (settings.provider) setProvider(settings.provider);
      const email = await api.getEmailSettings();
      setEmailConfigured(email.configured);
      setEmailMaskedKey(email.maskedKey);
      setEmailFromAddress(email.fromAddress);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveEmail() {
    if (emailApiKey.trim().length < 10 || !emailFromInput.trim()) return;
    setEmailSaving(true);
    setEmailSaved(false);
    setEmailActionError(null);
    try {
      await api.saveEmailSettings(emailApiKey.trim(), emailFromInput.trim());
      setEmailConfigured(true);
      setEmailMaskedKey(`••••${emailApiKey.trim().slice(-4)}`);
      setEmailFromAddress(emailFromInput.trim());
      setEmailApiKey("");
      setEmailFromInput("");
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
    } catch (error) {
      setEmailActionError(error);
    } finally {
      setEmailSaving(false);
    }
  }

  async function removeEmail() {
    if (
      !confirm(
        "Remover a chave de e-mail? Os Fluxos Críticos continuam rodando e gravando execuções, só param de enviar alerta por e-mail.",
      )
    )
      return;
    setEmailRemoving(true);
    setEmailActionError(null);
    try {
      await api.deleteEmailSettings();
      setEmailConfigured(false);
      setEmailMaskedKey(null);
      setEmailFromAddress(null);
    } catch (error) {
      setEmailActionError(error);
    } finally {
      setEmailRemoving(false);
    }
  }

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

  async function downloadData() {
    setExporting(true);
    setExportError(null);
    try {
      await api.downloadAccountData();
    } catch (error) {
      setExportError(error);
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (!user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount({
        confirmationEmail: confirmationEmail.trim(),
        confirmationPhrase: confirmationPhrase.trim(),
        ...(user.hasPassword && currentPassword
          ? { password: currentPassword }
          : {}),
        ...(!user.hasPassword && googleCredential
          ? { googleCredential }
          : {}),
      });
      logout();
    } catch (error) {
      setDeleteError(error);
    } finally {
      setDeleting(false);
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

      <Card>
        <CardContent className="space-y-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">E-mail (Resend)</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Opcional — usado só pra enviar os{" "}
                <strong>alertas de Fluxos Críticos</strong> quando um passo
                monitorado quebra. Sem chave, os fluxos continuam rodando e
                gravando as execuções normalmente, só não chegam por e-mail.
              </p>
            </div>
            {emailConfigured && (
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-500">
                <Mail className="h-3.5 w-3.5" />
                Configurado
              </span>
            )}
          </div>

          {emailConfigured && emailMaskedKey && (
            <div className="flex items-start justify-between gap-3 rounded-md border bg-background/40 px-3 py-2 text-sm">
              <span className="min-w-0 break-words">
                Remetente: <strong>{emailFromAddress}</strong> — chave{" "}
                <code className="break-all text-muted-foreground">
                  {emailMaskedKey}
                </code>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={removeEmail}
                disabled={emailRemoving}
                aria-label="Remover chave de e-mail"
              >
                {emailRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              type="password"
              placeholder="Chave de API do Resend (re_...)"
              value={emailApiKey}
              onChange={(e) => setEmailApiKey(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="email"
              placeholder="Remetente (ex.: alertas@seudominio.com)"
              value={emailFromInput}
              onChange={(e) => setEmailFromInput(e.target.value)}
            />
            <Button
              type="button"
              onClick={saveEmail}
              disabled={
                emailSaving ||
                emailApiKey.trim().length < 10 ||
                !emailFromInput.trim()
              }
              className="sm:min-w-24"
            >
              {emailSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : emailSaved ? (
                <>
                  <Check className="h-4 w-4" /> Salvo
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Crie a conta e a chave em{" "}
            <a
              href="https://resend.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              resend.com
            </a>{" "}
            — o remetente precisa ser um endereço de um domínio verificado lá.
          </p>
          <ActionError
            error={emailActionError}
            message="Não foi possível salvar as configurações de e-mail."
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-medium">Privacidade e dados</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Baixe uma cópia estruturada dos dados do workspace. Senhas,
                credenciais, chaves de IA, tokens e segredos nunca entram no
                arquivo.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={downloadData}
              disabled={exporting}
              className="shrink-0"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Baixar meus dados
            </Button>
          </div>
          <ActionError
            error={exportError}
            message="Não foi possível preparar a cópia dos seus dados."
          />

          <div className="border-t pt-6">
            {!showDelete ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-destructive">
                    Excluir conta
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    A exclusão é permanente. Se você for a única pessoa do
                    workspace, projetos, análises, evidências, planos e
                    configurações também serão removidos.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Iniciar exclusão
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:p-5">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <h3 className="font-semibold">
                      Confirme a exclusão permanente
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Antes de continuar, recomendamos baixar seus dados e
                      revogar credenciais também nos provedores conectados.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <div className="space-y-2">
                    <label htmlFor="delete-email" className="text-sm font-medium">
                      Confirme seu e-mail
                    </label>
                    <Input
                      id="delete-email"
                      type="email"
                      value={confirmationEmail}
                      onChange={(event) =>
                        setConfirmationEmail(event.target.value)
                      }
                      placeholder={user?.email ?? "voce@empresa.com"}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="delete-phrase"
                      className="text-sm font-medium"
                    >
                      Digite{" "}
                      <code className="rounded bg-background px-1.5 py-0.5">
                        EXCLUIR MINHA CONTA
                      </code>
                    </label>
                    <Input
                      id="delete-phrase"
                      value={confirmationPhrase}
                      onChange={(event) =>
                        setConfirmationPhrase(event.target.value)
                      }
                      autoComplete="off"
                    />
                  </div>
                  {user?.hasPassword && (
                    <div className="space-y-2">
                      <label
                        htmlFor="delete-password"
                        className="text-sm font-medium"
                      >
                        Senha atual
                      </label>
                      <Input
                        id="delete-password"
                        type="password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        autoComplete="current-password"
                      />
                    </div>
                  )}
                  {user && !user.hasPassword && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Confirme novamente com o Google
                      </p>
                      {googleCredential ? (
                        <p className="flex items-center gap-2 text-sm text-emerald-500">
                          <Check className="h-4 w-4" />
                          Identidade confirmada
                        </p>
                      ) : (
                        <GoogleReauthButton
                          onCredential={setGoogleCredential}
                        />
                      )}
                    </div>
                  )}
                </div>

                <ActionError
                  error={deleteError}
                  message="Não foi possível excluir a conta."
                />
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowDelete(false);
                      setDeleteError(null);
                      setCurrentPassword("");
                      setGoogleCredential("");
                    }}
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={deleteAccount}
                    disabled={
                      deleting ||
                      confirmationEmail.trim().toLowerCase() !==
                        user?.email.toLowerCase() ||
                      confirmationPhrase.trim() !== "EXCLUIR MINHA CONTA" ||
                      (Boolean(user?.hasPassword) && !currentPassword) ||
                      (!user?.hasPassword && !googleCredential)
                    }
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Excluir permanentemente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
