"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";

const ProfilePage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { profile, user, signOut, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [examGoal, setExamGoal] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState("30");
  const [prioritySpecialties, setPrioritySpecialties] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setExamGoal(profile?.exam_goal || "");
    setWeeklyGoal(String(profile?.weekly_goal || 30));
    setPrioritySpecialties((profile?.priority_specialties || []).join(", "));
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setSaving(true);
    const specialties = prioritySpecialties
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName || null,
      exam_goal: examGoal || null,
      weekly_goal: Number.parseInt(weeklyGoal || "30", 10) || 30,
      priority_specialties: specialties,
    });

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar perfil", description: error.message, variant: "destructive" });
      return;
    }

    await refreshProfile();
    toast({ title: "Perfil atualizado." });
  };

  return (
    <div className="pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="shadow-card flex h-10 w-10 items-center justify-center rounded-xl bg-card">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="font-heading text-xl font-bold text-foreground">Perfil</h1>
        </div>

        <div className="gradient-hero flex items-center gap-4 rounded-2xl p-5 text-primary-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/15">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold">{fullName || "Estudante"}</h2>
            <p className="text-sm opacity-80">{user?.email}</p>
          </div>
        </div>

        <div className="shadow-card space-y-4 rounded-2xl bg-card p-5">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} className="bg-background" />
          </div>

          <div className="space-y-2">
            <Label>Prova ou residencia alvo</Label>
            <Input
              placeholder="Ex: R1 USP, R1 Unifesp, prova da SES-DF"
              value={examGoal}
              onChange={(event) => setExamGoal(event.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label>Meta semanal de questoes</Label>
            <Input value={weeklyGoal} onChange={(event) => setWeeklyGoal(event.target.value)} className="bg-background" />
          </div>

          <div className="space-y-2">
            <Label>Especialidades prioritarias</Label>
            <Textarea
              placeholder="Separe por virgula. Ex: Clinica Medica, Pediatria, Ginecologia"
              value={prioritySpecialties}
              onChange={(event) => setPrioritySpecialties(event.target.value)}
              className="min-h-[100px] bg-background"
            />
          </div>

          <Button onClick={handleSave} className="gradient-primary w-full gap-2" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar perfil"}
          </Button>
        </div>

        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
