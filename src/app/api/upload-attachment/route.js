import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveAttachment, deleteAttachmentFile } from "@/lib/attachments";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const savedFiles = [];

    for (const file of files) {
      if (typeof file === "string") continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = file.name;
      saveAttachment(filename, buffer);
      savedFiles.push(filename);
    }

    return NextResponse.json({ success: true, files: savedFiles });
  } catch (error) {
    console.error("Attachment upload error:", error);
    return NextResponse.json({ error: "Failed to upload attachments", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { filename } = await request.json();
    if (!filename) return NextResponse.json({ error: "Filename required" }, { status: 400 });

    deleteAttachmentFile(filename);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete attachment", details: error.message }, { status: 500 });
  }
}
