import DashboardClient from "./DashboardClient";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    redirect("/login");
  }

  return <DashboardClient />;
}
