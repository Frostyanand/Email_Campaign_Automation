import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default async function Home() {
  const isAuth = await isAuthenticated();
  
  if (isAuth) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
