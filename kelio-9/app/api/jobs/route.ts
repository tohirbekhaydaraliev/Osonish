import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

export async function POST(req: NextRequest) {
  const supabase = supabaseServer();
  try {
    const body = await req.json();
    const {
      title, company, salary_min, salary_max, mode, tag, lat, lng, created_by,
      image_url, phone, description,
    } = body;

    if (!title || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "title, lat va lng majburiy" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title,
        company,
        salary_min: salary_min || 0,
        salary_max: salary_max || 0,
        mode: mode || "Noma'lum",
        tag: tag || "Umumiy",
        lat,
        lng,
        match_score: Math.floor(75 + Math.random() * 20),
        source: "manual",
        created_by: created_by || null,
        image_url: image_url || null,
        phone: phone || null,
        description: description || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer();
  try {
    const body = await req.json();
    const {
      id, editor_id, title, company, salary_min, salary_max, mode, tag, lat, lng,
      image_url, phone, description,
    } = body;

    if (!id || !editor_id) {
      return NextResponse.json({ error: "id va editor_id majburiy" }, { status: 400 });
    }

    // Egalikni tekshirish: faqat e'lonni yaratgan foydalanuvchi tahrirlay oladi.
    const { data: existing, error: fetchError } = await supabase
      .from("jobs")
      .select("created_by")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Vakansiya topilmadi" }, { status: 404 });
    }
    if (existing.created_by !== editor_id) {
      return NextResponse.json(
        { error: "Faqat o'zingiz yaratgan e'lonni tahrirlashingiz mumkin" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("jobs")
      .update({
        title,
        company,
        salary_min: salary_min || 0,
        salary_max: salary_max || 0,
        mode: mode || "Noma'lum",
        tag: tag || "Umumiy",
        lat,
        lng,
        image_url: image_url || null,
        phone: phone || null,
        description: description || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = supabaseServer();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const editorId = searchParams.get("editor_id");

    if (!id || !editorId) {
      return NextResponse.json({ error: "id va editor_id majburiy" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("jobs")
      .select("created_by")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Vakansiya topilmadi" }, { status: 404 });
    }
    if (existing.created_by !== editorId) {
      return NextResponse.json(
        { error: "Faqat o'zingiz yaratgan e'lonni o'chirishingiz mumkin" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server xatosi" }, { status: 500 });
  }
}
