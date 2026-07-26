import type {
  Adapter,
  AdapterApplyResult,
  AdapterCapabilityName,
  RemediationItem,
} from "@qa-ai/shared";
import { remediationService } from "../../application/remediation.service.js";

/**
 * Adapter de referência (pull): encapsula a ponte universal já existente
 * (`GET /apply/:token` + `PATCH /apply/:token/items/:itemId`). Não "aplica"
 * nada sozinho — a aplicação real acontece quando a ferramenta externa (dev
 * ou IA de dev) chama a ponte; aqui só confirmamos que o plano está pronto e
 * acessível pelo token.
 */
export class ManualBridgeAdapter implements Adapter {
  readonly kind = "MANUAL_BRIDGE" as const;
  readonly mode = "pull" as const;
  readonly capabilities: AdapterCapabilityName[] = ["APPLY"];

  constructor(private readonly apiToken: string) {}

  async apply(item: RemediationItem): Promise<AdapterApplyResult> {
    const plan = await remediationService.getByToken(this.apiToken);
    if (!plan) {
      return {
        reference: null,
        requiresApproval: true,
        message: "Ponte não encontrada para este token.",
      };
    }
    const found = plan.result?.items.some((i) => i.id === item.id) ?? false;
    return {
      reference: plan.id,
      requiresApproval: true,
      message: found
        ? "Item disponível na ponte universal — aguardando a ferramenta externa marcar como feito."
        : "Item não encontrado no plano da ponte.",
    };
  }
}
