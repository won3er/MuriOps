import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const prisma = new PrismaClient();

/** Popula uma conta demo com um projeto de exemplo. */
async function main(): Promise<void> {
  const email = "demo@qa-ai.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed já aplicado (usuário demo existe).");
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: "MuriOps Demo",
      plan: "PRO",
      subscription: { create: { plan: "PRO", maxPagesPerAnalysis: 50 } },
    },
  });

  await prisma.user.create({
    data: {
      name: "Demo",
      email,
      passwordHash: await bcrypt.hash("demo1234", 10),
      organizationId: org.id,
    },
  });

  await prisma.project.create({
    data: {
      name: "Site de Exemplo",
      description: "Projeto demo para testar o MuriOps",
      url: "https://example.com",
      organizationId: org.id,
      createdById: "seed",
    },
  });

  console.log("✅ Seed aplicado.");
  console.log("   Login: demo@qa-ai.local / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
