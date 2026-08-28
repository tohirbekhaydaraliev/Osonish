import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/messages?jobId=...&userId=...&otherId=...
// Ikki foydalanuvchi (userId va otherId) orasidagi, aynan shu jobId bo'yicha yozishmalarni qaytaradi.
export async function GET(req: NextRequest) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const userId = searchParams.get("userId");
  const otherId = searchParams.get("otherId");

  if (!jobId || !userId || !otherId) {
    return NextResponse.json({ error: "jobId, userId, otherId majburiy" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("job_messages")
    .select("*")
    .eq("job_id", jobId)
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  try {
    const body = await req.json();
    const { job_id, sender_id, recipient_id, content } = body;

    if (!job_id || !sender_id || !recipient_id || !content) {
      return NextResponse.json(
        { error: "job_id, sender_id, recipient_id, content majburiy" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("job_messages")
      .insert({ job_id, sender_id, recipient_id, content })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server xatosi" }, { status: 500 });
  }
}
