import { redirect } from "next/navigation";

/** Legacy RX-8 demo dashboard — removed from production. */
export default function DemoPage() {
  redirect("/");
}
