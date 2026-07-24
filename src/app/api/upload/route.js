import { NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/excel";
import { isAuthenticated } from "@/lib/auth";

export async function POST(request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check size limit: 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const results = parseExcelBuffer(buffer);

    return NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        ...results
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process Excel file" }, { status: 500 });
  }
}
