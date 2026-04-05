"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, FileText, Sparkles, Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ERROR_TYPE_OPTIONS, SPECIALTIES, SUPPORTED_FILE_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Tente novamente.");

function sanitizeFilename(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

const AddErrorPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { session } = useAuth();

  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [examBoard, setExamBoard] = useState("");
  const [errorType, setErrorType] = useState("");
  const [markedAnswer, setMarkedAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [userComment, setUserComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const sourceType = useMemo(() => {
    if (!selectedFile) {
      return "text";
    }
    return selectedFile.type === "application/pdf" ? "pdf" : "image";
  }, [selectedFile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!(file.type in SUPPORTED_FILE_TYPES)) {
      toast({ title: "Envie JPG, PNG, WEBP ou PDF.", variant: "destructive" });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande. Limite de 15 MB.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => setImagePreview((loadEvent.target?.result as string) || null);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (userId: string) => {
    if (!selectedFile) {
      return null;
    }

    const path = `${userId}/${Date.now()}-${sanitizeFilename(selectedFile.name)}`;
    const { error } = await supabase.storage.from("question-files").upload(path, selectedFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: selectedFile.type,
    });

    if (error) {
      throw new Error("Nao foi possivel enviar o anexo.");
    }

    return {
      path,
      name: selectedFile.name,
      mimeType: selectedFile.type,
      size: selectedFile.size,
    };
  };

  const saveQuestion = async (mode: "draft" | "analyze") => {
    if (!questionText.trim() && !selectedFile) {
      toast({ title: "Cole o texto da questao ou envie um arquivo.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Voce precisa estar autenticado.");
      }

      const uploadedFile = await uploadFile(user.id);

      if (mode === "draft") {
        const { error } = await supabase.from("errors").insert({
          user_id: user.id,
          title: title || null,
          question_text: questionText || null,
          specialty: specialty || null,
          subtopic: subtopic || null,
          exam_board: examBoard || null,
          error_type: errorType || null,
          marked_answer: markedAnswer || null,
          correct_answer: correctAnswer || null,
          user_comment: userComment || null,
          source_type: sourceType,
          attachment_path: uploadedFile?.path || null,
          attachment_name: uploadedFile?.name || null,
          attachment_mime_type: uploadedFile?.mimeType || null,
          attachment_size_bytes: uploadedFile?.size || null,
          status: "draft",
        });

        if (error) {
          throw error;
        }

        toast({ title: "Questao salva.", description: "Ela ficou disponivel no seu caderno." });
        router.push("/errors");
        return;
      }

      if (!session?.access_token) {
        throw new Error("Sessao expirada. Entre novamente.");
      }

      const response = await fetch("/api/analyze-error", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          questionText,
          specialty,
          subtopic,
          examBoard,
          errorType,
          markedAnswer,
          correctAnswer,
          userComment,
          sourceType,
          attachmentPath: uploadedFile?.path || null,
          attachmentName: uploadedFile?.name || null,
          attachmentMimeType: uploadedFile?.mimeType || null,
          attachmentSizeBytes: uploadedFile?.size || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Nao foi possivel analisar a questao.");
      }

      toast({ title: "Analise pronta.", description: "A IA estruturou sua revisao em segundos." });
      router.push(`/analysis/${payload.errorId}`);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao enviar questao", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="shadow-card flex h-10 w-10 items-center justify-center rounded-xl bg-card">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-heading text-xl font-bold text-foreground">Adicionar questao</h1>
        </div>

        <div className="gradient-hero rounded-2xl p-5 text-primary-foreground">
          <p className="text-sm opacity-80">Entrada premium</p>
          <h2 className="font-heading text-lg font-semibold">Texto, imagem ou PDF no mesmo fluxo</h2>
          <p className="mt-1 text-sm opacity-80">
            Envie a questao do jeito que ela chegou ate voce. O backend cuida do processamento e da analise.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setInputMode("text")}
            className={`rounded-xl py-3 text-sm font-medium transition-colors ${
              inputMode === "text" ? "gradient-primary text-primary-foreground" : "shadow-card bg-card text-muted-foreground"
            }`}
          >
            Texto
          </button>
          <button
            onClick={() => setInputMode("file")}
            className={`rounded-xl py-3 text-sm font-medium transition-colors ${
              inputMode === "file" ? "gradient-primary text-primary-foreground" : "shadow-card bg-card text-muted-foreground"
            }`}
          >
            Imagem ou PDF
          </button>
        </div>

        <div className="shadow-card space-y-4 rounded-2xl bg-card p-5">
          <div className="space-y-2">
            <Label>Titulo opcional</Label>
            <Input
              placeholder="Ex: Pneumonia comunitaria na prova da USP"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="bg-background"
            />
          </div>

          {inputMode === "text" ? (
            <div className="space-y-2">
              <Label>Texto da questao</Label>
              <Textarea
                placeholder="Cole o enunciado, alternativas e qualquer observacao relevante."
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                className="min-h-[180px] bg-background"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!selectedFile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-primary/20 bg-background p-8"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Upload className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Toque para enviar imagem ou PDF</p>
                    <p className="text-xs text-muted-foreground">Arquivos ate 15 MB</p>
                  </div>
                </button>
              )}

              {selectedFile && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  {imagePreview ? (
                    <div className="relative overflow-hidden rounded-xl">
                      <Image src={imagePreview} alt="Preview da questao" width={1200} height={900} unoptimized className="w-full rounded-xl" />
                      <button
                        onClick={resetFile}
                        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 backdrop-blur"
                      >
                        <X className="h-4 w-4 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                        {selectedFile.type === "application/pdf" ? (
                          <FileText className="h-6 w-6 text-primary" />
                        ) : (
                          <Camera className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile.type === "application/pdf" ? "PDF" : "Imagem"} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button onClick={resetFile} className="rounded-lg bg-secondary p-2">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-2">
            <Label>Especialidade</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Selecione a especialidade" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subtopico</Label>
            <Input placeholder="Ex: Asma" value={subtopic} onChange={(event) => setSubtopic(event.target.value)} className="bg-card" />
          </div>

          <div className="space-y-2">
            <Label>Banca</Label>
            <Input placeholder="Ex: USP" value={examBoard} onChange={(event) => setExamBoard(event.target.value)} className="bg-card" />
          </div>

          <div className="space-y-2">
            <Label>Alternativa marcada</Label>
            <Input placeholder="Ex: B" value={markedAnswer} onChange={(event) => setMarkedAnswer(event.target.value)} className="bg-card" />
          </div>

          <div className="space-y-2">
            <Label>Alternativa correta</Label>
            <Input placeholder="Ex: D" value={correctAnswer} onChange={(event) => setCorrectAnswer(event.target.value)} className="bg-card" />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Situacao da resposta</Label>
            <Select value={errorType} onValueChange={setErrorType}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Selecione o contexto" />
              </SelectTrigger>
              <SelectContent>
                {ERROR_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Comentario do aluno</Label>
            <Textarea
              placeholder="Registre o raciocinio que te levou a essa resposta."
              value={userComment}
              onChange={(event) => setUserComment(event.target.value)}
              className="min-h-[110px] bg-card"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={() => void saveQuestion("analyze")} className="gradient-hero w-full gap-2" size="lg" disabled={loading}>
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Analisar com IA
              </>
            )}
          </Button>

          <Button onClick={() => void saveQuestion("draft")} variant="outline" className="w-full" size="lg" disabled={loading}>
            Salvar sem analise
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddErrorPage;
