import { GuestOnly } from "@/components/auth-guard";
import AuthPage from "@/features/pages/AuthPage";

export default function AuthRoute() {
  return (
    <GuestOnly>
      <AuthPage />
    </GuestOnly>
  );
}
