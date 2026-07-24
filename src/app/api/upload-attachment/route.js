import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const attachmentsDir = path.join(process.cwd(), "storage", "attachments");
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    const savedFiles = [];

    for (const file of files) {
      if (typeof file === "string") continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = file.name;
      const targetPath = path.join(attachmentsDir, filename);
      fs.writeFileSync(targetPath, buffer);
      savedFiles.push(filename);
    }

    return NextResponse.json({ success: true, files: savedFiles });
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload attachments" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { filename } = await request.json();
    if (!filename) return NextResponse.json({ error: "Filename required" }, { status: 400 });

    const filePath = path.join(process.cwd(), "storage", "attachments", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}
