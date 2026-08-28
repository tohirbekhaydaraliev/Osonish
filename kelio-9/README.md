# Kelio — AI Karyera Agenti

Real foydalanuvchilar ishlatishi mumkin bo'lgan to'liq ilova: autentifikatsiya, real 3D xarita, real vaqtdagi hh.ru vakansiyalari, AI suhbat (server tomonida, xavfsiz).

## Arxitektura

- **Next.js 14** — frontend + backend (API routes) bitta loyihada
- **Supabase** — login/parol autentifikatsiyasi + PostgreSQL baza
- **Mapbox GL JS** — real 3D xarita
- **Anthropic API** — AI suhbat (kalit faqat serverda, brauzerga chiqmaydi)
- **hh.ru API** — real vaqtdagi O'zbekiston vakansiyalari (server orqali, CORS muammosiz)

## 1. Kerakli hisoblarni oching (barchasi bepul boshlanadi)

1. **Supabase**: [supabase.com](https://supabase.com) — "New project" yarating. Loyiha yaratilgach:
   - Settings → API dan `Project URL`, `anon public key`, `service_role key` ni oling
   - SQL Editor → New query → `supabase/schema.sql` faylidagi kodni to'liq nusxalab, "Run" bosing
   - Authentication → Providers → Email yoqilganligini tekshiring (default yoqilgan)

2. **Mapbox**: [account.mapbox.com](https://account.mapbox.com) — ro'yxatdan o'ting, "Access tokens" dan public tokenni oling (sizda allaqachon bor)

3. **Anthropic**: [console.anthropic.com](https://console.anthropic.com) — API kalit yarating (`sk-ant-...`)

## 2. Loyihani sozlash

```bash
cd kelio
npm install
cp .env.example .env.local
```

`.env.local` faylini oching va barcha qiymatlarni to'ldiring.

## 3. Lokal test

```bash
npm run dev
```

`http://localhost:3000` ochiladi. Ro'yxatdan o'tib (`/login`), ilovani sinab ko'ring.

## 4. Production'ga deploy qilish (Vercel)

1. Bu loyihani GitHub'ga push qiling (yangi repo yarating, `git init && git add . && git commit -m "kelio v1" && git push`)
2. [vercel.com](https://vercel.com) ga kiring → "New Project" → GitHub repongizni tanlang
3. "Environment Variables" bo'limida `.env.local` dagi barcha qiymatlarni bir xil nomlar bilan kiriting
4. "Deploy" bosing — 2 daqiqada tayyor bo'ladi, sizga `https://kelio-xxxx.vercel.app` manzili beriladi

Shundan keyin ilova haqiqiy internetda, istalgan foydalanuvchi kirib ro'yxatdan o'tishi mumkin bo'ladi.

## 5. Keyingi qadamlar (production'ga to'liq tayyor bo'lish uchun)

- [ ] O'z domeningizni ulash (Vercel → Settings → Domains)
- [ ] Supabase'da email tasdiqlashni yoqish (hozir demo uchun o'chirilgan bo'lishi mumkin)
- [ ] `/api/jobs` route'iga throttling/validatsiya qo'shish (hozircha oddiy)
- [ ] hh.ru natijalarini keshlash (hozir har so'rovda qayta so'raladi — trafik ko'paysa Redis/Upstash kesh qo'shish tavsiya etiladi)
- [ ] Xatoliklarni kuzatish uchun Sentry yoki shunga o'xshash xizmat ulash
- [ ] Foydalanuvchi profilini (`profiles` jadvali) chat orqali avtomatik to'ldirish logikasini qo'shish

## Papka strukturasi

```
kelio/
  app/
    api/
      chat/route.ts        # AI suhbat (server, Anthropic kaliti bilan)
      vacancies/route.ts    # hh.ru real-time proxy (server, CORS'siz)
      jobs/route.ts         # Qo'lda qo'shilgan vakansiyalar CRUD (Supabase)
    login/page.tsx          # Kirish/ro'yxatdan o'tish
    app/page.tsx            # Asosiy ilova (xarita + chat)
    layout.tsx
    globals.css
  lib/
    supabaseClient.ts        # Brauzer klienti (anon key)
    supabaseServer.ts        # Server klienti (service role key)
  supabase/
    schema.sql               # Baza sxemasi
  .env.example
```
