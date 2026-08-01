"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  ShieldOff,
  HelpCircle,
  Users,
  Moon,
  Sun,
  ChevronDown,
  Loader2,
} from "lucide-react";

type EntityState = {
  entity_id?: string;
  state?: string;
  last_changed?: string;
} | null;

type KeyEntity = { entity_id: string; name: string; state: string; home: boolean };

type KeysState = {
  state?: string;
  count?: number;
  total?: number;
  entities?: KeyEntity[];
} | null;

type Status = "on" | "off" | "unknown";

// Anropar backend-servern på samma host som sidan öppnades ifrån.
// Så det fungerar både på Pi:n själv (localhost) och från t.ex.
// mobilen hemma på wifi (http://192.168.x.x:3001).
function apiBase() {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:3000/api`;
}

function toStatus(state: string | undefined): Status {
  if (state === "on") return "on";
  if (state === "off") return "off";
  return "unknown";
}

export default function LarmPanel() {
  const [alarmData, setAlarmData] = useState<EntityState>(null);
  const [keysData, setKeysData] = useState<KeysState>(null);
  const [nightData, setNightData] = useState<EntityState>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [pending, setPending] = useState<"alarm" | "night" | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Läser in ett par typsnitt från Google Fonts åt den här sidan,
  // utan att behöva röra layout.tsx eller tailwind.config.
  useEffect(() => {
    const id = "larm-panel-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);

  // Ser till att sidan räknas som dark mode rakt igenom: mobilens
  // adressfält, scrollbars och formulärkontroller (t.ex. datumväljare)
  // blir mörka istället för att stå kvar i webbläsarens standardljusa tema.
  useEffect(() => {
    document.documentElement.style.colorScheme = "dark";

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "#0B0E14");
  }, []);

  const fetchStatus = useCallback(async () => {
    const base = apiBase();
    try {
      const [alarmRes, keysRes, nightRes] = await Promise.all([
        fetch(`${base}/alarm-status`).catch(() => null),
        fetch(`${base}/keys-status`).catch(() => null),
        fetch(`${base}/night-mode`).catch(() => null),
      ]);

      setIsConnected([alarmRes, keysRes, nightRes].some((r) => r !== null && r.ok));

      if (alarmRes && alarmRes.ok) setAlarmData(await alarmRes.json());
      if (keysRes && keysRes.ok) setKeysData(await keysRes.json());
      if (nightRes && nightRes.ok) setNightData(await nightRes.json());
    } catch (error) {
      console.error("Kunde inte hämta systemstatus:", error);
      setIsConnected(false);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleAlarm = async (newState: "on" | "off") => {
    setPending("alarm");
    try {
      await fetch(`${apiBase()}/alarm-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });
      await fetchStatus();
    } catch (error) {
      console.error("Kunde inte ändra larmstatus:", error);
    } finally {
      setPending(null);
    }
  };

  const toggleNight = async (newState: "on" | "off") => {
    setPending("night");
    try {
      await fetch(`${apiBase()}/night-mode-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState }),
      });
      await fetchStatus();
    } catch (error) {
      console.error("Kunde inte ändra nattläge:", error);
    } finally {
      setPending(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-[#8891A5]">
        <style jsx global>{`
          html,
          body {
            background-color: #0b0e14;
            color-scheme: dark;
          }
        `}</style>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Ansluter till systemet …</span>
        </div>
      </div>
    );
  }

  const alarmStatus = toStatus(alarmData?.state);
  const presenceStatus = toStatus(keysData?.state);
  const nightStatus = toStatus(nightData?.state);

  const keysTotal = keysData?.total ?? (keysData?.entities?.length ?? 0);
  const keysHomeCount = keysData?.count ?? (keysData?.entities?.filter((e) => e.home).length ?? 0);

  const lastChanged = alarmData?.last_changed
    ? new Date(alarmData.last_changed).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const ring =
    alarmStatus === "on"
      ? { border: "border-[#E5484D]", glow: "bg-[#E5484D]/30", surf: "bg-[#1E1013]", breathe: true }
      : alarmStatus === "off"
      ? { border: "border-[#34B27B]", glow: "bg-[#34B27B]/20", surf: "bg-[#0E1B16]", breathe: false }
      : { border: "border-dashed border-[#3A4258]", glow: "", surf: "bg-[#131826]", breathe: false };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0B0E14] p-4 text-[#E9ECF2] antialiased">
      <style jsx global>{`
        html,
        body {
          background-color: #0b0e14;
          color-scheme: dark;
        }
      `}</style>
      <style jsx>{`
        @keyframes breathe {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.08);
          }
        }
        .breathe {
          animation: breathe 3.2s ease-in-out infinite;
        }
      `}</style>

      <div className="w-full max-w-sm space-y-4">
        {/* HUVUDSTATUS */}
        <div className="rounded-3xl border border-[#1E2536] bg-[#131826] p-8 text-center">
          <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center">
            <div
              aria-hidden
              className={`absolute inset-0 rounded-full blur-xl ${ring.glow} ${ring.breathe ? "breathe" : ""}`}
            />
            <div
              className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 ${ring.border} ${ring.surf}`}
            >
              {alarmStatus === "on" && <Shield className="h-9 w-9 text-[#E5484D]" />}
              {alarmStatus === "off" && <ShieldOff className="h-9 w-9 text-[#34B27B]" />}
              {alarmStatus === "unknown" && <HelpCircle className="h-9 w-9 text-[#5B6478]" />}
            </div>
          </div>

          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-2xl font-semibold tracking-tight">
            {alarmStatus === "on" && "Larmet är armerat"}
            {alarmStatus === "off" && "Larmet är avaktiverat"}
            {alarmStatus === "unknown" && "Status okänd"}
          </h1>

          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[#8891A5]">
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-[#34B27B]" : "bg-[#E5484D]"}`} />
            {lastChanged ? `Ändrades kl. ${lastChanged}` : "Ingen kontakt med servern"}
          </p>

          <button
            onClick={() => toggleAlarm(alarmStatus === "on" ? "off" : "on")}
            disabled={pending === "alarm" || alarmStatus === "unknown"}
            className={`mt-6 w-full rounded-xl py-3.5 text-base font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${
              alarmStatus === "on" ? "bg-[#34B27B] hover:bg-[#2ea070]" : "bg-[#E5484D] hover:bg-[#d43e43]"
            }`}
          >
            {pending === "alarm" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Uppdaterar …
              </span>
            ) : alarmStatus === "unknown" ? (
              "Väntar på anslutning"
            ) : alarmStatus === "on" ? (
              "Avaktivera larmet"
            ) : (
              "Armera larmet"
            )}
          </button>
        </div>

        {/* NÄRVARO & NATTLÄGE */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#1E2536] bg-[#131826] p-4 text-center">
            <div className="relative">
              <Users className={`h-5 w-5 ${keysHomeCount > 0 ? "text-[#34B27B]" : "text-[#5B6478]"}`} />
              {presenceStatus !== "unknown" && keysTotal > 0 && (
                <span className="absolute -right-2.5 -top-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#1E2536] bg-[#131826] px-1 text-[9px] font-semibold text-[#E9ECF2]">
                  {keysHomeCount}
                </span>
              )}
            </div>
            <span className="text-xs text-[#8891A5]">Närvaro</span>
            <span className="text-sm font-medium">
              {presenceStatus === "unknown"
                ? "Okänd"
                : keysTotal > 0
                ? `${keysHomeCount} av ${keysTotal} hemma`
                : keysHomeCount > 0
                ? "Någon är hemma"
                : "Huset är tomt"}
            </span>
          </div>

          <button
            onClick={() => toggleNight(nightStatus === "on" ? "off" : "on")}
            disabled={pending === "night" || nightStatus === "unknown"}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[#1E2536] bg-[#131826] p-4 text-center transition-colors hover:border-[#2A3348] disabled:opacity-50"
          >
            {nightStatus === "on" ? (
              <Moon className="h-5 w-5 text-[#7C8CF8]" />
            ) : (
              <Sun className="h-5 w-5 text-[#5B6478]" />
            )}
            <span className="text-xs text-[#8891A5]">Nattläge</span>
            <span className="text-sm font-medium">
              {pending === "night" ? "Uppdaterar …" : nightStatus === "unknown" ? "Okänd" : nightStatus === "on" ? "På" : "Av"}
            </span>
          </button>
        </div>

        {/* TEKNISK INFORMATION – dold som standard, bara för dig */}
        <div className="rounded-2xl border border-[#1E2536]/60">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-[#8891A5]"
          >
            <span>Teknisk information</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails && (
            <div
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className="space-y-2 border-t border-[#1E2536]/60 px-4 pb-3 pt-2 text-xs text-[#8891A5]"
            >
              <div className="flex justify-between gap-2">
                <span className="truncate">{alarmData?.entity_id ?? "larm"}</span>
                <span>{alarmData?.state ?? "–"}</span>
              </div>
              {keysData?.entities && keysData.entities.length > 0 ? (
                keysData.entities.map((e) => (
                  <div key={e.entity_id} className="flex justify-between gap-2">
                    <span className="truncate">{e.name}</span>
                    <span>{e.home ? "hemma" : "borta"}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between gap-2">
                  <span className="truncate">nycklar</span>
                  <span>–</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="truncate">{nightData?.entity_id ?? "nattläge"}</span>
                <span>{nightData?.state ?? "–"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
