"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  company?: string;
  salary_min?: number;
  salary_max?: number;
  mode?: string;
  tag?: string;
  lat: number;
  lng: number;
  match_score?: number;
  source?: string;
  image_url?: string;
  phone?: string;
  description?: string;
  created_by?: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string; error?: boolean };

const DEFAULT_CENTER: [number, number] = [69.2401, 41.2995];

export default function AppPage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const pickerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userEmail, setUserEmail] = useState<string>("");
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [statusText, setStatusText] = useState("Yuklanmoqda...");
  const [statusErr, setStatusErr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [trace, setTrace] = useState<"listen" | "profile" | "search" | "match">("listen");
  const [tags, setTags] = useState<string[]>([]);
  const [chatJob, setChatJob] = useState<Job | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lang, setLang] = useState<"uz" | "ru" | "en">("uz");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const currentUserIdRef = useRef<string>("");
  const [form, setForm] = useState({
    title: "", company: "", salaryMin: "", salaryMax: "",
    mode: "Ofis", lat: "", lng: "", tag: "", phone: "", description: "",
  });

  // ---- Auth (ixtiyoriy — login majburiy emas) ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserEmail(data.session.user.email || "");
        setCurrentUserId(data.session.user.id);
        currentUserIdRef.current = data.session.user.id;
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email || "");
      setCurrentUserId(session?.user.id || "");
      currentUserIdRef.current = session?.user.id || "";
      // Login holati o'zgarganda (masalan OAuth'dan qaytgandan keyin),
      // xaritadagi belgilarni ham qayta chizamiz — shunda "o'zimniki" ranglar to'g'ri ko'rinadi.
      if (mapRef.current) {
        loadStoredJobs(userCoords || DEFAULT_CENTER);
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ---- Map init ----
  const pickingLocationRef = useRef(false);
  const PIN_CURSOR = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><path fill="%23FFC300" stroke="%23141008" stroke-width="1" d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.6" fill="%23141008"/></svg>') 12 30, auto`;
  useEffect(() => {
    pickingLocationRef.current = pickingLocation;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = pickingLocation ? PIN_CURSOR : "";
    }
  }, [pickingLocation]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const FALLBACK_MAPBOX_TOKEN =
      "pk.eyJ1IjoidG9oaXJiZWtraGEiLCJhIjoiY210MmpsNjkxMG95bDJ5c2tvY2FxYmFjdCJ9.Jg9YBUV9XsqytFo-LVVIcA";
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || FALLBACK_MAPBOX_TOKEN;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: DEFAULT_CENTER,
      zoom: 14,
      pitch: 60,
      bearing: -18,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.on("style.load", () => {
      try {
        (map as any).setConfigProperty("basemap", "lightPreset", "night");
        (map as any).setConfigProperty("basemap", "showPointOfInterestLabels", false);
      } catch (e) {}
      locateUser(map);
    });

    // Xaritada bosilganda — agar "joy tanlash" rejimida bo'lsak, sariq markerni
    // o'sha nuqtaga qo'yamiz va koordinatalarni formaga yozamiz.
    map.on("click", (e) => {
      if (!pickingLocationRef.current) return;
      const { lng, lat } = e.lngLat;
      placePickerMarker(map, [lng, lat]);
      setForm((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
      setPickingLocation(false);
      setShowAddModal(true);
    });

    mapRef.current = map;

    // Boshlang'ich AI xabarlari
    setTimeout(() => pushAI("Keling, sizga mos ishlarni topamiz."), 400);
    setTimeout(
      () => pushAI("Nimalarni qilishni yoqtirasiz? Qanday muammolarni yechishni yaxshi ko'rasiz?"),
      1400
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placePickerMarker(map: mapboxgl.Map, coords: [number, number]) {
    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.setLngLat(coords);
      return;
    }
    const el = document.createElement("div");
    el.className = "picker-marker";
    el.innerHTML = `
      <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12.75 17 27 17 27s17-14.25 17-27C34 7.6 26.4 0 17 0z" fill="#FFC300"/>
        <circle cx="17" cy="17" r="6.5" fill="#000814"/>
      </svg>`;
    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat(coords).addTo(map);
    pickerMarkerRef.current = marker;
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function locateUser(map: mapboxgl.Map) {
    setStatusText("Joylashuvingiz aniqlanmoqda...");
    if (!navigator.geolocation) {
      onLocationFail(map);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserCoords(coords);
        map.flyTo({ center: coords, zoom: 15.5, pitch: 60, essential: true, duration: 2200 });
        addUserMarker(map, coords);
        await loadStoredJobs(coords);
      },
      () => onLocationFail(map),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function onLocationFail(map: mapboxgl.Map) {
    setStatusErr(true);
    setStatusText("Joylashuvga ruxsat berilmadi — standart hudud ko'rsatilmoqda");
    addUserMarker(map, DEFAULT_CENTER);
    await loadStoredJobs(DEFAULT_CENTER);
  }

  function flyToMyLocation() {
    const map = mapRef.current;
    if (!map) return;
    const target = userCoords || DEFAULT_CENTER;
    map.flyTo({ center: target, zoom: 15.5, pitch: 60, essential: true, duration: 1400 });
  }

  function addUserMarker(map: mapboxgl.Map, coords: [number, number]) {
    const el = document.createElement("div");
    el.className = "user-marker";
    el.innerHTML = `<div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div><div class="dot"></div>`;
    new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
  }

  function escapeHtml(s: string) {
    return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  }

  function isFavorite(id: string) {
    if (typeof window === "undefined") return false;
    try {
      const list = JSON.parse(localStorage.getItem("favJobs") || "[]");
      return list.includes(id);
    } catch {
      return false;
    }
  }

  function toggleFavorite(id: string, heartEl: HTMLElement) {
    try {
      const list = JSON.parse(localStorage.getItem("favJobs") || "[]");
      const idx = list.indexOf(id);
      if (idx >= 0) {
        list.splice(idx, 1);
        heartEl.classList.remove("active");
      } else {
        list.push(id);
        heartEl.classList.add("active");
      }
      localStorage.setItem("favJobs", JSON.stringify(list));
    } catch {}
  }

  function renderJobMarkers(jobs: Job[]) {
    const map = mapRef.current;
    if (!map) return;
    const myId = currentUserIdRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    jobs.forEach((j) => {
      const isOwn = !!myId && j.created_by === myId;
      const el = document.createElement("div");
      el.className = "job-marker" + (isOwn ? " own-job" : "");
      el.innerHTML = `
        <div class="job-node"></div>
        <div class="job-card">
          <div class="job-card-top">
            <button class="job-heart${isFavorite(j.id) ? " active" : ""}" data-job-id="${j.id}" aria-label="Saqlash">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.5 4c2-.3 3.8.6 5 2.2C11.7 4.6 13.5 3.7 15.5 4 19 4.5 20.6 8 20 11.7 17.5 16.4 12 21 12 21z"/></svg>
            </button>
            <button class="job-card-close" aria-label="Yopish">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          ${j.image_url ? `<img src="${j.image_url}" class="job-photo" />` : ""}
          ${isOwn ? `<div class="own-badge">SIZNING E'LONINGIZ</div>` : ""}
          <div class="job-title">${escapeHtml(j.title.toUpperCase())}</div>
          <div class="job-match">${j.match_score || 85}% MOS</div>
          <div class="job-meta">${j.company ? escapeHtml(j.company) + " · " : ""}$${j.salary_min}–$${j.salary_max}<br>${j.mode}</div>
          <span class="job-tag">${escapeHtml(j.tag || "Umumiy")}</span>
          ${isOwn
            ? `<button class="job-edit-btn" data-job-id="${j.id}">Tahrirlash</button>`
            : `<button class="job-contact-btn" data-job-id="${j.id}">Bog'lanish</button>`}
        </div>`;
      el.querySelector(".job-heart")?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        toggleFavorite(j.id, ev.currentTarget as HTMLElement);
      });
      el.querySelector(".job-card-close")?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        el.classList.remove("active");
      });
      if (isOwn) {
        el.querySelector(".job-edit-btn")?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openEditJob(j);
        });
      } else {
        el.querySelector(".job-contact-btn")?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          openChat(j);
        });
      }
      el.addEventListener("click", () => {
        document.querySelectorAll(".job-marker").forEach((x) => x.classList.remove("active"));
        el.classList.add("active");
      });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([j.lng, j.lat]).addTo(map);
      markersRef.current.push(marker);
    });
  }

  const [loadedJobs, setLoadedJobs] = useState<Job[]>([]);

  async function loadStoredJobs(coords: [number, number]) {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      const jobs: Job[] = data.jobs || [];
      setLoadedJobs(jobs);
      renderJobMarkers(jobs);
      setStatusErr(false);
      setStatusText(jobs.length + " ta saqlangan vakansiya");
    } catch (err) {
      setStatusErr(true);
      setStatusText("Vakansiyalarni yuklab bo'lmadi");
    }
  }

  function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  // hh.ru yopilgani sababli avtomatik yuklash o'chirilgan — Jooble kaliti kelganda qayta qo'shiladi.

  // ---- Add job modal ----
  function useMyLocation() {
    if (userCoords) {
      setForm((f) => ({ ...f, lng: userCoords[0].toFixed(5), lat: userCoords[1].toFixed(5) }));
    }
  }

  function startPickingLocation() {
    setShowAddModal(false);
    setPickingLocation(true);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function openEditJob(job: Job) {
    setEditingJobId(job.id);
    setForm({
      title: job.title || "",
      company: job.company || "",
      salaryMin: job.salary_min ? String(job.salary_min) : "",
      salaryMax: job.salary_max ? String(job.salary_max) : "",
      mode: job.mode || "Ofis",
      lat: String(job.lat),
      lng: String(job.lng),
      tag: job.tag || "",
      phone: job.phone || "",
      description: job.description || "",
    });
    setPhotoPreview(job.image_url || "");
    setPhotoFile(null);
    setShowAddModal(true);
  }

  function closeAddModal() {
    setShowAddModal(false);
    setEditingJobId(null);
    setForm({ title: "", company: "", salaryMin: "", salaryMax: "", mode: "Ofis", lat: "", lng: "", tag: "", phone: "", description: "" });
    setPhotoFile(null);
    setPhotoPreview("");
  }

  async function saveJob() {
    if (!form.title || !form.lat || !form.lng) {
      alert("Lavozim nomi va koordinatalarni (xaritadan belgilang) to'ldiring.");
      return;
    }
    setUploading(true);
    try {
      const uid = currentUserIdRef.current;

      let image_url: string | null = photoPreview && !photoFile ? photoPreview : null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("job-images")
          .upload(path, photoFile);
        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from("job-images").getPublicUrl(path);
          image_url = publicUrl.publicUrl;
        }
      }

      const payload = {
        title: form.title,
        company: form.company,
        salary_min: parseInt(form.salaryMin) || 0,
        salary_max: parseInt(form.salaryMax) || 0,
        mode: form.mode,
        tag: form.tag || "Umumiy",
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        created_by: uid,
        image_url,
        phone: form.phone,
        description: form.description,
      };

      if (editingJobId) {
        await fetch("/api/jobs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingJobId, editor_id: uid, ...payload }),
        });
      } else {
        await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      closeAddModal();
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove();
        pickerMarkerRef.current = null;
      }
      await loadStoredJobs(userCoords || DEFAULT_CENTER);
    } finally {
      setUploading(false);
    }
  }

  async function deleteJob(id: string) {
    if (!confirm("Bu vakansiyani o'chirishga aminmisiz?")) return;
    setUploading(true);
    try {
      const uid = currentUserIdRef.current;
      const params = new URLSearchParams({ id, editor_id: uid });
      await fetch(`/api/jobs?${params.toString()}`, { method: "DELETE" });
      closeAddModal();
      await loadStoredJobs(userCoords || DEFAULT_CENTER);
    } finally {
      setUploading(false);
    }
  }

  // ---- Yangi Xodim (ish beruvchi xabarlar qutisi) ----
  async function openInbox() {
    const uid = currentUserIdRef.current;
    if (!uid) return;
    setShowInbox(true);
    setInboxLoading(true);
    try {
      const res = await fetch(`/api/messages/inbox?userId=${uid}`);
      const data = await res.json();
      setInboxItems(data.items || []);
    } finally {
      setInboxLoading(false);
    }
  }

  async function openInboxChat(item: any) {
    const pseudoJob = {
      id: item.job_id,
      title: item.job_title,
      created_by: item.sender_id,
      company: item.sender_email,
    } as Job;
    setShowInbox(false);
    setChatJob(pseudoJob);
    await loadChatMessages(pseudoJob, currentUserIdRef.current);
  }

  // ---- Ish beruvchi bilan chat ----
  async function openChat(job: Job) {
    const uid = currentUserIdRef.current;
    if (!uid) {
      alert("Ish beruvchi bilan bog'lanish uchun avval ro'yxatdan o'ting yoki kiring.");
      router.push("/login");
      return;
    }
    if (!job.created_by) {
      alert("Bu vakansiya uchun ish beruvchi profili topilmadi (avtomatik qo'shilgan bo'lishi mumkin).");
      return;
    }
    if (job.created_by === uid) {
      alert("Bu — sizning e'loningiz, o'zingiz bilan yozisholmaysiz.");
      return;
    }
    setChatJob(job);
    await loadChatMessages(job, uid);
  }

  async function loadChatMessages(job: Job, uid: string) {
    setChatLoading(true);
    try {
      const params = new URLSearchParams({ jobId: job.id, userId: uid, otherId: job.created_by! });
      const res = await fetch(`/api/messages?${params.toString()}`);
      const data = await res.json();
      setChatMessages(data.messages || []);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || !chatJob || !currentUserId) return;
    const content = chatInput.trim();
    setChatInput("");
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: chatJob.id,
        sender_id: currentUserId,
        recipient_id: chatJob.created_by,
        content,
      }),
    });
    await loadChatMessages(chatJob, currentUserId);
  }

  // ---- Chat ----
  const KEYWORD_TAGS: Record<string, string> = {
    dizayn: "Dizayn", design: "Dizayn", mahsulot: "Mahsulot strategiyasi", strategiya: "Mahsulot strategiyasi",
    kod: "Muhandislik", dastur: "Muhandislik", frontend: "Frontend", backend: "Backend", ai: "AI",
    startap: "Startap", startup: "Startap", masofaviy: "Masofaviy ish", remote: "Masofaviy ish", gibrid: "Gibrid ish",
    marketing: "Marketing", sotuv: "Sotuv", tahlil: "Analitika", data: "Analitika", rahbar: "Rahbarlik",
    ingliz: "Ingliz tili",
  };

  function scanForTags(text: string) {
    const low = text.toLowerCase();
    const found: string[] = [];
    Object.keys(KEYWORD_TAGS).forEach((k) => {
      if (low.includes(k)) found.push(KEYWORD_TAGS[k]);
    });
    if (found.length) {
      setTags((prev) => Array.from(new Set([...prev, ...found])));
    }
  }

  function pushAI(text: string, error = false) {
    setMessages((prev) => [...prev, { role: "assistant", content: text, error }]);
  }
  function pushUser(text: string) {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
  }

  let exchangeCountRef = useRef(0);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    pushUser(text);
    scanForTags(text);
    setInput("");
    setTyping(true);
    try {
      const history = [...messages, { role: "user" as const, content: text }].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const center = userCoords || DEFAULT_CENTER;
      const nearbyJobs = loadedJobs.map((j) => ({
        title: j.title,
        company: j.company,
        mode: j.mode,
        salary_min: j.salary_min,
        salary_max: j.salary_max,
        distanceKm: distanceKm(center[1], center[0], j.lat, j.lng),
      }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, nearbyJobs }),
      });
      const data = await res.json();
      setTyping(false);
      if (data.error) {
        pushAI("AI xizmatidan xato qaytdi: " + data.error, true);
        return;
      }
      pushAI(data.text);
      exchangeCountRef.current += 1;
      if (exchangeCountRef.current === 1) setTrace("profile");
      if (exchangeCountRef.current === 2) setTrace("search");
      if (exchangeCountRef.current >= 3) setTrace("match");
    } catch (err) {
      setTyping(false);
      pushAI("Server bilan ulanib bo'lmadi. Internetni tekshirib qayta urinib ko'ring.", true);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="OsonIsh AI" width={28} height={28} style={{ objectFit: "contain" }} />
          </div>
          <button className="sidebar-item active" title="Kashfiyot">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span className="sidebar-label">Kashfiyot</span>
          </button>
          <button className="sidebar-item" title="Moslar">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
            <span className="sidebar-label">Moslar</span>
          </button>
          <button className="sidebar-item" title="Saqlangan">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span className="sidebar-label">Saqlangan</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="nav-loc-mini" title="Joylashuv">
            <span className="p"></span>
          </div>
          {userEmail ? (
            <div className="account-wrap">
              {showAccountMenu && (
                <>
                  <div className="account-menu-backdrop" onClick={() => setShowAccountMenu(false)} />
                  <div className="account-menu">
                    <div className="account-menu-email">{userEmail}</div>
                    <button className="account-menu-item" onClick={() => { setShowSettingsModal(true); setShowAccountMenu(false); }}>
                      <GearIcon /> Sozlamalar
                    </button>
                    <div className="account-menu-item-wrap">
                      <button className="account-menu-item" onClick={() => setShowLangMenu(!showLangMenu)}>
                        <GlobeIcon /> Til
                        <span className="account-menu-value">{lang === "uz" ? "O'zbekcha" : lang === "ru" ? "Русский" : "English"}</span>
                      </button>
                      {showLangMenu && (
                        <div className="lang-submenu">
                          <button onClick={() => { setLang("uz"); setShowLangMenu(false); }}>O'zbekcha</button>
                          <button onClick={() => { setLang("ru"); setShowLangMenu(false); }}>Русский</button>
                          <button onClick={() => { setLang("en"); setShowLangMenu(false); }}>English</button>
                        </div>
                      )}
                    </div>
                    <button className="account-menu-item" onClick={() => { setShowHelpModal(true); setShowAccountMenu(false); }}>
                      <HelpIcon /> Yordam olish
                    </button>
                    <div className="account-menu-divider" />
                    <button className="account-menu-item" onClick={() => alert("Premium reja tez orada qo'shiladi.")}>
                      <UpgradeIcon /> Rejani yangilash
                    </button>
                    <button className="account-menu-item" onClick={() => alert("Mobil ilova tez orada.")}>
                      <AppsIcon /> Ilovalar
                    </button>
                    <div className="account-menu-divider" />
                    <button className="account-menu-item danger" onClick={handleLogout}>
                      <LogoutIcon /> Chiqish
                    </button>
                  </div>
                </>
              )}
              <div className="nav-avatar" onClick={() => setShowAccountMenu(!showAccountMenu)}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <button className="sidebar-login-btn" onClick={() => router.push("/login")}>
              <UserIcon />
            </button>
          )}
        </div>
      </aside>

      {showSettingsModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setShowSettingsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sozlamalar</h3>
            <div className="sub">Hisobingiz haqida asosiy ma'lumot.</div>
            <div className="field">
              <label>EMAIL</label>
              <input value={userEmail} disabled />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSettingsModal(false)}>Yopish</button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }} onClick={() => setShowHelpModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Yordam</h3>
            <div className="sub">Savolingiz bo'lsa, biz bilan bog'laning.</div>
            <div className="field">
              <a href="mailto:support@kelio.uz" style={{ color: "#FFC300", fontSize: 13 }}>support@kelio.uz</a>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowHelpModal(false)}>Yopish</button>
            </div>
          </div>
        </div>
      )}

      <main className="kelio-main">
        <div id="map-wrap">
          <div ref={mapContainer} id="map" />

          <div className={"map-status" + (statusErr ? " err" : "")}>
            <span className="p"></span> <span>{statusText}</span>
          </div>

          <button className="findme-btn" onClick={flyToMyLocation} aria-label="Joylashuvimni top" title="Joylashuvimni top">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v3M12 19v3M22 12h-3M5 12H2"/>
            </svg>
          </button>

          <button className="mobile-ai-btn" onClick={() => setShowMobileChat(true)} aria-label="AI chat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#141008" strokeWidth="2">
              <rect x="4" y="7" width="16" height="12" rx="3"/>
              <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>
              <circle cx="9" cy="13" r="1.2" fill="#141008"/>
              <circle cx="15" cy="13" r="1.2" fill="#141008"/>
              <path d="M9 16.5h6"/>
            </svg>
          </button>

          <div className="map-actions">
            {loadedJobs.some((j) => j.created_by === currentUserId) && (
              <button className="pill-btn secondary" onClick={openInbox}>
                Yangi Xodim
              </button>
            )}
            <button className="pill-btn" onClick={() => setShowAddModal(true)}>
              + Ish qo'shish
            </button>
          </div>

          {showInbox && (
            <div className="modal-overlay" onClick={() => setShowInbox(false)}>
              <div className="modal chat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="chat-modal-head">
                  <h3>Yangi Xodim</h3>
                  <button className="chat-close" onClick={() => setShowInbox(false)}>Yopish</button>
                </div>
                <div className="sub" style={{ marginBottom: 10 }}>
                  Sizning e'lonlaringizga yozgan nomzodlar.
                </div>
                {inboxLoading ? (
                  <div className="sub">Yuklanmoqda...</div>
                ) : inboxItems.length === 0 ? (
                  <div className="sub">Hali hech kim yozmagan.</div>
                ) : (
                  <div className="inbox-list">
                    {inboxItems.map((item) => (
                      <div key={item.job_id + item.sender_id} className="inbox-item" onClick={() => openInboxChat(item)}>
                        <div className="inbox-item-top">
                          <span className="inbox-job-title">{item.job_title}</span>
                          <span className="inbox-time">{new Date(item.last_message_at).toLocaleDateString()}</span>
                        </div>
                        <div className="inbox-sender">{item.sender_email}</div>
                        <div className="inbox-preview">{item.last_message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {pickingLocation && (
            <div className="picking-banner">
              📍 Xaritada ish joylashuvini bosib belgilang
              <button onClick={() => { setPickingLocation(false); setShowAddModal(true); }}>Bekor qilish</button>
            </div>
          )}

          {showAddModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>{editingJobId ? "Vakansiyani tahrirlash" : "Yangi vakansiya qo'shish"}</h3>
                <div className="sub">Ma'lumot Supabase bazasiga saqlanadi.</div>
                <div className="field">
                  <label>LAVOZIM</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Masalan: Product Designer" />
                </div>
                <div className="field">
                  <label>KOMPANIYA</label>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Masalan: Arastu" />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>MAOSH (dan)</label>
                    <input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>MAOSH (gacha)</label>
                    <input type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label>ISH REJIMI</label>
                  <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                    <option>Ofis</option>
                    <option>Gibrid</option>
                    <option>Masofaviy</option>
                  </select>
                </div>
                <div className="field">
                  <label>TELEFON RAQAM</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" />
                </div>
                <div className="field">
                  <label>ISH MUHITI TAVSIFI</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Jamoa, ofis muhiti haqida qisqacha" />
                </div>

                <div className="field">
                  <label>ISH MUHITI RASMI</label>
                  {photoPreview ? (
                    <div className="photo-preview-wrap">
                      <img src={photoPreview} className="photo-preview" />
                      <button type="button" className="photo-remove" onClick={() => { setPhotoFile(null); setPhotoPreview(""); }}>✕</button>
                    </div>
                  ) : (
                    <div className="photo-upload-box" onClick={() => fileInputRef.current?.click()}>
                      📷 Rasm tanlash
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoSelect} />
                </div>

                <div className="field">
                  <label>JOYLASHUV</label>
                  {form.lat && form.lng ? (
                    <div className="location-picked">
                      📍 {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                      <span onClick={startPickingLocation}>o'zgartirish</span>
                    </div>
                  ) : (
                    <button type="button" className="pick-location-btn" onClick={startPickingLocation}>
                      📍 Xaritadan joyni belgilash
                    </button>
                  )}
                </div>
                <span className="locbtn" onClick={useMyLocation}>📍 Joriy joylashuvimni ishlatish</span>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={closeAddModal}>Bekor qilish</button>
                  {editingJobId && (
                    <button className="btn-delete" onClick={() => deleteJob(editingJobId)} disabled={uploading}>
                      O'chirish
                    </button>
                  )}
                  <button className="btn-save" onClick={saveJob} disabled={uploading}>
                    {uploading ? "Saqlanmoqda..." : editingJobId ? "Yangilash" : "Saqlash"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {chatJob && (
            <div className="modal-overlay">
              <div className="modal chat-modal">
                <div className="chat-modal-head">
                  <div>
                    <h3>{chatJob.title}</h3>
                    <div className="sub">{chatJob.company}{chatJob.phone ? ` · ${chatJob.phone}` : ""}</div>
                  </div>
                  <button className="chat-close" onClick={() => setChatJob(null)}>✕</button>
                </div>
                <div className="chat-modal-messages">
                  {chatLoading ? (
                    <div className="sub">Yuklanmoqda...</div>
                  ) : chatMessages.length === 0 ? (
                    <div className="sub">Hali xabar yo'q — birinchi bo'lib yozing.</div>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className={"chat-bubble-row" + (m.sender_id === currentUserId ? " own" : "")}>
                        <div className="chat-bubble">{m.content}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="chat-modal-input">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                    placeholder="Xabar yozing..."
                  />
                  <button onClick={sendChatMessage}>Yuborish</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div id="panel" className={showMobileChat ? "panel-mobile-open" : ""}>
          <div className="panel-head">
            <div className="panel-title"><span className="p"></span> Career AI</div>
            <div className="panel-sub">Menga o'zingiz haqingizda ayting — men xaritadan aynan sizga mos ishlarni topaman.</div>
            <button className="panel-mobile-close" onClick={() => setShowMobileChat(false)} aria-label="Yopish">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="trace">
            {(["listen", "profile", "search", "match"] as const).map((step, i) => {
              const order = ["listen", "profile", "search", "match"];
              const idx = order.indexOf(trace);
              const cls = i < idx ? "trace-step done" : i === idx ? "trace-step active" : "trace-step";
              const labels: Record<string, string> = { listen: "Tinglash", profile: "Profil", search: "Qidiruv", match: "Moslashtirish" };
              return <div key={step} className={cls}>{labels[step]}</div>;
            })}
          </div>

          <div className="profile-tags">
            {tags.length === 0 ? (
              <span style={{ fontFamily: "monospace", fontSize: 10.5, color: "#9AA6B2", opacity: 0.6 }}>
                Profilingiz hali shakllanmoqda...
              </span>
            ) : (
              tags.map((t) => <span key={t} className="ptag">{t}</span>)
            )}
          </div>

          <div id="chat">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "user" : "ai" + (m.error ? " error" : "")}`}>
                {m.role === "assistant" && <div className="msg-label">Career AI</div>}
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            {typing && (
              <div className="msg ai">
                <div className="msg-label">Career AI</div>
                <div className="typing"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div id="composer">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Xabar yozing..."
            />
            <button id="sendBtn" className="icon-btn" onClick={() => sendMessage(input)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function GearIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function GlobeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function HelpIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function UpgradeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
}
function AppsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function UserIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
