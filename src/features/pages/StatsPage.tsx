"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, BarChart3, Brain, Calendar, Heart, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DIFFICULTY_LABELS, ERROR_TYPE_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

const COLORS = [
  "hsl(200, 80%, 30%)",
  "hsl(160, 60%, 40%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 50%)",
  "hsl(0, 72%, 55%)",
  "hsl(45, 90%, 50%)",
];

const BarChart = ({
  data,
  maxValue,
}: {
  data: { label: string; value: number; color: string }[];
  maxValue: number;
}) => (
  <div className="space-y-2.5">
    {data.map((item, index) => (
      <div key={`${item.label}-${index}`} className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="max-w-[70%] truncate font-medium text-foreground">{item.label}</span>
          <span className="text-muted-foreground">{item.value}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            transition={{ duration: 0.5, delay: index * 0.06 }}
            className="h-full rounded-full"
            style={{ backgroundColor: item.color }}
          />
        </div>
      </div>
    ))}
  </div>
);

const TimelineChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const max = Math.max(...data.map((item) => item.value), 1);
  const chartHeight = 120;

  return (
    <div className="flex h-[140px] items-end gap-1.5 pt-4">
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-medium text-muted-foreground">{item.value}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(item.value / max) * chartHeight}px` }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            className="min-h-[4px] w-full rounded-t-md bg-primary"
          />
          <span className="text-[9px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const StatsPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [errors, setErrors] = useState<Tables<"errors">[]>([]);
  const [attempts, setAttempts] = useState<Tables<"question_attempts">[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      const [errorsResponse, attemptsResponse, flashcardsResponse, dueResponse] = await Promise.all([
        supabase.from("errors").select("*").eq("user_id", user.id),
        supabase.from("question_attempts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user.id).lte("next_review", new Date().toISOString()),
      ]);

      setErrors(errorsResponse.data || []);
      setAttempts(attemptsResponse.data || []);
      setFlashcardCount(flashcardsResponse.count || 0);
      setDueCount(dueResponse.count || 0);
      setLoading(false);
    };

    void fetchStats();
  }, [user]);

  const accuracy = useMemo(() => {
    const graded = attempts.filter((attempt) => attempt.is_correct !== null);
    if (graded.length === 0) {
      return 0;
    }
    const hits = graded.filter((attempt) => attempt.is_correct).length;
    return Math.round((hits / graded.length) * 100);
  }, [attempts]);

  const favoritesCount = useMemo(() => errors.filter((item) => item.is_favorite).length, [errors]);

  const byTheme = useMemo(() => {
    const map: Record<string, number> = {};
    errors.forEach((item) => {
      if (item.theme) {
        map[item.theme] = (map[item.theme] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], index) => ({ label, value, color: COLORS[index % COLORS.length] }));
  }, [errors]);

  const byDifficulty = useMemo(() => {
    const map: Record<string, number> = {};
    errors.forEach((item) => {
      if (item.difficulty) {
        map[item.difficulty] = (map[item.difficulty] || 0) + 1;
      }
    });
    return Object.entries(map).map(([key, value], index) => ({
      label: DIFFICULTY_LABELS[key] || key,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [errors]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    errors.forEach((item) => {
      if (item.error_type) {
        map[item.error_type] = (map[item.error_type] || 0) + 1;
      }
    });
    return Object.entries(map).map(([key, value], index) => ({
      label: ERROR_TYPE_LABELS[key] || key,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [errors]);

  const weeklyAttempts = useMemo(() => {
    return Array.from({ length: 7 }).map((_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const value = attempts.filter((attempt) => attempt.created_at.slice(0, 10) === key).length;
      return { label, value };
    });
  }, [attempts]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pb-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="shadow-card flex h-10 w-10 items-center justify-center rounded-xl bg-card">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-heading text-xl font-bold text-foreground">Desempenho</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: errors.length, label: "Questoes", icon: <AlertTriangle className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
            { value: flashcardCount, label: "Flashcards", icon: <Brain className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
            { value: dueCount, label: "Pendentes", icon: <Target className="h-4 w-4" />, color: "bg-accent/10 text-accent" },
            { value: `${accuracy}%`, label: "Acerto", icon: <TrendingUp className="h-4 w-4" />, color: "bg-info/10 text-info" },
          ].map((item) => (
            <div key={item.label} className="shadow-card space-y-1 rounded-2xl bg-card p-4 text-center">
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>{item.icon}</div>
              <p className="font-heading text-2xl font-bold text-foreground">{item.value}</p>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {errors.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Cadastre questoes para ver seu historico de desempenho.</p>
            <button onClick={() => router.push("/add-error")} className="gradient-primary mt-4 rounded-xl px-6 py-3 text-sm font-medium text-primary-foreground">
              Adicionar questao
            </button>
          </div>
        ) : (
          <>
            <div className="shadow-card space-y-2 rounded-2xl bg-card p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Tentativas por dia</h2>
              </div>
              <TimelineChart data={weeklyAttempts} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {byTheme.length > 0 && (
                <div className="shadow-card space-y-3 rounded-2xl bg-card p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Temas mais recorrentes</h2>
                  </div>
                  <BarChart data={byTheme} maxValue={byTheme[0]?.value || 1} />
                </div>
              )}

              {byDifficulty.length > 0 && (
                <div className="shadow-card space-y-3 rounded-2xl bg-card p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Dificuldade</h2>
                  </div>
                  <BarChart data={byDifficulty} maxValue={Math.max(...byDifficulty.map((item) => item.value), 1)} />
                </div>
              )}
            </div>

            {byType.length > 0 && (
              <div className="shadow-card space-y-3 rounded-2xl bg-card p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Padrao dos erros</h2>
                </div>
                <BarChart data={byType} maxValue={Math.max(...byType.map((item) => item.value), 1)} />
              </div>
            )}

            <div className="shadow-card rounded-2xl bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Favoritos</h2>
              </div>
              <p className="text-3xl font-bold text-foreground">{favoritesCount}</p>
              <p className="text-sm text-muted-foreground">Questoes marcadas para revisao prioritaria.</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default StatsPage;
