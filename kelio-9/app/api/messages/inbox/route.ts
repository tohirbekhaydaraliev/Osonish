import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Ish beruvchining barcha e'lonlariga tushgan xabarlarni, nomzod bo'yicha guruhlab qaytaradi.
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId majburiy" }, { status: 400 });
  }

  const { data: messages, error } = await supabase
    .from("job_messages")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // job_id + sender_id bo'yicha eng so'nggi xabarni guruhlash
  const grouped = new Map<string, any>();
  for (const m of messages || []) {
    const key = `${m.job_id}_${m.sender_id}`;
    if (!grouped.has(key)) grouped.set(key, m);
  }

  const items = [];
  for (const m of grouped.values()) {
    const { data: job } = await supabase.from("jobs").select("title").eq("id", m.job_id).single();
    const { data: senderData } = await supabase.auth.admin.getUserById(m.sender_id);
    items.push({
      job_id: m.job_id,
      job_title: job?.title || "Noma'lum vakansiya",
      sender_id: m.sender_id,
      sender_email: senderData?.user?.email || "Noma'lum foydalanuvchi",
      last_message: m.content,
      last_message_at: m.created_at,
    });
  }

  items.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  return NextResponse.json({ items });
}
