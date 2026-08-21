import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Registrieren · ZeloxTag",
  description: "ZeloxTag-Konto erstellen.",
};

/** `/register` → home signup tab. */
export default function RegisterPage() {
  redirect("/?tab=signup");
}
