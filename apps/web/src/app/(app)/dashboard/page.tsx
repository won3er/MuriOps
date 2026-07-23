"use client";

import type { DashboardStats, ProjectWithStats } from "@qa-ai/shared";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  FolderKanban,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn, formatDuration, scoreColor, timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);

  useEffect(() => {
    api.dashboard().then(setStats).catch(() => {});
    api.listProjects().then(setProjects).catch(() => {});
  }, []);

  const cards = [
    { label: "Análises", value: stats?.totalAnalyses ?? 0, icon: Activity },
    { label: "Projetos", value: stats?.totalProjects ?? 0, icon: FolderKanban },
    {
      label: "Problemas encontrados",
      value: stats?.totalIssues ?? 0,
      icon: AlertTriangle,
    },
    {
      label: "Tempo médio",
      value: formatDuration(stats?.averageDurationMs ?? 0),
      icon: Clock,
    },
    {
      label: "Score médio",
      value: stats?.averageScore ?? "—",
      icon: BarChart3,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da qualidade dos seus projetos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="pt-5">
                <c.icon className="mb-2 h-5 w-5 text-primary" />
                <p className="tabular text-xl font-bold sm:text-2xl">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Projetos monitorados</h2>
          <Link href="/projects" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum projeto ainda.{" "}
              <Link href="/projects" className="text-primary hover:underline">
                Crie o primeiro
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.url}
                        </p>
                      </div>
                      {p.lastScore !== null && (
                        <span
                          className={cn(
                            "text-xl font-bold",
                            scoreColor(p.lastScore),
                          )}
                        >
                          {p.lastScore}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.analysisCount} análise(s)</span>
                      <span>{timeAgo(p.lastAnalysisAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
