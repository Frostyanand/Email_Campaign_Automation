import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

export function getTransporter() {
  const host = (process.env.SMTP_HOST || "smtpout.secureserver.net").trim();
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

export async function verifySmtp() {
  const transporter = getTransporter();
  return new Promise((resolve, reject) => {
    transporter.verify((error, success) => {
      if (error) {
        reject(error);
      } else {
        resolve(success);
      }
    });
  });
}

export async function appendToSentBox({ from, to, cc, subject, html }) {
  try {
    const imapHost = process.env.IMAP_HOST || "imap.secureserver.net";
    const imapPort = parseInt(process.env.IMAP_PORT || "993", 10);
    const user = (process.env.SMTP_USER || "").trim();
    const pass = (process.env.SMTP_PASS || "").trim();

    if (!user || !pass) return;

    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: true,
      auth: { user, pass },
      logger: false,
      emitLogs: false
    });

    await client.connect();

    let targetBox = "Sent";
    try {
      const list = await client.list();
      const sentBox = list.find(b => b.specialUse === "\\Sent" || b.name.toLowerCase() === "sent" || b.name.toLowerCase() === "sent items");
      if (sentBox) targetBox = sentBox.path;
    } catch (e) {
      console.warn("IMAP folder list fallback to Sent");
    }

    const toStr = Array.isArray(to) ? to.join(", ") : to;
    const ccStr = Array.isArray(cc) && cc.length > 0 ? `Cc: ${cc.join(", ")}\r\n` : "";
    const dateStr = new Date().toUTCString();

    const rawMessage = 
`From: ${from}\r\n` +
`To: ${toStr}\r\n` +
`${ccStr}` +
`Subject: ${subject}\r\n` +
`Date: ${dateStr}\r\n` +
`Content-Type: text/html; charset=utf-8\r\n\r\n` +
`${html}`;

    await client.append(targetBox, Buffer.from(rawMessage), ["\\Seen"]);
    await client.logout();
    console.log(`[IMAP Sync] Successfully synced email to Titan ${targetBox} for ${toStr}`);
  } catch (err) {
    console.error("IMAP Sent Sync Error:", err.message);
  }
}
