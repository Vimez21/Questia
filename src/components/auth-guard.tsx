"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/auth${next}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export function GuestOnly({
  children,
  allowAuthenticated = false,
}: {
  children: React.ReactNode;
  allowAuthenticated?: boolean;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && !allowAuthenticated) {
      router.replace("/");
    }
  }, [allowAuthenticated, loading, router, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && !allowAuthenticated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
