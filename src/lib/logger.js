import fs from "fs/promises";
import path from "path";
import os from "os";

export async function logEmail(campaignId, data) {
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

  try {
    const logDir = path.join(process.cwd(), "logs");
    await fs.mkdir(logDir, { recursive: true }).catch(() => {});
    const logFile = path.join(logDir, `campaign-${campaignId}.csv`);
    
    const fileExists = await fs.access(logFile).then(() => true).catch(() => false);
    if (!fileExists) {
      const header = "Time,University,To,CC,Status,Attempts,SMTP Response\n";
      await fs.writeFile(logFile, header, "utf-8");
    }

    await fs.appendFile(logFile, row, "utf-8");
  } catch (err) {
    // Vercel serverless read-only filesystem fallback to /tmp
    try {
      const tmpDir = path.join(os.tmpdir(), "instabroad_logs");
      await fs.mkdir(tmpDir, { recursive: true }).catch(() => {});
      const tmpLogFile = path.join(tmpDir, `campaign-${campaignId}.csv`);
      const fileExists = await fs.access(tmpLogFile).then(() => true).catch(() => false);
      if (!fileExists) {
        await fs.writeFile(tmpLogFile, "Time,University,To,CC,Status,Attempts,SMTP Response\n", "utf-8");
      }
      await fs.appendFile(tmpLogFile, row, "utf-8");
    } catch (e) {
      console.log(`[CAMPAIGN LOG] ${data.university} -> ${data.to} (${data.status}): ${data.response}`);
    }
  }
}
