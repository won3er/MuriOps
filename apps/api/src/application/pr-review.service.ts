import { decryptSecret } from "../infrastructure/crypto/secret-box.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { GithubAdapter } from "../infrastructure/adapters/github/github-adapter.js";
import { GitlabAdapter } from "../infrastructure/adapters/gitlab/gitlab-adapter.js";
import {
  scanGithubPullRequestFiles,
  scanGitlabMergeRequestFiles,
} from "../modules/pr-review/pr-review-scan.js";
import { renderPrReviewComment } from "../modules/pr-review/render-comment.js";

/**
 * Orquestra "PR Security Reviews automático": dado o id da conexão (GitHub
 * ou GitLab) que recebeu o evento de webhook e o número da PR/MR, decripta o
 * token salvo, roda o scanner escopado aos arquivos alterados
 * (pr-review-scan.ts) e posta um comentário com os achados via o mesmo
 * adapter que Aplicação já usa pra abrir PR/MR de remediação.
 *
 * Deliberadamente "fire and forget" do ponto de vista de quem chama (as
 * rotas de webhook): scan + comentário pode levar mais que o timeout de
 * entrega de webhook do GitHub/GitLab (~10s), então quem chama aqui já
 * respondeu 202 antes de aguardar esta função terminar. Erros são só
 * logados — não há pra onde propagar um erro depois que o webhook já foi
 * confirmado como recebido.
 */
export const prReviewService = {
  async reviewGithubPullRequest(connectionId: string, prNumber: number): Promise<void> {
    const connection = await prisma.adapterConnection.findUnique({ where: { id: connectionId } });
    if (!connection || connection.kind !== "GITHUB" || !connection.credentialEncrypted) return;
    if (!connection.prReviewsEnabled) return;

    const config = connection.config as { owner?: string; repo?: string } | null;
    if (!config?.owner || !config?.repo) return;

    const token = decryptSecret(connection.credentialEncrypted);
    const result = await scanGithubPullRequestFiles(config.owner, config.repo, token, prNumber);
    const comment = renderPrReviewComment(result);

    const adapter = new GithubAdapter(token, config.owner, config.repo);
    await adapter.commentOnPullRequest(prNumber, comment);
  },

  async reviewGitlabMergeRequest(connectionId: string, mrIid: number): Promise<void> {
    const connection = await prisma.adapterConnection.findUnique({ where: { id: connectionId } });
    if (!connection || connection.kind !== "GITLAB" || !connection.credentialEncrypted) return;
    if (!connection.prReviewsEnabled) return;

    const config = connection.config as { projectPath?: string } | null;
    if (!config?.projectPath) return;

    const token = decryptSecret(connection.credentialEncrypted);
    const result = await scanGitlabMergeRequestFiles(config.projectPath, token, mrIid);
    const comment = renderPrReviewComment(result);

    const adapter = new GitlabAdapter(token, config.projectPath);
    await adapter.commentOnMergeRequest(mrIid, comment);
  },
};
