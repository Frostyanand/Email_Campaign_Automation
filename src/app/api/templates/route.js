import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const storagePath = path.join(process.cwd(), "storage");
    const templatesPath = path.join(storagePath, "templates");
    const attachmentsPath = path.join(storagePath, "attachments");

    const templateFiles = await fs.readdir(templatesPath).catch(() => []);
    const attachmentFiles = await fs.readdir(attachmentsPath).catch(() => []);

    const templates = [];
    for (const file of templateFiles) {
      if (file.endsWith(".json")) {
        const baseName = file.replace(".json", "");
        const htmlFile = `${baseName}.html`;
        
        if (templateFiles.includes(htmlFile)) {
          const jsonContent = await fs.readFile(path.join(templatesPath, file), "utf-8");
          const htmlContent = await fs.readFile(path.join(templatesPath, htmlFile), "utf-8");
          
          try {
            const metadata = JSON.parse(jsonContent);
            templates.push({
              id: baseName,
              html: htmlContent,
              ...metadata
            });
          } catch (e) {
            // skip invalid json
          }
        }
      }
    }

    const attachments = attachmentFiles.filter(f => f.endsWith(".pdf"));

    return NextResponse.json({ templates, attachments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}
