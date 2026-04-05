"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, BookOpen, Brain, ChevronRight, Heart, Plus, Target, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ERROR_TYPE_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

type DashboardData = {
  errors: Tables<"errors">[];
  totalErrorCount: number;
  favoriteCount: number;
  dueCount: number;
  flashcardCount: number;
  attempts: Tables<"question_attempts">[];
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({
  icon,
  label,
  value,
  color,
}) => (
  <div className="shadow-card flex items-center gap-3 rounded-2xl bg-card p-4">
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
);

const QuickAction: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="shadow-card hover:shadow-elevated flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left transition-shadow"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div>
    <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </button>
);

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    errors: [],
    totalErrorCount: 0,
    favoriteCount: 0,
    dueCount: 0,
    flashcardCount: 0,
    attempts: [],
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchDashboard = async () => {
      setLoading(true);

      const [recentErrorsResponse, totalErrorsResponse, favoriteErrorsResponse, dueResponse, flashcardsResponse, attemptsResponse] = await Promise.all([
        supabase.from("errors").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("errors").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("errors").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_favorite", true),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id).lte("next_review", new Date().toISOString()),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("question_attempts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      setData({
        errors: recentErrorsResponse.data || [],
        totalErrorCount: totalErrorsResponse.count || 0,
        favoriteCount: favoriteErrorsResponse.count || 0,
        dueCount: dueResponse.count || 0,
        flashcardCount: flashcardsResponse.count || 0,
        attempts: attemptsResponse.data || [],
      });

      setLoading(false);
    };

    void fetchDashboard();
  }, [user]);

  const firstName = useMemo(() => {
    return profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Estudante";
  }, [profile?.full_name, user?.email]);

  const accuracy = useMemo(() => {
    const gradedAttempts = data.attempts.filter((attempt) => attempt.is_correct !== null);
    if (gradedAttempts.length === 0) {
      return 0;
    }
    const hits = gradedAttempts.filter((attempt) => attempt.is_correct).length;
    return Math.round((hits / gradedAttempts.length) * 100);
  }, [data.attempts]);

  if (loading) {
    return (
      <div className="pb-24">
        <div className="space-y-4">
          <div className="gradient-hero h-40 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="shadow-card h-24 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="gradient-hero rounded-2xl p-6 text-primary-foreground">
          <p className="text-sm opacity-80">Painel do aluno</p>
          <h1 className="font-heading text-2xl font-bold">Ola, {firstName}</h1>
          <p className="mt-1 text-sm opacity-80">
            {profile?.exam_goal ? `Rumo a ${profile.exam_goal}.` : "Sua revisao esta organizada em um unico lugar."} Continue usando seus erros como atalho para evoluir.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<BookOpen className="h-5 w-5 text-primary-foreground" />} label="Questoes" value={`${data.totalErrorCount}`} color="gradient-primary" />
          <StatCard icon={<Brain className="h-5 w-5 text-accent-foreground" />} label="Flashcards" value={`${data.flashcardCount}`} color="gradient-accent" />
          <StatCard icon={<Target className="h-5 w-5 text-warning-foreground" />} label="Revisoes hoje" value={`${data.dueCount}`} color="bg-warning" />
          <StatCard icon={<Trophy className="h-5 w-5 text-info-foreground" />} label="Acerto recente" value={`${accuracy}%`} color="bg-info" />
        </div>

        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
          <button
            onClick={() => router.push("/add-error")}
            className="shadow-elevated flex items-center gap-4 rounded-2xl bg-card p-5 text-left transition-opacity hover:opacity-95"
          >
            <div className="gradient-primary flex h-12 w-12 items-center justify-center rounded-xl">
              <Plus className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">Adicionar nova questao</p>
              <p className="text-xs text-muted-foreground">Texto, imagem ou PDF com analise via IA</p>
            </div>
          </button>

          <div className="shadow-card rounded-2xl bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Heart className="h-4 w-4 text-primary" />
              Destaques
            </div>
            <p className="text-3xl font-bold text-foreground">{data.favoriteCount}</p>
            <p className="text-xs text-muted-foreground">Favoritos entre as questoes recentes</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Acesso rapido</h2>
          <div className="space-y-2">
            <QuickAction icon={<Brain className="h-5 w-5" />} label="Revisar flashcards de hoje" onClick={() => router.push("/review")} />
            <QuickAction icon={<BookOpen className="h-5 w-5" />} label="Abrir caderno de questoes" onClick={() => router.push("/errors")} />
            <QuickAction icon={<BarChart3 className="h-5 w-5" />} label="Ver desempenho e historico" onClick={() => router.push("/stats")} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">Questoes recentes</h2>
            <button onClick={() => router.push("/errors")} className="text-sm font-medium text-primary">
              Ver tudo
            </button>
          </div>

          {data.errors.length === 0 ? (
            <div className="shadow-card rounded-2xl bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Sua primeira questao ainda nao foi cadastrada.</p>
            </div>
          ) : (
            data.errors.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/analysis/${item.id}`)}
                className="shadow-card flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title || item.question_text || "Questao sem titulo"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.theme && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{item.theme}</span>}
                    {item.error_type && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {ERROR_TYPE_LABELS[item.error_type] || item.error_type}
                      </span>
                    )}
                    {item.is_favorite && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">Favorita</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
