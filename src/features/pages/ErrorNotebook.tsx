"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpen, Calendar, ChevronRight, Filter, Heart, Search, Star, Tag, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ERROR_TYPE_LABELS, SPECIALTIES, DIFFICULTY_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

const ErrorNotebook = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [errors, setErrors] = useState<Tables<"errors">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchErrors = async () => {
      setLoading(true);
      const { data } = await supabase.from("errors").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setErrors(data || []);
      setLoading(false);
    };

    void fetchErrors();
  }, [user]);

  const filtered = useMemo(() => {
    return errors.filter((item) => {
      const haystack = [item.title, item.question_text, item.subtopic, item.specialty, item.theme].join(" ").toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesSpecialty = specialty === "all" || item.specialty === specialty;
      const matchesFavorite = !onlyFavorites || item.is_favorite;
      return matchesSearch && matchesSpecialty && matchesFavorite;
    });
  }, [errors, onlyFavorites, search, specialty]);

  const activeSpecialties = useMemo(() => {
    const available = new Set(errors.map((item) => item.specialty).filter(Boolean));
    return SPECIALTIES.filter((item) => available.has(item));
  }, [errors]);

  const toggleFavorite = async (errorId: string, currentValue: boolean) => {
    setErrors((current) => current.map((item) => (item.id === errorId ? { ...item, is_favorite: !currentValue } : item)));
    const { error } = await supabase.from("errors").update({ is_favorite: !currentValue }).eq("id", errorId);

    if (error) {
      setErrors((current) => current.map((item) => (item.id === errorId ? { ...item, is_favorite: currentValue } : item)));
    }
  };

  return (
    <div className="pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="shadow-card flex h-10 w-10 items-center justify-center rounded-xl bg-card">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-heading text-xl font-bold text-foreground">Caderno de questoes</h1>
          <span className="ml-auto rounded-full bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
            {errors.length} {errors.length === 1 ? "item" : "itens"}
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por tema, banca ou subtopico"
            className="bg-card pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="h-9 bg-card text-xs">
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas especialidades</SelectItem>
              {activeSpecialties.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setOnlyFavorites((value) => !value)}
            className={`flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium ${
              onlyFavorites ? "bg-accent/10 text-accent" : "bg-card text-muted-foreground"
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            Favoritos
          </button>
          {(specialty !== "all" || search || onlyFavorites) && (
            <button
              onClick={() => {
                setSpecialty("all");
                setSearch("");
                setOnlyFavorites(false);
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && errors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="font-heading mb-2 text-lg font-semibold text-foreground">Nenhuma questao cadastrada</h2>
            <p className="max-w-xs text-sm text-muted-foreground">Comece enviando uma questao para formar seu historico de estudo.</p>
            <button
              onClick={() => router.push("/add-error")}
              className="gradient-primary mt-6 rounded-xl px-6 py-3 text-sm font-medium text-primary-foreground"
            >
              Adicionar primeira questao
            </button>
          </div>
        )}

        {!loading && errors.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma questao encontrada com esses filtros.</p>
          </div>
        )}

        <AnimatePresence>
          {filtered.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="shadow-card rounded-2xl bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <button onClick={() => router.push(`/analysis/${item.id}`)} className="min-w-0 flex-1 text-left">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title || item.question_text || "Questao sem titulo"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {item.specialty && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Tag className="h-3 w-3" />
                        {item.specialty}
                      </span>
                    )}
                    {item.theme && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{item.theme}</span>}
                    {item.error_type && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {ERROR_TYPE_LABELS[item.error_type] || item.error_type}
                      </span>
                    )}
                    {item.difficulty && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void toggleFavorite(item.id, item.is_favorite)}
                    className={`rounded-xl p-2 ${item.is_favorite ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}
                  >
                    <Star className={`h-4 w-4 ${item.is_favorite ? "fill-current" : ""}`} />
                  </button>
                  <button onClick={() => router.push(`/analysis/${item.id}`)} className="rounded-xl bg-secondary p-2 text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ErrorNotebook;
