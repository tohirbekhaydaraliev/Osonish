"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Login endi majburiy emas — har doim to'g'ridan-to'g'ri ilovaga kiramiz.
    router.replace("/app");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "#000814" }} />
  );
}
