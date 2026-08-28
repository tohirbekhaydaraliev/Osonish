import { NextRequest, NextResponse } from "next/server";

const BASE_SYSTEM_PROMPT = `Sen OsonIsh AI ismli AI karyera agentisan. Foydalanuvchi bilan o'zbek tilida, to'g'ridan-to'g'ri, xotirjam, tahliliy va ishonchli ohangda gaplashasan. Emoji ishlatma, soxta ishtiyoq va umumiy motivatsion iboralarni ishlatma. Har safar FAQAT bitta savol ber. Javoblaring 1-3 ta qisqa gapdan iborat bo'lsin. Maqsading: foydalanuvchining ko'nikmalari, qiziqishlari, ish muhiti afzalligi, maosh kutilmasi, joylashuv/masofaviy ish afzalligi va 3-5 yillik maqsadini bilib olish.

Agar foydalanuvchi biror lavozim haqida so'rasa yoki pastda unga mavjud haqiqiy vakansiyalar ro'yxati berilgan bo'lsa, faqat umumiy gap bilan cheklanma — o'sha ro'yxatdagi aniq ma'lumotlarga (masofa, maosh oralig'i, ish rejimi, kompaniya) tayangan holda, nima uchun aynan shu vakansiya(lar) mos yoki mos emasligini chuqur, konkret tahlil qilib tushuntir. Masalan, agar bir necha vakansiya yaqinroq yoki maoshi yaxshiroq bo'lsa, buni aniq solishtirib ber. Ro'yxatda bo'lmagan ma'lumotni o'ylab topma.`;

// Fallback qiymat — Vercel muhit o'zgaruvchisi noto'g'ri sozlansa ham ishlashi uchun.
// Bu fayl faqat SERVERDA ishlaydi (Next.js API route) — brauzerga hech qachon chiqmaydi.
const FALLBACK_ANTHROPIC_KEY = "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";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || FALLBACK_ANTHROPIC_KEY;
  try {
    const { messages, nearbyJobs } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages massiv bo'lishi kerak" }, { status: 400 });
    }

    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (Array.isArray(nearbyJobs) && nearbyJobs.length > 0) {
      const jobsList = nearbyJobs
        .slice(0, 15)
        .map(
          (j: any, i: number) =>
            `${i + 1}. "${j.title}" — ${j.company || "kompaniya noma'lum"} · ${j.mode} · $${j.salary_min}-$${j.salary_max} · foydalanuvchidan taxminan ${j.distanceKm} km`
        )
        .join("\n");
      systemPrompt += `\n\nFoydalanuvchiga hozir xaritada ko'rinayotgan haqiqiy vakansiyalar ro'yxati (masofalar foydalanuvchining joriy joylashuvidan hisoblangan):\n${jobsList}`;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Anthropic API xatosi" },
        { status: res.status }
      );
    }

    const text =
      data.content?.map((b: any) => b.text || "").join("\n").trim() ||
      "Javob bo'sh keldi.";

    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server xatosi" }, { status: 500 });
  }
}
