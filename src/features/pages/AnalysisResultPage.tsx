"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Heart,
  Loader2,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import { parseQuestionAnalysis, parseSimilarQuestion, parseWrongOptions, type SimilarQuestion } from "@/lib/analysis";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Tente novamente.");

const Section = ({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="shadow-card overflow-hidden rounded-2xl bg-card">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FlashcardPreview = ({ front, back }: { front: string; back: string }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <button onClick={() => setFlipped((value) => !value)} className="w-full rounded-xl border border-border bg-secondary/50 p-4 text-left">
      <p className="mb-1 text-xs font-medium text-primary">{flipped ? "Resposta" : "Pergunta"}</p>
      <p className="text-sm text-foreground">{flipped ? back : front}</p>
      <p className="mt-2 text-xs text-muted-foreground">Toque para {flipped ? "ver a pergunta" : "ver a resposta"}</p>
    </button>
  );
};

type DetailState = {
  record: Tables<"errors"> | null;
  flashcards: Tables<"flashcards">[];
  attempts: Tables<"question_attempts">[];
  attachmentUrl: string | null;
};

const AnalysisResultPage = ({ errorId }: { errorId: string }) => {
  const router = useRouter();
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingSimilar, setGeneratingSimilar] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [confidence, setConfidence] = useState("3");
  const [detail, setDetail] = useState<DetailState>({
    record: null,
    flashcards: [],
    attempts: [],
    attachmentUrl: null,
  });
  const [localSimilarQuestion, setLocalSimilarQuestion] = useState<SimilarQuestion | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchDetail = async () => {
      setLoading(true);
      const [recordResponse, flashcardsResponse, attemptsResponse] = await Promise.all([
        supabase.from("errors").select("*").eq("id", errorId).single(),
        supabase.from("flashcards").select("*").eq("error_id", errorId).order("created_at", { ascending: false }),
        supabase.from("question_attempts").select("*").eq("error_id", errorId).order("created_at", { ascending: false }),
      ]);

      if (!mounted) {
        return;
      }

      if (recordResponse.error) {
        toast({ title: "Erro ao carregar questao", description: recordResponse.error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      let attachmentUrl: string | null = null;
      if (recordResponse.data?.attachment_path) {
        const signed = await supabase.storage.from("question-files").createSignedUrl(recordResponse.data.attachment_path, 60 * 60);
        attachmentUrl = signed.data?.signedUrl || null;
      }

      setDetail({
        record: recordResponse.data,
        flashcards: flashcardsResponse.data || [],
        attempts: attemptsResponse.data || [],
        attachmentUrl,
      });
      setLoading(false);
    };

    void fetchDetail();

    return () => {
      mounted = false;
    };
  }, [errorId, toast]);

  const record = detail.record;
  const analysis = parseQuestionAnalysis(record?.ai_analysis || null);
  const wrongOptions = parseWrongOptions(record?.wrong_options_explanations || null);
  const similarQuestion = localSimilarQuestion || parseSimilarQuestion(record?.similar_question || null);

  const refreshAttempts = async () => {
    const response = await supabase.from("question_attempts").select("*").eq("error_id", errorId).order("created_at", { ascending: false });
    setDetail((current) => ({ ...current, attempts: response.data || [] }));
  };

  const refreshFlashcards = async () => {
    const response = await supabase.from("flashcards").select("*").eq("error_id", errorId).order("created_at", { ascending: false });
    setDetail((current) => ({ ...current, flashcards: response.data || [] }));
  };

  const refreshRecord = async () => {
    const response = await supabase.from("errors").select("*").eq("id", errorId).single();
    if (response.data) {
      setDetail((current) => ({ ...current, record: response.data }));
    }
  };

  const toggleFavorite = async () => {
    if (!record) {
      return;
    }

    setDetail((current) => ({
      ...current,
      record: current.record ? { ...current.record, is_favorite: !current.record.is_favorite } : current.record,
    }));

    const { error } = await supabase.from("errors").update({ is_favorite: !record.is_favorite }).eq("id", record.id);
    if (error) {
      await refreshRecord();
      toast({ title: "Nao foi possivel atualizar favorito.", variant: "destructive" });
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!session?.access_token) {
      toast({ title: "Sessao expirada.", variant: "destructive" });
      return;
    }

    setGeneratingFlashcards(true);
    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ errorId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Erro ao gerar flashcards.");
      }

      await refreshFlashcards();
      toast({ title: `${payload.flashcards.length} novos flashcards criados.` });
    } catch (error) {
      toast({ title: "Erro ao gerar flashcards", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleGenerateSimilarQuestion = async () => {
    if (!session?.access_token) {
      toast({ title: "Sessao expirada.", variant: "destructive" });
      return;
    }

    setGeneratingSimilar(true);
    try {
      const response = await fetch("/api/generate-similar-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ errorId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Erro ao gerar questao semelhante.");
      }

      setLocalSimilarQuestion(payload.similarQuestion);
      toast({ title: "Nova questao semelhante gerada." });
    } catch (error) {
      toast({ title: "Erro ao gerar questao semelhante", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setGeneratingSimilar(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session?.access_token) {
      toast({ title: "Sessao expirada.", variant: "destructive" });
      return;
    }

    if (!selectedAnswer.trim() && !answerText.trim()) {
      toast({ title: "Informe a sua resposta antes de enviar.", variant: "destructive" });
      return;
    }

    setSubmittingAnswer(true);
    try {
      const response = await fetch("/api/submit-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          errorId,
          selectedAnswer,
          answerText,
          confidence: Number.parseInt(confidence, 10),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Erro ao enviar resposta.");
      }

      await Promise.all([refreshAttempts(), refreshRecord()]);
      toast({
        title: payload.isCorrect ? "Resposta correta." : "Resposta enviada.",
        description: payload.feedback?.headline,
      });
    } catch (error) {
      toast({ title: "Erro ao enviar resposta", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pb-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-20 pb-24">
        <p className="mb-4 text-muted-foreground">Questao nao encontrada.</p>
        <Button onClick={() => router.push("/errors")}>Voltar ao caderno</Button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/errors")} className="shadow-card flex h-10 w-10 items-center justify-center rounded-xl bg-card">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-heading text-xl font-bold text-foreground">Questao</h1>
          <button
            onClick={toggleFavorite}
            className={`ml-auto flex h-10 w-10 items-center justify-center rounded-xl ${
              record.is_favorite ? "bg-accent/10 text-accent" : "bg-card text-muted-foreground"
            }`}
          >
            <Heart className={`h-4 w-4 ${record.is_favorite ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="shadow-card space-y-4 rounded-2xl bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            {record.theme && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{record.theme}</span>}
            {record.difficulty && (
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {DIFFICULTY_LABELS[record.difficulty] || record.difficulty}
              </span>
            )}
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{record.status}</span>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">{record.title || "Questao sem titulo"}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{record.question_text || "Sem texto registrado."}</p>
          </div>

          {detail.attachmentUrl && (
            record.attachment_mime_type?.startsWith("image/") ? (
              <Image
                src={detail.attachmentUrl}
                alt="Anexo da questao"
                width={1200}
                height={900}
                unoptimized
                className="w-full rounded-2xl border border-border"
              />
            ) : (
              <a
                href={detail.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{record.attachment_name || "Abrir anexo"}</p>
                  <p className="text-xs text-muted-foreground">PDF salvo no Supabase Storage</p>
                </div>
              </a>
            )
          )}
        </div>

        <Section title="Enviar resposta" icon={<Target className="h-4 w-4 text-primary" />} defaultOpen>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Alternativa escolhida</Label>
              <Input value={selectedAnswer} onChange={(event) => setSelectedAnswer(event.target.value)} placeholder="Ex: C" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Confianca</Label>
              <Select value={confidence} onValueChange={setConfidence}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Quao seguro voce estava?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Quase chutei</SelectItem>
                  <SelectItem value="2">2 - Pouca confianca</SelectItem>
                  <SelectItem value="3">3 - Media confianca</SelectItem>
                  <SelectItem value="4">4 - Boa confianca</SelectItem>
                  <SelectItem value="5">5 - Muita confianca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Seu raciocinio</Label>
            <Textarea
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="Escreva por que voce escolheu essa resposta."
              className="min-h-[100px] bg-background"
            />
          </div>

          <Button onClick={handleSubmitAnswer} className="gradient-primary w-full gap-2" disabled={submittingAnswer}>
            {submittingAnswer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {submittingAnswer ? "Enviando..." : "Salvar tentativa"}
          </Button>
        </Section>

        {analysis ? (
          <>
            <Section title="Resumo da questao" icon={<Brain className="h-4 w-4 text-primary" />} defaultOpen>
              <p>{analysis.question_summary}</p>
            </Section>

            <Section
              title="Alternativa correta"
              icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
              defaultOpen
              badge={
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                  {analysis.correct_alternative}
                </span>
              }
            >
              <p>{record.correct_option_explanation || analysis.correct_option_explanation}</p>
            </Section>

            <Section title="Alternativas erradas" icon={<BookOpen className="h-4 w-4 text-primary" />} defaultOpen>
              {wrongOptions.length > 0 ? (
                wrongOptions.map((item) => (
                  <div key={`${item.alternative}-${item.explanation}`} className="rounded-xl border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-foreground">{item.alternative}</p>
                    <p>{item.explanation}</p>
                    <p className="text-xs italic text-primary">Erro comum: {item.misconception}</p>
                  </div>
                ))
              ) : (
                <p>Nenhuma desmontagem adicional foi salva para esta questao.</p>
              )}
            </Section>

            <Section title="Resumo teorico" icon={<BookOpen className="h-4 w-4 text-primary" />} defaultOpen>
              <p>{record.theoretical_summary || analysis.theoretical_summary}</p>
              {analysis.study_takeaways.length > 0 && (
                <ul className="list-disc space-y-1 pl-5">
                  {analysis.study_takeaways.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title={`Flashcards (${detail.flashcards.length})`}
              icon={<CreditCard className="h-4 w-4 text-primary" />}
              defaultOpen
            >
              <div className="space-y-3">
                {detail.flashcards.length === 0 ? (
                  <p>Nenhum flashcard salvo ainda.</p>
                ) : (
                  detail.flashcards.map((flashcard) => <FlashcardPreview key={flashcard.id} front={flashcard.front} back={flashcard.back} />)
                )}

                <button
                  onClick={handleGenerateFlashcards}
                  disabled={generatingFlashcards}
                  className="w-full rounded-xl border-2 border-dashed border-primary/30 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    {generatingFlashcards ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Gerar mais flashcards
                      </>
                    )}
                  </span>
                </button>

                <Button variant="outline" onClick={() => router.push("/review")} className="w-full">
                  Revisar flashcards
                </Button>
              </div>
            </Section>

            <Section title="Questao semelhante" icon={<Sparkles className="h-4 w-4 text-primary" />} defaultOpen>
              {similarQuestion ? (
                <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                  <p className="font-medium text-foreground">{similarQuestion.prompt}</p>
                  <div className="space-y-1">
                    {similarQuestion.options.map((option, index) => (
                      <p key={`${option}-${index}`}>{option}</p>
                    ))}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Gabarito: {similarQuestion.correct_alternative}</p>
                  <p>{similarQuestion.explanation}</p>
                </div>
              ) : (
                <p>Nenhuma questao semelhante foi gerada ainda.</p>
              )}

              <Button variant="outline" onClick={handleGenerateSimilarQuestion} disabled={generatingSimilar} className="w-full">
                {generatingSimilar ? "Gerando..." : "Gerar nova questao semelhante"}
              </Button>
            </Section>
          </>
        ) : (
          <div className="shadow-card rounded-2xl bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Esta questao foi salva sem analise de IA.</p>
          </div>
        )}

        <Section title={`Historico de desempenho (${detail.attempts.length})`} icon={<Target className="h-4 w-4 text-primary" />} defaultOpen>
          {detail.attempts.length === 0 ? (
            <p>Nenhuma tentativa registrada ainda.</p>
          ) : (
            detail.attempts.map((attempt) => {
              const feedback = attempt.feedback as { headline?: string; recommendation?: string } | null;
              return (
                <div key={attempt.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                        attempt.is_correct ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {attempt.is_correct ? "Correta" : "Rever"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(attempt.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {attempt.selected_answer && <p className="mt-2 text-sm text-foreground">Alternativa: {attempt.selected_answer}</p>}
                  {attempt.answer_text && <p className="mt-1 text-sm text-muted-foreground">{attempt.answer_text}</p>}
                  {feedback?.headline && <p className="mt-2 text-sm font-medium text-foreground">{feedback.headline}</p>}
                  {feedback?.recommendation && <p className="text-sm text-muted-foreground">{feedback.recommendation}</p>}
                </div>
              );
            })
          )}
        </Section>
      </motion.div>
    </div>
  );
};

export default AnalysisResultPage;
