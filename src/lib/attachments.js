import fs from "fs";
import path from "path";
import os from "os";

export function getAttachmentsDirs() {
  const repoDir = path.join(process.cwd(), "storage", "attachments");
  const tmpDir = path.join(os.tmpdir(), "instabroad_attachments");
  
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch (e) {}
  }
  return { repoDir, tmpDir };
}

export function saveAttachment(filename, buffer) {
  const { repoDir, tmpDir } = getAttachmentsDirs();
  
  // Try writing to repoDir first (works in local dev), fallback to tmpDir (Vercel serverless read-only filesystem)
  try {
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }
    const targetPath = path.join(process.cwd(), "storage", "attachments", filename);
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  } catch (err) {
    const targetPath = path.join(tmpDir, filename);
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }
}

export function resolveAttachmentPath(filename) {
  const { tmpDir } = getAttachmentsDirs();
  
  const repoPath = path.join(process.cwd(), "storage", "attachments", filename);
  if (fs.existsSync(repoPath)) return repoPath;
  
  const tmpPath = path.join(tmpDir, filename);
  if (fs.existsSync(tmpPath)) return tmpPath;
  
  return repoPath;
}

export function listAllAttachments() {
  const { tmpDir } = getAttachmentsDirs();
  const repoDir = path.join(process.cwd(), "storage", "attachments");
  const set = new Set();
  
  if (fs.existsSync(repoDir)) {
    try {
      fs.readdirSync(repoDir).forEach(f => {
        if (f.endsWith(".pdf")) set.add(f);
      });
    } catch (e) {}
  }
  
  if (fs.existsSync(tmpDir)) {
    try {
      fs.readdirSync(tmpDir).forEach(f => {
        if (f.endsWith(".pdf")) set.add(f);
      });
    } catch (e) {}
  }
  
  return Array.from(set);
}

export function deleteAttachmentFile(filename) {
  const { tmpDir } = getAttachmentsDirs();
  const repoPath = path.join(process.cwd(), "storage", "attachments", filename);
  const tmpPath = path.join(tmpDir, filename);
  
  try {
    if (fs.existsSync(repoPath)) fs.unlinkSync(repoPath);
  } catch (e) {}
  
  try {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  } catch (e) {}
}
