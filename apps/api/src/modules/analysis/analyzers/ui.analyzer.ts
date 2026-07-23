import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageAnalyzer, PageContext } from "../types.js";
import { issue } from "./helpers.js";

interface ElementExample {
  selector: string;
  label: string;
}

interface UiSnapshot {
  brokenImages: string[];
  emptyLinks: ElementExample[];
  emptyButtons: ElementExample[];
  horizontalScroll: boolean;
  overflowingElements: ElementExample[];
  tinyText: ElementExample[];
  invisibleInputs: ElementExample[];
}

const MAX_EXAMPLES = 5;

/**
 * Módulo 2 — Análise Visual / UI.
 * Botões quebrados, links mortos, imagens inexistentes, texto cortado,
 * elementos sobrepostos, scroll horizontal inesperado, campos invisíveis.
 */
export class UiAnalyzer implements PageAnalyzer {
  readonly id = "ui";

  async analyze(ctx: PageContext): Promise<DetectedIssue[]> {
    const snap = await this.collect(ctx);
    const issues: DetectedIssue[] = [];
    const add = (
      title: string,
      description: string,
      severity: Severity,
      key: string,
      examples: ElementExample[] = [],
      selectorOverride?: string,
    ) =>
      issues.push(
        issue({
          title,
          description: examples.length
            ? `${description} Exemplo(s): ${examples.map((e) => e.label).join(", ")}.`
            : description,
          category: AnalysisCategory.UI,
          severity,
          pageUrl: ctx.url,
          selector: selectorOverride ?? examples[0]?.selector ?? null,
          fingerprintExtra: [key],
        }),
      );

    for (const src of snap.brokenImages.slice(0, 20)) {
      add(
        "Imagem quebrada",
        `A imagem ${src} não carregou (dimensão natural zero / 404) — usuário vê um ícone de imagem quebrada no lugar.`,
        Severity.MEDIUM,
        `broken-img:${src}`,
        [],
        `img[src="${src}"]`,
      );
    }

    if (snap.emptyLinks.length > 0)
      add(
        "Links vazios ou quebrados",
        `${snap.emptyLinks.length} link(s) sem destino válido (href vazio, "#" ou javascript:void) — clicar não leva a lugar nenhum.`,
        Severity.MEDIUM,
        "empty-links",
        snap.emptyLinks,
      );

    if (snap.emptyButtons.length > 0)
      add(
        "Botões sem rótulo",
        `${snap.emptyButtons.length} botão(ões) sem texto nem ícone visível — usuário não sabe o que o botão faz.`,
        Severity.LOW,
        "empty-buttons",
        snap.emptyButtons,
      );

    if (snap.horizontalScroll)
      add(
        "Scrollbar horizontal inesperada",
        "A página apresenta rolagem horizontal — normalmente sinal de um elemento mais largo que a tela (imagem, tabela ou container sem overflow controlado), quebrando o layout em telas menores.",
        Severity.MEDIUM,
        "hscroll",
      );

    if (snap.overflowingElements.length > 0)
      add(
        "Elementos ultrapassando a viewport",
        `${snap.overflowingElements.length} elemento(s) excedem a largura da viewport, cortando conteúdo ou forçando scroll horizontal.`,
        Severity.MEDIUM,
        "overflow",
        snap.overflowingElements,
      );

    if (snap.tinyText.length > 0)
      add(
        "Texto muito pequeno",
        `${snap.tinyText.length} elemento(s) com fonte < 10px — difícil de ler, especialmente em mobile.`,
        Severity.LOW,
        "tiny-text",
        snap.tinyText,
      );

    if (snap.invisibleInputs.length > 0)
      add(
        "Campos de formulário invisíveis",
        `${snap.invisibleInputs.length} campo(s) de entrada com dimensão zero mas presentes no fluxo de tab — usuário pode "tabular" para um campo que não vê, ou o campo pode estar quebrado por CSS.`,
        Severity.LOW,
        "invisible-inputs",
        snap.invisibleInputs,
      );

    return issues;
  }

  private async collect(ctx: PageContext): Promise<UiSnapshot> {
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

      const brokenImages = [...document.querySelectorAll("img")]
        .filter(
          (img) =>
            img.complete &&
            img.naturalWidth === 0 &&
            (img.getAttribute("src")?.length ?? 0) > 0,
        )
        .map((img) => img.getAttribute("src") ?? "");

      const emptyLinks = [...document.querySelectorAll("a")]
        .filter((a) => {
          const href = a.getAttribute("href");
          return (
            !href ||
            href === "#" ||
            href.trim() === "" ||
            href.startsWith("javascript:void")
          );
        })
        .slice(0, maxExamples)
        .map((el) => toExample(el, describe(el)));

      const emptyButtons = [...document.querySelectorAll("button")]
        .filter(
          (b) =>
            !b.textContent?.trim() &&
            b.querySelectorAll("img,svg,i").length === 0,
        )
        .slice(0, maxExamples)
        .map((el) => toExample(el, describe(el)));

      const docWidth = document.documentElement.clientWidth;
      const horizontalScroll =
        document.documentElement.scrollWidth > docWidth + 4;

      const overflowingElements: ElementExample[] = [];
      for (const el of [...document.body.querySelectorAll("*")].slice(0, 1500)) {
        const r = el.getBoundingClientRect();
        if (
          r.width > 0 &&
          r.right > docWidth + 8 &&
          overflowingElements.length < maxExamples
        ) {
          overflowingElements.push(
            toExample(el, `${describe(el)} (${Math.round(r.right - docWidth)}px além da tela)`),
          );
        }
      }

      const tinyText: ElementExample[] = [];
      for (const el of [
        ...document.querySelectorAll("p,span,a,li,td,label"),
      ].slice(0, 500)) {
        if (!el.textContent?.trim()) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 10 && tinyText.length < maxExamples) {
          tinyText.push(
            toExample(el, `${describe(el)} (${size}px, "${el.textContent.trim().slice(0, 20)}")`),
          );
        }
      }

      const invisibleInputs = [...document.querySelectorAll("input,select,textarea")]
        .filter((el) => {
          if (el.getAttribute("type") === "hidden") return false;
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            (r.width === 0 || r.height === 0) &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })
        .slice(0, maxExamples)
        .map((el) => toExample(el, describe(el)));

      return {
        brokenImages,
        emptyLinks,
        emptyButtons,
        horizontalScroll,
        overflowingElements,
        tinyText,
        invisibleInputs,
      } satisfies UiSnapshot;
    }, MAX_EXAMPLES);
  }
}
