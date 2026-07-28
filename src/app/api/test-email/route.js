import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getTransporter, appendToSentBox } from "@/lib/mailer";
import { resolveAttachmentPath } from "@/lib/attachments";
import { htmlToText } from "html-to-text";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { html, subject, attachments, to } = await request.json();

    const recipientList = to 
      ? to.split(",").map(e => e.trim()).filter(Boolean)
      : [process.env.ADMIN_EMAIL];

    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipientList.length > 0 ? recipientList : process.env.ADMIN_EMAIL,
      subject: `[TEST EMAIL] ${subject || "Test Email"}`,
      html: html,
      text: htmlToText(html),
      attachments: (attachments || []).map(filename => ({
        filename,
        path: resolveAttachmentPath(filename)
      }))
    };

    await transporter.sendMail(mailOptions);
    appendToSentBox({
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html
    }).catch(err => console.error("IMAP Sent sync error:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Test email failed", details: error.message }, { status: 500 });
  }
}
