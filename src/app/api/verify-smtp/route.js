import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { verifySmtp } from "@/lib/mailer";

export async function GET() {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await verifySmtp();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "SMTP verification failed", details: error.message }, { status: 500 });
  }
}
