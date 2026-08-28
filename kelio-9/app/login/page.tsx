"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, last_name: lastName } },
        });
        if (error) throw error;

        if (data.session) {
          // Email tasdiqlash o'chirilgan — darhol kirdi.
          await supabase.from("profiles").upsert({
            id: data.session.user.id,
            full_name: `${firstName} ${lastName}`.trim(),
          });
          router.push("/app");
        } else if (data.user && !data.session) {
          // Supabase'da "Confirm email" yoqilgan holat.
          setInfo(
            "Hisob yaratildi, lekin kirish uchun emailingizga yuborilgan tasdiqlash havolasini bosishingiz kerak. " +
            "Agar bu ortiqcha deb hisoblasangiz, Supabase -> Authentication -> Providers -> Email -> \"Confirm email\" ni o'chiring."
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) router.push("/app");
      }
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "facebook" | "twitter") {
    setError("");
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) throw error;
      // Muvaffaqiyatli bo'lsa, brauzer avtomatik provayder sahifasiga yo'naltiriladi.
    } catch (err: any) {
      setError(err.message || `${provider} orqali kirishda xatolik`);
      setOauthLoading("");
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <img src="/logo.png" alt="OsonIsh AI" style={{ width: 64, height: 64, marginBottom: 8 }} />
        <div style={styles.logo}>OsonIsh AI</div>
        <div style={styles.tagline}>Ish qidirma. U bilan gaplash.</div>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            style={styles.oauthBtn}
            onClick={() => handleOAuth("google")}
            disabled={!!oauthLoading}
            type="button"
          >
            <GoogleIcon />
            {oauthLoading === "google" ? "Yo'naltirilmoqda..." : "Google orqali davom etish"}
          </button>
          <button
            style={{ ...styles.oauthBtn, background: "#1877F2", borderColor: "#1877F2", color: "#fff" }}
            onClick={() => handleOAuth("facebook")}
            disabled={!!oauthLoading}
            type="button"
          >
            <FacebookIcon />
            {oauthLoading === "facebook" ? "Yo'naltirilmoqda..." : "Facebook orqali davom etish"}
          </button>
          <button
            style={{ ...styles.oauthBtn, background: "#000", borderColor: "rgba(255,255,255,0.2)", color: "#fff" }}
            onClick={() => handleOAuth("twitter")}
            disabled={!!oauthLoading}
            type="button"
          >
            <XIcon />
            {oauthLoading === "twitter" ? "Yo'naltirilmoqda..." : "X orqali davom etish"}
          </button>
        </div>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>yoki email bilan</span>
          <div style={styles.dividerLine} />
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>ISM</label>
                <input
                  style={styles.input}
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Aziz"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>FAMILIYA</label>
                <input
                  style={styles.input}
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Karimov"
                />
              </div>
            </div>
          )}
          <label style={styles.label}>EMAIL</label>
          <input
            style={styles.input}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="siz@misol.uz"
          />
          <label style={styles.label}>PAROL</label>
          <input
            style={styles.input}
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && <div style={styles.error}>{error}</div>}
          {info && <div style={styles.info}>{info}</div>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Yuklanmoqda..." : mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <div
          style={styles.switch}
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
        >
          {mode === "login"
            ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting"
            : "Hisobingiz bormi? Kiring"}
        </div>

        <div
          style={{ ...styles.switch, color: "#9AA6B2", marginTop: 10 }}
          onClick={() => router.push("/app")}
        >
          ← Kirmasdan davom etish
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.68-3.87 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99h-2.54V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.6l-5.2-6.8L5.4 22H2.3l8.1-9.3L1.5 2h6.9l4.7 6.2L18.9 2zm-1.2 18h1.7L7.4 4h-1.8l12.1 16z"/>
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000814",
    padding: 20,
  },
  card: {
    width: 380,
    background: "#07111F",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 32,
  },
  logo: {
    fontFamily: "Manrope, sans-serif",
    fontWeight: 800,
    fontSize: 24,
    color: "#fff",
  },
  tagline: {
    fontSize: 13,
    color: "#9AA6B2",
    marginTop: 6,
  },
  oauthBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "#fff",
    color: "#141008",
    fontFamily: "Manrope, sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    fontSize: 11,
    color: "#9AA6B2",
    fontFamily: "JetBrains Mono, monospace",
  },
  label: {
    display: "block",
    fontFamily: "monospace",
    fontSize: 11,
    color: "#9AA6B2",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    width: "100%",
    background: "#0B1626",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  },
  error: {
    color: "#ff6b5b",
    fontSize: 12.5,
    marginTop: 10,
  },
  info: {
    color: "#FFC300",
    fontSize: 12.5,
    marginTop: 10,
    lineHeight: 1.5,
  },
  button: {
    width: "100%",
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    border: "none",
    background: "#FFC300",
    color: "#141008",
    fontWeight: 700,
    fontFamily: "Manrope, sans-serif",
    cursor: "pointer",
  },
  switch: {
    marginTop: 18,
    fontSize: 12.5,
    color: "#FFC300",
    textAlign: "center",
    cursor: "pointer",
  },
};
