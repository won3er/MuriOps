/**
 * [08/08/2026] Checagens de IaC leve — Dockerfile — inspiradas no escopo de
 * "infrastructure as code" do Strix, mas mantendo a mesma filosofia do resto
 * deste módulo: heurística textual simples, sem parser de Dockerfile de
 * verdade, sem escanear Terraform/Kubernetes (exigiria parser dedicado).
 */
export interface DockerfilePattern {
  id: string;
  label: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  test: (content: string) => boolean;
}

export const DOCKERFILE_PATTERNS: DockerfilePattern[] = [
  {
    id: "docker-root-user",
    label: "Container roda como root (sem USER definido)",
    description:
      "Nenhuma instrução USER encontrada — o container roda como root por padrão. Se o processo dentro do container for comprometido, o atacante tem privilégio total dentro dele. Adicione um usuário não-root e troque com USER antes do CMD/ENTRYPOINT.",
    severity: "MEDIUM",
    test: (c) => !/^\s*USER\s+\S+/im.test(c),
  },
  {
    id: "docker-latest-tag",
    label: "Imagem base usando a tag \"latest\"",
    description:
      "FROM ...:latest (ou sem tag, que também vira latest) — a imagem pode mudar de conteúdo entre builds sem aviso, quebrando reprodutibilidade e potencialmente puxando uma versão vulnerável sem você perceber. Fixe uma tag de versão específica (ou digest).",
    severity: "LOW",
    test: (c) => /^\s*FROM\s+[^\s#]+:latest\b/im.test(c) || /^\s*FROM\s+[a-zA-Z0-9_./-]+\s*$/im.test(c),
  },
  {
    id: "docker-add-remote-url",
    label: "ADD usado com URL remota",
    description:
      "ADD baixando de uma URL remota executa o download sem verificação de integridade e sem cache de camada previsível. Prefira COPY para arquivos locais e curl/wget explícito (com checksum) para remotos.",
    severity: "MEDIUM",
    test: (c) => /^\s*ADD\s+https?:\/\//im.test(c),
  },
  {
    id: "docker-secret-in-env-arg",
    label: "Possível segredo em ENV/ARG do Dockerfile",
    description:
      "ENV ou ARG com nome sugerindo senha/chave/token com valor literal — fica gravado em texto puro nas camadas da imagem, visível a qualquer um com acesso a ela (inclusive em registries privados, via docker history). Use secrets de build (--secret) ou injete em runtime.",
    severity: "HIGH",
    test: (c) =>
      /^\s*(ENV|ARG)\s+.*(password|passwd|secret|token|api[_-]?key)\s*=?\s*["']?[A-Za-z0-9_\-/+=]{6,}/im.test(
        c,
      ),
  },
  {
    id: "docker-curl-pipe-shell",
    label: "Instalação via curl/wget | sh direto no build",
    description:
      "Baixar um script e executá-lo direto (curl ... | sh / bash) sem checksum/verificação — se o servidor remoto for comprometido ou o conteúdo mudar, o build executa código arbitrário sem aviso. Prefira baixar, verificar hash, depois executar.",
    severity: "MEDIUM",
    test: (c) => /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash)\b/i.test(c),
  },
  {
    id: "docker-exposed-privileged-port",
    label: "EXPOSE de porta privilegiada incomum",
    description:
      "EXPOSE de uma porta administrativa sensível (ex.: 22/SSH, 3389/RDP) dentro do container — normalmente sinal de que um serviço de acesso remoto está rodando ali, o que amplia a superfície de ataque desnecessariamente para um container de aplicação.",
    severity: "LOW",
    test: (c) => /^\s*EXPOSE\s+(22|3389)\b/im.test(c),
  },
];

/** Reconhece Dockerfile pelo nome do arquivo, não pela extensão (não tem uma fixa). */
export function isDockerfilePath(path: string): boolean {
  const fileName = (path.split("/").pop() ?? "").toLowerCase();
  return fileName === "dockerfile" || fileName.startsWith("dockerfile.") || fileName.endsWith(".dockerfile");
}
