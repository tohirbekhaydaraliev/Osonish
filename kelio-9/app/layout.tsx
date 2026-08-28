import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OsonIsh AI — Suhbatlashing. Ishingizni toping.",
  description: "AI karyera agenti — real vaqtda vakansiyalarni suhbat orqali toping.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
