import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageAnalyzer, PageContext } from "../types.js";
import { issue } from "./helpers.js";

interface ElementExample {
  selector: string;
  label: string;
}

interface A11ySnapshot {
  htmlLang: string | null;
  imagesWithoutAlt: ElementExample[];
  inputsWithoutLabel: ElementExample[];
  buttonsWithoutName: ElementExample[];
  linksWithoutText: ElementExample[];
  lowContrastCount: ElementExample[];
  positiveTabindex: ElementExample[];
  skipToContent: boolean;
}

const MAX_EXAMPLES = 5;

/**
 * Módulo 6 — Acessibilidade.
 * Checagens WCAG/ARIA de base: lang, alt, labels, nome acessível, contraste
 * (heurístico), foco e navegação por teclado.
 * Para auditoria completa, integrar axe-core aqui.
 */
export class AccessibilityAnalyzer implements PageAnalyzer {
  readonly id = "accessibility";

  async analyze(ctx: PageContext): Promise<DetectedIssue[]> {
    const snap = await this.collect(ctx);
    const issues: DetectedIssue[] = [];
    const add = (
      title: string,
      description: string,
      severity: Severity,
      key: string,
      examples: ElementExample[] = [],
    ) =>
      issues.push(
        issue({
          title,
          description: examples.length
            ? `${description} Exemplo(s): ${examples.map((e) => e.label).join(", ")}.`
            : description,
          category: AnalysisCategory.ACCESSIBILITY,
          severity,
          pageUrl: ctx.url,
          selector: examples[0]?.selector ?? null,
          fingerprintExtra: [key],
        }),
      );

    if (!snap.htmlLang)
      add(
        "Atributo lang ausente",
        "O elemento <html> não define o atributo lang — leitores de tela não sabem em qual idioma pronunciar o conteúdo e podem ler tudo com sotaque/pronúncia errada.",
        Severity.MEDIUM,
        "lang",
      );

    if (snap.imagesWithoutAlt.length > 0)
      add(
        "Imagens sem texto alternativo",
        `${snap.imagesWithoutAlt.length} imagem(ns) sem atributo alt — leitores de tela não conseguem descrever a imagem pra quem não enxerga.`,
        Severity.MEDIUM,
        "img-alt",
        snap.imagesWithoutAlt,
      );

    if (snap.inputsWithoutLabel.length > 0)
      add(
        "Campos de formulário sem label",
        `${snap.inputsWithoutLabel.length} campo(s) sem <label> associado nem aria-label — quem usa leitor de tela não sabe o que preencher no campo.`,
        Severity.HIGH,
        "input-label",
        snap.inputsWithoutLabel,
      );

    if (snap.buttonsWithoutName.length > 0)
      add(
        "Botões sem nome acessível",
        `${snap.buttonsWithoutName.length} botão(ões) sem texto nem aria-label — leitor de tela anuncia só "botão", sem dizer pra que serve.`,
        Severity.MEDIUM,
        "btn-name",
        snap.buttonsWithoutName,
      );

    if (snap.linksWithoutText.length > 0)
      add(
        "Links sem texto",
        `${snap.linksWithoutText.length} link(s) sem texto acessível (só ícone/imagem sem alt) — leitor de tela anuncia "link" sem dizer pra onde leva.`,
        Severity.MEDIUM,
        "link-text",
        snap.linksWithoutText,
      );

    if (snap.lowContrastCount.length > 0)
      add(
        "Baixo contraste de texto",
        `${snap.lowContrastCount.length} elemento(s) com contraste texto/fundo abaixo de 4.5:1 (mínimo WCAG AA) — difícil de ler pra quem tem baixa visão.`,
        Severity.MEDIUM,
        "contrast",
        snap.lowContrastCount,
      );

    if (snap.positiveTabindex.length > 0)
      add(
        "Uso de tabindex positivo",
        `${snap.positiveTabindex.length} elemento(s) com tabindex > 0 — quebra a ordem natural de navegação por Tab, confundindo quem navega só pelo teclado.`,
        Severity.LOW,
        "tabindex",
        snap.positiveTabindex,
      );

    return issues;
  }

