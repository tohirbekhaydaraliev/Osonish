"use client";

import { createClient } from "@supabase/supabase-js";

// Fallback qiymatlar — to'g'ridan-to'g'ri kod ichiga yozilgan, shunda
// Vercel Environment Variables noto'g'ri sozlansa ham ilova ishlayveradi.
// Muhit o'zgaruvchisi mavjud bo'lsa, u ustunlik qiladi.
const FALLBACK_URL = "https://xlzxweeekxijddoqndud.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_UD7fK6LL3zBZ5_3gme8ntA_NUZd36Lb";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

export const supabaseConfigured = true;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
