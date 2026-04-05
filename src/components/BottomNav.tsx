"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Plus, User } from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/errors", icon: BookOpen, label: "Questoes" },
  { to: "/add-error", icon: Plus, label: "Nova", isMain: true },
  { to: "/stats", icon: BarChart3, label: "Dados" },
  { to: "/profile", icon: User, label: "Perfil" },
];

const BottomNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.to;
          const Icon = tab.icon;

          if (tab.isMain) {
            return (
              <Link key={tab.to} href={tab.to} className="flex flex-col items-center -mt-5">
                <div className="gradient-primary shadow-elevated flex h-14 w-14 items-center justify-center rounded-2xl">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="mt-1 text-[10px] text-muted-foreground">{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link key={tab.to} href={tab.to} className="flex flex-col items-center px-3 py-1">
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`mt-1 text-[10px] ${isActive ? "font-medium text-primary" : "text-muted-foreground"}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