  private async collect(ctx: PageContext): Promise<A11ySnapshot> {
    return ctx.page.evaluate((maxExamples) => {
      const describe = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const id = el.getAttribute("id");
        const cls = el.getAttribute("class");
        if (id) return `${tag}#${id}`;
        if (cls) return `${tag}.${cls.trim().split(/\s+/).join(".")}`;
        return tag;
      };
      const toExample = (el: Element, label: string): ElementExample => ({
        selector: describe(el),
        label,
      });

      const parseRgb = (c: string): [number, number, number] | null => {
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
      };
      const lum = ([r, g, b]: [number, number, number]) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const contrast = (
        a: [number, number, number],
        b: [number, number, number],
      ) => {
        const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (l1! + 0.05) / (l2! + 0.05);
      };

      const inputs = [...document.querySelectorAll("input,select,textarea")];
      const inputsWithoutLabel = inputs
        .filter((el) => {
          const type = el.getAttribute("type");
          if (type === "hidden") return false;
          const id = el.getAttribute("id");
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          return (
            !hasLabel &&
            !el.getAttribute("aria-label") &&
            !el.getAttribute("aria-labelledby") &&
            !el.closest("label")
          );
        })
        .slice(0, maxExamples)
        .map((el) =>
          toExample(
            el,
            `${describe(el)} (name="${el.getAttribute("name") ?? "?"}")`,
          ),
        );

      const buttons = [...document.querySelectorAll("button")];
      const buttonsWithoutName = buttons
        .filter(
          (b) =>
            !b.textContent?.trim() &&
            !b.getAttribute("aria-label") &&
            !b.getAttribute("title"),
        )
        .slice(0, maxExamples)
        .map((el) => toExample(el, describe(el)));

      const links = [...document.querySelectorAll("a[href]")];
      const linksWithoutText = links
        .filter((a) => {
          const hasText = !!a.textContent?.trim();
          const img = a.querySelector("img");
          const imgAlt = img?.getAttribute("alt")?.trim();
          return !hasText && !imgAlt && !a.getAttribute("aria-label");
        })
        .slice(0, maxExamples)
        .map((el) =>
          toExample(el, `${describe(el)} (href="${el.getAttribute("href")}")`),
        );

      const lowContrastCount: ElementExample[] = [];
      for (const el of [
        ...document.querySelectorAll("p,span,a,li,h1,h2,h3,button"),
      ].slice(0, 300)) {
        const text = el.textContent?.trim();
        if (!text) continue;
        const style = getComputedStyle(el);
        const fg = parseRgb(style.color);
        const bg = parseRgb(style.backgroundColor);
        if (fg && bg && bg[0] + bg[1] + bg[2] > 0) {
          if (contrast(fg, bg) < 4.5 && lowContrastCount.length < maxExamples) {
            lowContrastCount.push(
              toExample(el, `${describe(el)} ("${text.slice(0, 30)}")`),
            );
          }
        }
      }

      const positiveTabindex = [...document.querySelectorAll("[tabindex]")]
        .filter((el) => Number(el.getAttribute("tabindex")) > 0)
        .slice(0, maxExamples)
        .map((el) =>
          toExample(el, `${describe(el)} (tabindex="${el.getAttribute("tabindex")}")`),
        );

      const imagesWithoutAlt = [...document.querySelectorAll("img")]
        .filter((i) => !i.getAttribute("alt"))
        .slice(0, maxExamples)
        .map((el) => toExample(el, el.getAttribute("src") ?? describe(el)));

      return {
        htmlLang: document.documentElement.getAttribute("lang"),
        imagesWithoutAlt,
        inputsWithoutLabel,
        buttonsWithoutName,
        linksWithoutText,
        lowContrastCount,
        positiveTabindex,
        skipToContent: !!document.querySelector('a[href^="#"]'),
      } satisfies A11ySnapshot;
    }, MAX_EXAMPLES);
  }
}
