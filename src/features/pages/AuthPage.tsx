"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Mail, Stethoscope, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type AuthView = "login" | "signup" | "forgot";

const AuthPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { signIn, signUp, resetPassword } = useAuth();
  const nextPath = searchParams.get("next") || "/";

  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message,
        variant: "destructive",
      });
      return;
    }

    router.push(nextPath);
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "As senhas nao coincidem", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Conta criada", description: "Verifique seu email para confirmar o acesso." });
    router.push(nextPath);
  };

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao enviar email", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Link enviado", description: "Confira sua caixa de entrada." });
    setView("login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="gradient-hero mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl">
            <Stethoscope className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">FixaR1</h1>
          <p className="mt-1 text-sm text-muted-foreground">Transforme erros em aprovacao</p>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <Button type="submit" className="gradient-primary w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setView("forgot")} className="text-primary hover:underline">
                Esqueci minha senha
              </button>
              <button type="button" onClick={() => setView("signup")} className="text-primary hover:underline">
                Criar conta
              </button>
            </div>
          </form>
        )}

        {view === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <button type="button" onClick={() => setView("login")} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="fullName" placeholder="Seu nome" value={fullName} onChange={(event) => setFullName(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="signupEmail" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupPassword">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="signupPassword" type="password" placeholder="Minimo de 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="confirmPassword" type="password" placeholder="Repita a senha" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <Button type="submit" className="gradient-primary w-full" disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <button type="button" onClick={() => setView("login")} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <p className="text-sm text-muted-foreground">Informe seu email para receber o link de recuperacao.</p>

            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="forgotEmail" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10" required />
              </div>
            </div>

            <Button type="submit" className="gradient-primary w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
