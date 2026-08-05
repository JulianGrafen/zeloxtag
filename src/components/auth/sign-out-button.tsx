import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth/actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

/**
 * Server Action form — clears the Supabase session and returns to `/`.
 */
export function SignOutButton({
  className,
  label = "Abmelden",
}: SignOutButtonProps) {
  return (
    <form action={signOut}>
      <PressableButton
        type="submit"
        variant="button"
        className={
          className ??
          "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-white px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
        }
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {label}
      </PressableButton>
    </form>
  );
}
