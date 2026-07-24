import fs from "fs/promises";
import path from "path";

export async function logEmail(campaignId, data) {
  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logDir, `campaign-${campaignId}.csv`);
  
  const fileExists = await fs.access(logFile).then(() => true).catch(() => false);
  if (!fileExists) {
    const header = "Time,University,To,CC,Status,Attempts,SMTP Response\n";
    await fs.writeFile(logFile, header, "utf-8");
  }

  const escapeCSV = (str) => `"${String(str || "").replace(/"/g, '""')}"`;
  const time = new Date().toISOString();
  
  const row = [
    time,
    escapeCSV(data.university),
    escapeCSV(data.to),
    escapeCSV((data.cc || []).join(", ")),
    escapeCSV(data.status),
    data.attempts || 1,
    escapeCSV(data.response)
  ].join(",") + "\n";

  await fs.appendFile(logFile, row, "utf-8");
}
