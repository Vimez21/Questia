"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "As senhas nao coincidem", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao atualizar senha", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Senha atualizada", description: "Voce ja pode entrar com a nova senha." });
    router.push("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="gradient-hero mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
            <Stethoscope className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Defina uma nova senha para continuar estudando.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <button type="button" onClick={() => router.push("/auth")} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="newPassword" type="password" placeholder="Minimo de 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="confirmNewPassword" type="password" placeholder="Repita a nova senha" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="pl-10" required />
            </div>
          </div>

          <Button type="submit" className="gradient-primary w-full" disabled={loading}>
            {loading ? "Atualizando..." : "Salvar nova senha"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
