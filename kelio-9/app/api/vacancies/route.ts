import { NextRequest, NextResponse } from "next/server";

// ============================================
// Jooble API orqali real vaqtdagi vakansiyalar.
// Kalitni jooble.org/api/about orqali bepul olib,
// pastdagi JOOBLE_API_KEY o'zgaruvchisiga yoki
// Vercel Environment Variables'ga joylashtiring.
// ============================================

// Kalit kelgach shu yerga joylashtiring (yoki Vercel'da JOOBLE_API_KEY nomi bilan qo'shing):
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || "";

export async function GET(req: NextRequest) {
  if (!JOOBLE_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Jooble API kaliti hali sozlanmagan. jooble.org/api/about orqali bepul kalit oling va JOOBLE_API_KEY sifatida qo'shing.",
      },
      { status: 501 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const centerLat = parseFloat(searchParams.get("lat") || "41.2995");
    const centerLng = parseFloat(searchParams.get("lng") || "69.2401");

    const res = await fetch(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: query,
        location: "Uzbekistan",
      }),
    });

    if (!res.ok) {
      throw new Error("Jooble so'rovi muvaffaqiyatsiz: " + res.status);
    }
    const data = await res.json();

    const jobs = (data.jobs || []).map((v: any, i: number) => ({
      id: "jooble_" + (v.id || i),
      title: v.title,
      company: v.company || "",
      salary_min: 0,
      salary_max: 0,
      mode: v.type || "Noma'lum",
      tag: "Umumiy",
      // Jooble aniq koordinata bermaydi — markaz atrofida taxminiy joylashtiramiz.
      lat: centerLat + (Math.random() - 0.5) * 0.06,
      lng: centerLng + (Math.random() - 0.5) * 0.06,
      match_score: Math.floor(70 + Math.random() * 25),
      source: "jooble",
      external_url: v.link,
    }));

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Noma'lum xato" }, { status: 500 });
  }
}
