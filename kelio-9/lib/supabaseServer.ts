import { createClient } from "@supabase/supabase-js";

// DIQQAT: bu fayl faqat server (API route) ichida import qilinadi — hech qachon
// "use client" komponentga import qilmang. SUPABASE_SERVICE_ROLE_KEY (secret key)
// brauzerga hech qachon yuborilmaydi, chunki Next.js API route'lar faqat serverda ishlaydi.

// Fallback qiymatlar — Vercel muhit o'zgaruvchilari noto'g'ri sozlansa ham
// ilova ishlashi uchun. Muhit o'zgaruvchisi mavjud bo'lsa, u ustunlik qiladi.
const FALLBACK_URL = "https://xlzxweeekxijddoqndud.supabase.co";
const FALLBACK_SERVICE_KEY = "sb_secret_E_kc-1n2Mae15MF4MS-5dw_B0TD7o3A";

export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE_KEY;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
