/**
 * [10/08/2026] Infrastructure Testing leve — Terraform e manifests
 * Kubernetes — mesma filosofia do resto deste módulo (heurística textual
 * simples, sem parser HCL/YAML de verdade, sem chamar nenhuma API de nuvem
 * pra confirmar o estado real do recurso). Cobre os erros de configuração
 * mais comuns e de maior impacto: exposição de rede ampla demais, permissão
 * de nuvem excessiva, container privilegiado. Não substitui uma ferramenta
 * dedicada (tfsec/checkov/kube-bench), mas dá o primeiro sinal sem exigir
 * infraestrutura nova no produto.
 */
export interface InfraPattern {
  id: string;
  label: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  test: (content: string) => boolean;
}

export const TERRAFORM_PATTERNS: InfraPattern[] = [
  {
    id: "tf-open-cidr-ingress",
    label: "Regra de ingress liberada para 0.0.0.0/0",
    description:
      "cidr_blocks inclui 0.0.0.0/0 (qualquer IP da internet) — se for uma porta administrativa (SSH/RDP/banco de dados), qualquer um na internet pode tentar se conectar. Restrinja o CIDR ao necessário (IP do escritório, VPN, ou outro security group).",
    severity: "HIGH",
    test: (c) => /0\.0\.0\.0\/0/.test(c) && /ingress/i.test(c),
  },
  {
    id: "tf-all-ports-open",
    label: "Security group abrindo todas as portas (0-65535)",
    description:
      "from_port = 0 e to_port = 65535 no mesmo bloco — libera todas as portas TCP/UDP em vez de só a necessária. Restrinja à porta específica do serviço.",
    severity: "HIGH",
    test: (c) => /from_port\s*=\s*0\b/.test(c) && /to_port\s*=\s*65535\b/.test(c),
  },
  {
    id: "tf-s3-public-acl",
    label: "Bucket S3 com ACL pública",
    description:
      'acl = "public-read" ou "public-read-write" — o conteúdo do bucket fica acessível (ou editável) por qualquer um na internet sem autenticação. Use políticas de bucket restritas e bloqueio de acesso público (aws_s3_bucket_public_access_block).',
    severity: "CRITICAL",
    test: (c) => /acl\s*=\s*["']public-read(-write)?["']/i.test(c),
  },
  {
    id: "tf-iam-wildcard",
    label: "Política IAM com Action/Resource coringa",
    description:
      '"Action": "*" combinado com "Resource": "*" (ou equivalente em HCL) — concede permissão irrestrita a qualquer ação em qualquer recurso, violando o princípio de menor privilégio. Liste as ações e recursos específicos necessários.',
    severity: "HIGH",
    test: (c) => /["']?Action["']?\s*[:=]\s*["']\*["']/.test(c) && /["']?Resource["']?\s*[:=]\s*["']\*["']/.test(c),
  },
  {
    id: "tf-rds-publicly-accessible",
    label: "Banco de dados RDS marcado como publicamente acessível",
    description:
      "publicly_accessible = true expõe a instância de banco de dados diretamente à internet, fora da VPC. Praticamente nunca é necessário — acesse via VPN, bastion host ou peering em vez disso.",
    severity: "HIGH",
    test: (c) => /publicly_accessible\s*=\s*true\b/.test(c),
  },
  {
    id: "tf-s3-backend-unencrypted",
    label: "Backend S3 do Terraform sem encrypt = true",
    description:
      'Bloco backend "s3" sem encrypt = true — o state file (que pode conter segredos e IPs internos em texto puro) fica sem criptografia at-rest garantida no bucket. Adicione encrypt = true ao bloco de backend.',
    severity: "MEDIUM",
    test: (c) => /backend\s+["']s3["']\s*\{(?![^}]*encrypt\s*=\s*true)[^}]*\}/is.test(c),
  },
];

export const KUBERNETES_PATTERNS: InfraPattern[] = [
  {
    id: "k8s-privileged-container",
    label: "Container rodando em modo privileged",
    description:
      "securityContext.privileged: true dá ao container acesso equivalente a root no host — se o container for comprometido, o atacante tem acesso ao node inteiro. Evite privileged; use capabilities específicas se necessário.",
    severity: "CRITICAL",
    test: (c) => /privileged:\s*true\b/.test(c),
  },
  {
    id: "k8s-host-network",
    label: "Pod usando hostNetwork",
    description:
      "hostNetwork: true remove o isolamento de rede do pod, expondo-o à rede do node diretamente e permitindo acesso a serviços internos que deveriam ficar isolados. Use Service/Ingress em vez disso.",
    severity: "HIGH",
    test: (c) => /hostNetwork:\s*true\b/.test(c),
  },
  {
    id: "k8s-host-pid",
    label: "Pod usando hostPID",
    description:
      "hostPID: true dá visibilidade dos processos do node ao pod, quebrando isolamento entre containers e permitindo potencial interferência com outros processos do host.",
    severity: "HIGH",
    test: (c) => /hostPID:\s*true\b/.test(c),
  },
  {
    id: "k8s-run-as-root",
    label: "Container configurado explicitamente para rodar como root (UID 0)",
    description:
      "runAsUser: 0 roda o processo do container como root — se comprometido, o atacante tem privilégio total dentro do container. Defina um UID não-root e, se possível, runAsNonRoot: true.",
    severity: "MEDIUM",
    test: (c) => /runAsUser:\s*0\b/.test(c),
  },
  {
    id: "k8s-no-resource-limits",
    label: "Deployment/Pod sem resources.limits definido",
    description:
      "Nenhum bloco resources.limits encontrado — sem teto de CPU/memória, um container com bug (ou comprometido) pode consumir todos os recursos do node e derrubar outros workloads (noisy neighbor / DoS acidental). Defina limits.cpu e limits.memory.",
    severity: "LOW",
    test: (c) => /kind:\s*(Deployment|Pod|StatefulSet|DaemonSet)\b/.test(c) && !/resources:\s*\n(\s|.)*?limits:/i.test(c),
  },
  {
    id: "k8s-secret-manifest-committed",
    label: "Manifest do tipo Secret commitado no repositório",
    description:
      "kind: Secret encontrado no código-fonte — o campo data: só é base64 (não é criptografia), então o valor real fica recuperável por qualquer um com acesso ao repositório. Gerencie segredos via um cofre externo (Vault, Sealed Secrets, SOPS, ou o secret manager do provedor de nuvem) em vez de commitar o manifest.",
    severity: "MEDIUM",
    test: (c) => /kind:\s*Secret\b/.test(c) && /^\s*data:/m.test(c),
  },
];

/** Terraform é reconhecido pela extensão `.tf` — sem ambiguidade com outros formatos. */
export function isTerraformPath(path: string): boolean {
  return path.toLowerCase().endsWith(".tf");
}

/**
 * Manifest Kubernetes: YAML/YML cujo conteúdo tem `apiVersion:` e `kind:` —
 * combinação específica o bastante pra não confundir com outros YAML comuns
 * no repo (CI, docker-compose, configs de app).
 */
export function isKubernetesManifest(path: string, content: string): boolean {
  const lower = path.toLowerCase();
  if (!lower.endsWith(".yaml") && !lower.endsWith(".yml")) return false;
  return /^\s*apiVersion:\s*\S+/m.test(content) && /^\s*kind:\s*\S+/m.test(content);
}
