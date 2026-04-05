import { AuthGuard } from "@/components/auth-guard";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-6">{children}</div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
