import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getTransporter, appendToSentBox } from "@/lib/mailer";
import { logEmail } from "@/lib/logger";
import { resolveAttachmentPath } from "@/lib/attachments";
import { htmlToText } from "html-to-text";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { campaignId, recipient, html, subject, attachments, attempt, overrideTo } = await request.json();

    const targetTo = overrideTo ? overrideTo : recipient.to;
    const targetCc = overrideTo ? [] : recipient.cc;

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
      to: targetTo,
      cc: targetCc,
      subject: subject,
      html: html,
      text: htmlToText(html, { wordwrap: 130 }),
      headers: {
        "X-Mailer": "Instabroad Mailer v1.0",
        "X-Priority": "3 (Normal)",
        "Importance": "Normal"
      },
      attachments: processedAttachments
    };

    let responseStr = "Success";
    try {
      const info = await transporter.sendMail(mailOptions);
      responseStr = info.response || "Success";
      
      // Async IMAP Sent box synchronization
      appendToSentBox({
        from: mailOptions.from,
        to: mailOptions.to,
        cc: mailOptions.cc,
        subject: mailOptions.subject,
        html: mailOptions.html
      }).catch(err => console.error("IMAP Sent sync error:", err));
      
      await logEmail(campaignId, {
        university: recipient.university,
        to: overrideTo ? `${targetTo} (Test Mode: intended for ${recipient.to})` : recipient.to,
        cc: recipient.cc,
        status: "Sent",
        attempts: attempt,
        response: responseStr
      });

      return NextResponse.json({ success: true, timestamp: Date.now() });
    } catch (sendError) {
      console.error("Nodemailer send error:", sendError);
      responseStr = sendError.message;
      
      await logEmail(campaignId, {
        university: recipient.university,
        to: recipient.to,
        cc: recipient.cc,
        status: "Failed",
        attempts: attempt,
        response: responseStr
      }).catch(() => {});

      return NextResponse.json({ error: sendError.message || "Failed to send email", timestamp: Date.now() }, { status: 500 });
    }
  } catch (error) {
    console.error("Send-email API top-level error:", error);
    return NextResponse.json({ error: error.message || "Server error", timestamp: Date.now() }, { status: 500 });
  }
}
