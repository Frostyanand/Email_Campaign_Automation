import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getTransporter, appendToSentBox } from "@/lib/mailer";
import { resolveAttachmentPath } from "@/lib/attachments";
import { htmlToText } from "html-to-text";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { html, subject, attachments, to } = await request.json();

    const recipientList = to 
      ? to.split(",").map(e => e.trim()).filter(Boolean)
      : [process.env.ADMIN_EMAIL];

    const processedAttachments = (attachments || []).map(att => {
      if (typeof att === "string") {
        const diskPath = path.join(process.cwd(), "storage", "attachments", att);
        if (fs.existsSync(diskPath)) {
          return { filename: att, path: diskPath };
        }
        return { filename: att, path: resolveAttachmentPath(att) };
      } else if (att && att.content) {
        return {
          filename: att.filename,
          content: Buffer.from(att.content, "base64")
        };
      } else if (att && att.filename) {
        const diskPath = path.join(process.cwd(), "storage", "attachments", att.filename);
        if (fs.existsSync(diskPath)) {
          return { filename: att.filename, path: diskPath };
        }
        return { filename: att.filename, path: resolveAttachmentPath(att.filename) };
      }
      return null;
    }).filter(Boolean);

    const transporter = getTransporter();
    const mailOptions = {
      from: `"Instabroad Medical" <${process.env.SMTP_USER}>`,
      replyTo: process.env.SMTP_USER,
      to: recipientList.length > 0 ? recipientList : process.env.ADMIN_EMAIL,
      subject: subject || "Proposal for Exclusive Indian Student Admissions Partnership, Instabroad Medical",
      html: html,
      text: htmlToText(html, { wordwrap: 130 }),
      headers: {
        "X-Mailer": "Instabroad Mailer v1.0",
        "X-Priority": "3 (Normal)",
        "Importance": "Normal"
      },
      attachments: processedAttachments
    };

    await transporter.sendMail(mailOptions);
    await appendToSentBox({
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
