import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getTransporter } from "@/lib/mailer";
import path from "path";
import { htmlToText } from "html-to-text";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { html, subject, attachments } = await request.json();

    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL, // Test email goes to admin
      subject: subject || "Test Email",
      html: html,
      text: htmlToText(html),
      attachments: (attachments || []).map(filename => ({
        filename,
        path: path.join(process.cwd(), "storage", "attachments", filename)
      }))
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Test email failed", details: error.message }, { status: 500 });
  }
}
