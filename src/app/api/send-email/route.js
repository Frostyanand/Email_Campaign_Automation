import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getTransporter, appendToSentBox } from "@/lib/mailer";
import { logEmail } from "@/lib/logger";
import { resolveAttachmentPath } from "@/lib/attachments";
import { htmlToText } from "html-to-text";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { campaignId, recipient, html, subject, attachments, attempt, overrideTo } = await request.json();

    const targetTo = overrideTo ? overrideTo : recipient.to;
    const targetCc = overrideTo ? [] : recipient.cc;

    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: targetTo,
      cc: targetCc,
      subject: overrideTo ? `[TEST MODE] ${subject}` : subject,
      html: html,
      text: htmlToText(html),
      attachments: (attachments || []).map(filename => ({
        filename,
        path: resolveAttachmentPath(filename)
      }))
    };

    let responseStr = "Success";
    try {
      const info = await transporter.sendMail(mailOptions);
      responseStr = info.response;
      
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
      responseStr = sendError.message;
      
      await logEmail(campaignId, {
        university: recipient.university,
        to: recipient.to,
        cc: recipient.cc,
        status: "Failed",
        attempts: attempt,
        response: responseStr
      });

      return NextResponse.json({ error: sendError.message, timestamp: Date.now() }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Server error", timestamp: Date.now() }, { status: 500 });
  }
}
