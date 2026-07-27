import Link from "next/link";
import { LogoIsotype } from "@/components/logo";

const HOW_TO_USE = [
  { n: "1", t: "Cole a URL do seu site", d: "Sem instalar nada, sem acesso ao código." },
  { n: "2", t: "Leia o relatório", d: "Nota de 0 a 100 por dimensão, com evidência de cada achado." },
  { n: "3", t: "Gere a Aplicação", d: "Exporte o plano e corrija — sozinho ou com sua IA de dev." },
];

const STATUS = [
  { label: "Análise QA padrão", status: "Disponível" as const },
  { label: "Análise de Segurança", status: "Disponível" as const },
  { label: "Projetar (blueprints com IA)", status: "Disponível" as const },
  { label: "Aplicação — documento único", status: "Disponível" as const },
  { label: "Aplicação — ponte para IA de dev", status: "Disponível" as const },
  { label: "Orquestração (loop automático de reanálise)", status: "Beta" as const },
];

const STATUS_STYLE: Record<(typeof STATUS)[number]["status"], string> = {
  Disponível: "bg-emerald-500/15 text-emerald-400",
  Beta: "bg-amber-500/15 text-amber-400",
};

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <LogoIsotype className="h-7 w-7" title="Elevate QA" />
            Elevate <span className="text-primary">QA</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Sua equipe de QA, do diagnóstico à correção.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Como usar</h4>
          <ol className="mt-4 space-y-4">
            {HOW_TO_USE.map((s) => (
              <li key={s.n} className="flex gap-3 text-sm">
                <span className="tabular mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {s.n}
                </span>
                <span>
                  <span className="font-medium">{s.t}</span>
                  <span className="block text-muted-foreground">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Status das funcionalidades</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {STATUS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{s.label}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Institucional</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link href="/termos" className="transition-colors hover:text-foreground">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className="transition-colors hover:text-foreground">
                Privacidade
              </Link>
            </li>
            <li>
              <a
                href="mailto:jadsonpavia@gmail.com"
                className="transition-colors hover:text-foreground"
              >
                Contato
              </a>
            </li>
            <li>
              <Link href="/login" className="transition-colors hover:text-foreground">
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/register" className="transition-colors hover:text-foreground">
                Criar conta
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Elevate QA.
      </div>
    </footer>
  );
}
