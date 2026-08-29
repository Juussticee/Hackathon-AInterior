import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  // Only available in development — never expose in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  // Even in dev, require admin auth
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (userRole !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const key = process.env.AINTERIOR_GEMINI_KEY || process.env.GEMINI_API_KEY || "";
  const keyPreview = key ? key.slice(0, 12) + "..." : "MISSING";

  if (!key) {
    return NextResponse.json({ ok: false, key_preview: keyPreview, error: "No API key found" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const r = await model.generateContent("Say: AI pipeline ready");
    return NextResponse.json({
      ok: true,
      key_used: keyPreview,
      response: r.response.text().trim(),
    });
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      key_used: keyPreview,
      error: String(e).slice(0, 300),
    }, { status: 500 });
  }
}
