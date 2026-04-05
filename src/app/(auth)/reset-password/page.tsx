import { GuestOnly } from "@/components/auth-guard";
import { ResetPasswordPage } from "@/features/pages/ResetPasswordPage";

export default function ResetPasswordRoute() {
  return (
    <GuestOnly allowAuthenticated>
      <ResetPasswordPage />
    </GuestOnly>
  );
}
