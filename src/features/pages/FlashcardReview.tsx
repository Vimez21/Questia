"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

const SRS_INTERVALS = {
  again: { interval: 1, easeMod: -0.2 },
  hard: { interval: 3, easeMod: -0.1 },
  good: { interval: 7, easeMod: 0 },
  easy: { interval: 15, easeMod: 0.15 },
};

type Rating = keyof typeof SRS_INTERVALS;

const ratingConfig: { key: Rating; label: string; color: string; symbol: string }[] = [
  { key: "again", label: "Errei de novo", color: "border-destructive/20 bg-destructive/10 text-destructive", symbol: "!" },
  { key: "hard", label: "Dificil", color: "border-orange-500/20 bg-orange-500/10 text-orange-600", symbol: "~" },
  { key: "good", label: "Bom", color: "border-primary/20 bg-primary/10 text-primary", symbol: "+" },
  { key: "easy", label: "Facil", color: "border-accent/20 bg-accent/10 text-accent", symbol: "*" },
];

const FlashcardReview = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [cards, setCards] = useState<Tables<"flashcards">[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchDueCards = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("flashcards")
        .select("*")
        .eq("user_id", user.id)
        .lte("next_review", new Date().toISOString())
        .order("next_review", { ascending: true });
      setCards(data || []);
      setLoading(false);
    };

    void fetchDueCards();
  }, [user]);

  const currentCard = cards[currentIndex];

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!currentCard) {
        return;
      }

      const { interval, easeMod } = SRS_INTERVALS[rating];
      const currentEase = Number(currentCard.ease_factor);
      const newEase = Math.max(1.3, currentEase + easeMod);
      const currentInterval = currentCard.interval_days;
      const newInterval = rating === "again" ? 1 : Math.round(Math.max(interval, currentInterval * newEase));
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + newInterval);

      await supabase
        .from("flashcards")
        .update({
          interval_days: newInterval,
          ease_factor: newEase,
          next_review: nextReview.toISOString(),
          last_reviewed_at: new Date().toISOString(),
        })
        .eq("id", currentCard.id);

      setStats((current) => ({ ...current, [rating]: current[rating] + 1 }));
      setFlipped(false);

      if (currentIndex + 1 >= cards.length) {
        setCompleted(true);
      } else {
        setTimeout(() => setCurrentIndex((value) => value + 1), 200);
      }
    },
    [cards.length, currentCard, currentIndex],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pb-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="pb-24">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="shadow-card flex h-10 w-10 items-center justify-center rounded-xl bg-card">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="font-heading text-xl font-bold text-foreground">Revisao</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h2 className="font-heading mb-2 text-lg font-semibold text-foreground">Tudo em dia</h2>
            <p className="max-w-xs text-sm text-muted-foreground">Nenhum flashcard para revisar agora. Volte mais tarde ou adicione novas questoes.</p>
            <button onClick={() => router.push("/add-error")} className="gradient-primary mt-6 rounded-xl px-6 py-3 text-sm font-medium text-primary-foreground">
              Adicionar questao
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (completed) {
    const total = stats.again + stats.hard + stats.good + stats.easy;

    return (
      <div className="pb-24">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="shadow-card flex h-10 w-10 items-center justify-center rounded-xl bg-card">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="font-heading text-xl font-bold text-foreground">Sessao completa</h1>
          </div>

          <div className="shadow-card space-y-4 rounded-2xl bg-card p-6 text-center">
            <div className="text-5xl">#</div>
            <h2 className="font-heading text-lg font-bold text-foreground">Parabens</h2>
            <p className="text-sm text-muted-foreground">
              Voce revisou <span className="font-semibold text-foreground">{total}</span> flashcards
            </p>
            <div className="grid grid-cols-4 gap-2 pt-2">
              {ratingConfig.map((rating) => (
                <div key={rating.key} className={`rounded-xl border p-3 ${rating.color}`}>
                  <p className="text-lg font-bold">{stats[rating.key]}</p>
                  <p className="text-[10px]">{rating.label}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => router.push("/")} className="gradient-primary w-full rounded-xl py-3 text-sm font-medium text-primary-foreground">
            Voltar ao inicio
          </button>
        </motion.div>
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
          <h1 className="font-heading text-xl font-bold text-foreground">Revisao</h1>
          <span className="ml-auto rounded-full bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
            {currentIndex + 1}/{cards.length}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(currentIndex / cards.length) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCard.id}-${flipped ? "back" : "front"}`}
            initial={{ opacity: 0, rotateY: flipped ? -90 : 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: flipped ? 90 : -90 }}
            transition={{ duration: 0.25 }}
            onClick={() => setFlipped((value) => !value)}
            className="shadow-card relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-card p-6"
          >
            <div className="absolute left-4 top-4">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${flipped ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                {flipped ? "Resposta" : "Pergunta"}
              </span>
            </div>
            <div className="absolute right-4 top-4">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="px-2 text-center text-base font-medium leading-relaxed text-foreground">{flipped ? currentCard.back : currentCard.front}</p>
            {!flipped && <p className="mt-4 text-xs text-muted-foreground">Toque para ver a resposta</p>}
          </motion.div>
        </AnimatePresence>

        {flipped && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-center text-xs font-medium text-muted-foreground">Como foi?</p>
            <div className="grid grid-cols-2 gap-2">
              {ratingConfig.map((rating) => (
                <button key={rating.key} onClick={() => handleRate(rating.key)} className={`rounded-xl border p-3 text-sm font-medium transition-all active:scale-95 ${rating.color}`}>
                  <span className="mr-1 text-lg">{rating.symbol}</span>
                  {rating.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FlashcardReview;
