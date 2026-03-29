import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Clock,
  Download,
  Gamepad2,
  Play,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const COVER_URL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
const HTML_URL = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
const LS_RECENT = "infiniteGames_recentlyPlayed";
const LS_PANIC = "infiniteGames_panicKey";
const LS_THEME = "infiniteGames_theme";
const LS_LAUNCH_MODE = "infiniteGames_launchMode";
const LS_CLOAK = "infiniteGames_tabCloak";

type LaunchMode = "iframe" | "blank";
type CloakOption = "google" | "drive" | "classroom" | "ixl";

const CLOAK_CONFIG: Record<CloakOption, { title: string; favicon: string }> = {
  google: {
    title: "Google",
    favicon: "https://www.google.com/favicon.ico",
  },
  drive: {
    title: "Google Drive",
    favicon:
      "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
  },
  classroom: {
    title: "Google Classroom",
    favicon: "https://ssl.gstatic.com/classroom/favicon.png",
  },
  ixl: {
    title: "IXL",
    favicon: "https://www.ixl.com/favicon.ico",
  },
};

interface Zone {
  id: number;
  name: string;
  cover: string;
  url: string;
  author?: string;
  authorLink?: string;
  featured?: boolean;
  special?: string[];
}

function resolveUrl(raw: string): string {
  return raw.replace("{COVER_URL}", COVER_URL).replace("{HTML_URL}", HTML_URL);
}

async function downloadGame(game: Zone) {
  const url = resolveUrl(game.url);
  let htmlContent: string;

  if (game.url.startsWith("http")) {
    htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${game.name}</title><style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:none;overflow:hidden}</style></head><body><iframe src="${url}" allowfullscreen></iframe></body></html>`;
  } else {
    try {
      const res = await fetch(url);
      htmlContent = await res.text();
    } catch {
      htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${game.name}</title><style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:none;overflow:hidden}</style></head><body><iframe src="${url}" allowfullscreen></iframe></body></html>`;
    }
  }

  const blob = new Blob([htmlContent], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${game.name}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

function ParticleCanvas({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
    };

    const colors = dark
      ? ["#34E6FF", "#A855FF", "#3A7BFF", "#C13CFF"]
      : ["#3A7BFF", "#A855FF", "#20CFFF"];

    const count = 80;
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * (dark ? 0.35 : 0.2);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = dark
              ? `rgba(52, 230, 255, ${alpha})`
              : `rgba(58, 123, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${dark ? "cc" : "99"}`;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = dark ? 8 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [dark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

function GameLoadingOverlay() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress: fast at first, then slows near 90%, stops until done
    const intervals: ReturnType<typeof setTimeout>[] = [];
    const steps = [
      { target: 30, duration: 400 },
      { target: 55, duration: 600 },
      { target: 72, duration: 800 },
      { target: 85, duration: 1000 },
      { target: 91, duration: 1500 },
      { target: 95, duration: 2500 },
    ];
    let elapsed = 0;
    for (const step of steps) {
      const t = elapsed;
      const id = setTimeout(() => setProgress(step.target), t);
      intervals.push(id);
      elapsed += step.duration;
    }
    return () => {
      for (const id of intervals) clearTimeout(id);
    };
  }, []);

  return (
    <div
      data-ocid="game.loading_state"
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 300,
        background: "rgba(4, 6, 18, 0.96)",
        backdropFilter: "blur(6px)",
      }}
    >
      <style>{`
        @keyframes glowSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(0.96); filter: blur(18px); }
          50% { opacity: 1; transform: scale(1.04); filter: blur(22px); }
        }
        @keyframes floatDots {
          0%, 100% { opacity: 0.2; transform: translateY(0px); }
          50% { opacity: 1; transform: translateY(-6px); }
        }
        @keyframes progressShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Outer glow blob */}
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,255,0.22) 0%, rgba(52,230,255,0.12) 50%, transparent 70%)",
          animation: "glowPulse 2.4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Spinning ring */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "#34E6FF",
          borderRightColor: "#A855FF",
          borderBottomColor: "#34E6FF",
          borderLeftColor: "transparent",
          animation: "glowSpin 1.1s linear infinite",
          boxShadow:
            "0 0 18px rgba(52,230,255,0.5), inset 0 0 12px rgba(168,85,255,0.3)",
          marginBottom: 32,
          position: "relative",
          zIndex: 1,
        }}
      />

      {/* Main heading */}
      <h1
        style={{
          background: "linear-gradient(135deg, #34E6FF 0%, #A855FF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 14px rgba(52,230,255,0.6))",
          fontSize: "1.75rem",
          fontWeight: 900,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 10,
          position: "relative",
          zIndex: 1,
          textAlign: "center",
        }}
      >
        Loading your game
      </h1>

      {/* Subtitle */}
      <p
        style={{
          color: "rgba(200,210,240,0.55)",
          fontSize: "0.9rem",
          letterSpacing: "0.06em",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          marginBottom: 28,
        }}
      >
        This can take a while
      </p>

      {/* Progress bar */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 280,
          marginBottom: 20,
        }}
      >
        {/* Track */}
        <div
          style={{
            width: "100%",
            height: 6,
            borderRadius: 999,
            background: "rgba(52,230,255,0.1)",
            border: "1px solid rgba(52,230,255,0.15)",
            overflow: "hidden",
          }}
        >
          {/* Fill */}
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              background:
                "linear-gradient(90deg, #3A7BFF 0%, #34E6FF 40%, #A855FF 100%)",
              backgroundSize: "200% 100%",
              animation: "progressShimmer 1.8s linear infinite",
              boxShadow:
                "0 0 10px rgba(52,230,255,0.7), 0 0 4px rgba(168,85,255,0.5)",
              transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
        {/* Percentage */}
        <div
          style={{
            marginTop: 6,
            textAlign: "right",
            fontSize: "0.72rem",
            color: "rgba(52,230,255,0.6)",
            letterSpacing: "0.05em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {progress}%
        </div>
      </div>

      {/* Animated dots */}
      <div style={{ display: "flex", gap: 8, position: "relative", zIndex: 1 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: i === 1 ? "#A855FF" : "#34E6FF",
              display: "inline-block",
              animation: `floatDots 1.4s ease-in-out ${i * 0.22}s infinite`,
              boxShadow: `0 0 8px ${i === 1 ? "#A855FF" : "#34E6FF"}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function GameCard({
  game,
  onPlay,
  wide = false,
  index,
}: {
  game: Zone;
  onPlay: (game: Zone) => void;
  wide?: boolean;
  index: number;
}) {
  const coverUrl = resolveUrl(game.cover);
  const [imgError, setImgError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await downloadGame(game);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      data-ocid={wide ? `recent.item.${index}` : `games.item.${index}`}
      className={`group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-200 text-left ${
        wide ? "flex gap-3 p-2" : "flex flex-col w-full"
      }`}
      onClick={() => onPlay(game)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderColor: hovered ? "rgba(52,230,255,0.55)" : "rgba(52,230,255,0.3)",
        boxShadow: hovered
          ? "0 0 18px rgba(52,230,255,0.22), 0 0 6px rgba(168,85,255,0.18), 0 2px 12px rgba(52,230,255,0.12)"
          : "0 2px 12px rgba(52,230,255,0.08), 0 0 1px rgba(168,85,255,0.2)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div
        className={`relative overflow-hidden ${
          wide ? "w-24 h-16 rounded-lg flex-shrink-0" : "w-full aspect-video"
        }`}
      >
        {!imgError ? (
          <img
            src={coverUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Play className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
      </div>
      {wide ? (
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground truncate">
            {game.name}
          </p>
          {game.author && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              by {game.author}
            </p>
          )}
          <button
            type="button"
            data-ocid={`recent.download_button.${index}`}
            className="mt-1.5 flex items-center gap-1 text-xs text-neon-purple hover:text-neon-cyan transition-colors w-fit"
            style={{ textShadow: "0 0 6px currentColor" }}
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="w-3 h-3" />
            {downloading ? "Saving..." : "Download"}
          </button>
        </div>
      ) : (
        <div className="p-2.5">
          <p className="font-semibold text-sm text-foreground truncate mb-0.5">
            {game.name}
          </p>
          {game.author && (
            <p
              className="text-xs truncate mb-1.5"
              style={{ color: "rgba(168,85,255,0.75)" }}
            >
              by {game.author}
            </p>
          )}
          {!game.author && <div className="mb-1.5" />}
          <div className="flex gap-1.5">
            <div
              className="flex-1 py-1 text-xs font-bold uppercase tracking-widest rounded-md border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan transition-colors text-center"
              style={{ textShadow: "0 0 8px #34E6FF" }}
            >
              Play
            </div>
            <button
              type="button"
              data-ocid={`games.download_button.${index}`}
              className="px-2 py-1 text-xs rounded-md border border-neon-purple/40 text-neon-purple hover:bg-neon-purple/10 hover:border-neon-purple transition-colors flex items-center gap-1"
              style={{ textShadow: "0 0 6px #A855FF" }}
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="w-3 h-3" />
              {downloading ? "..." : "DL"}
            </button>
          </div>
        </div>
      )}
    </button>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(LS_THEME);
    return saved !== null ? saved === "dark" : true;
  });
  const [launchMode, setLaunchMode] = useState<LaunchMode>(
    () => (localStorage.getItem(LS_LAUNCH_MODE) as LaunchMode) || "iframe",
  );
  const [cloak, setCloak] = useState<CloakOption>(
    () => (localStorage.getItem(LS_CLOAK) as CloakOption) || "google",
  );
  const [games, setGames] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameLoading, setGameLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [recentIds, setRecentIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
    } catch {
      return [];
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panicKeyInput, setPanicKeyInput] = useState(
    () => localStorage.getItem(LS_PANIC) || "Escape",
  );
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<Zone | null>(null);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  // Apply tab cloak
  useEffect(() => {
    const cfg = CLOAK_CONFIG[cloak];
    document.title = cfg.title;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = cfg.favicon;
  }, [cloak]);

  useEffect(() => {
    const panicKey = localStorage.getItem(LS_PANIC) || "Escape";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === panicKey || e.code === panicKey) {
        window.location.href = "https://www.google.com";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json")
      .then((r) => r.json())
      .then((data: Zone[]) => {
        setGames(data.filter((z) => z.id >= 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const closeIframe = useCallback(() => {
    setIframeUrl(null);
    setActiveGame(null);
  }, []);

  const handlePlay = useCallback(
    async (game: Zone) => {
      const rawUrl = resolveUrl(game.url);
      setGameLoading(true);

      if (launchMode === "iframe") {
        try {
          const res = await fetch(rawUrl);
          const html = await res.text();
          const blob = new Blob([html], { type: "text/html" });
          const blobUrl = URL.createObjectURL(blob);
          setIframeUrl(blobUrl);
          setActiveGame(game);
        } catch {
          setIframeUrl(rawUrl);
          setActiveGame(game);
        } finally {
          setGameLoading(false);
        }
      } else {
        try {
          const res = await fetch(rawUrl);
          const html = await res.text();
          const blob = new Blob([html], { type: "text/html" });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
        } catch {
          window.open(rawUrl, "_blank", "noopener,noreferrer");
        } finally {
          setGameLoading(false);
        }
      }

      setRecentIds((prev) => {
        const next = [game.id, ...prev.filter((id) => id !== game.id)].slice(
          0,
          8,
        );
        localStorage.setItem(LS_RECENT, JSON.stringify(next));
        return next;
      });
    },
    [launchMode],
  );

  const recentGames = recentIds
    .map((id) => games.find((g) => g.id === id))
    .filter(Boolean) as Zone[];

  const filteredGames = search.trim()
    ? games.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : games;

  const saveSettings = () => {
    localStorage.setItem(LS_PANIC, panicKeyInput);
    localStorage.setItem(LS_THEME, dark ? "dark" : "light");
    localStorage.setItem(LS_LAUNCH_MODE, launchMode);
    localStorage.setItem(LS_CLOAK, cloak);
    setSettingsOpen(false);
  };

  const cloakOptions: { value: CloakOption; label: string }[] = [
    { value: "google", label: "Google" },
    { value: "drive", label: "Google Drive" },
    { value: "classroom", label: "Google Classroom" },
    { value: "ixl", label: "IXL" },
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background">
      <ParticleCanvas dark={dark} />

      {/* Game loading overlay */}
      {gameLoading && <GameLoadingOverlay />}

      {/* Fullscreen iframe overlay */}
      {iframeUrl && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          {/* Overlay header bar */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/10"
            style={{
              background:
                "linear-gradient(180deg, rgba(7,10,28,0.98) 0%, rgba(7,10,28,0.92) 100%)",
            }}
          >
            {/* Left: game name + author */}
            <div className="flex flex-col justify-center min-w-0 mr-4">
              <span
                className="font-black text-sm sm:text-base leading-tight truncate"
                style={{
                  background:
                    "linear-gradient(135deg, #34E6FF 0%, #A855FF 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 6px rgba(52,230,255,0.5))",
                }}
              >
                {activeGame?.name ?? "Game"}
              </span>
              {activeGame?.author && (
                <span
                  className="text-xs leading-tight truncate mt-0.5"
                  style={{ color: "rgba(168,85,255,0.8)" }}
                >
                  by {activeGame.author}
                </span>
              )}
            </div>

            {/* Right: close button */}
            <button
              type="button"
              data-ocid="iframe.close_button"
              onClick={closeIframe}
              className="flex items-center gap-1.5 text-white hover:text-red-400 font-bold text-sm px-3 py-1.5 rounded-lg border border-white/20 hover:border-red-400 transition-all duration-150 flex-shrink-0"
              style={{ cursor: "pointer" }}
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>

          <iframe
            src={iframeUrl}
            className="flex-1 w-full border-none"
            allowFullScreen
            allow="fullscreen"
            title={activeGame?.name ?? "Game"}
          />
        </div>
      )}

      <header
        className="sticky top-0 z-50 border-b border-neon-blue/10 backdrop-blur-md"
        style={{
          background: dark
            ? "rgba(7, 10, 28, 0.85)"
            : "rgba(240, 243, 255, 0.85)",
          boxShadow: "0 1px 20px rgba(52,230,255,0.12)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <Gamepad2
              className="w-7 h-7 flex-shrink-0"
              style={{
                color: "#34E6FF",
                filter: "drop-shadow(0 0 6px #34E6FF)",
              }}
            />
            <span
              className="text-xl font-black uppercase tracking-tight hidden sm:block"
              style={{
                background: "linear-gradient(135deg, #34E6FF 0%, #A855FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 8px rgba(52,230,255,0.4))",
              }}
            >
              INFINITE GAMES
            </span>
          </div>

          <div className="flex flex-1 max-w-xl items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-ocid="nav.search_input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games..."
                className="pl-9 rounded-full border-neon-blue/30 bg-background/50 text-black dark:text-black"
              />
            </div>
            <a
              href="https://discord.gg/V5mwH9PrC"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="discord.link"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:scale-105"
              style={{
                background: "rgba(88,101,242,0.15)",
                borderColor: "rgba(88,101,242,0.5)",
                color: "#5865F2",
                boxShadow: "0 0 10px rgba(88,101,242,0.2)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#5865F2"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <title>Discord</title>
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Join Discord
            </a>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              data-ocid="nav.secondary_button"
              variant="outline"
              size="sm"
              className="hidden sm:flex gap-1.5 rounded-full border-neon-purple/30 text-xs"
              onClick={() => {
                const tab = window.open("", "_blank");
                if (tab) {
                  tab.document.open();
                  tab.document.write(
                    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:none;overflow:hidden}</style></head><body><iframe src="https://duckduckgo.com" allowfullscreen></iframe></body></html>`,
                  );
                  tab.document.close();
                }
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <title>DuckDuckGo</title>
                <circle cx="16" cy="16" r="16" fill="#DE5833" />
                <circle cx="16" cy="14" r="7" fill="white" />
                <ellipse cx="16" cy="24" rx="5" ry="3" fill="#F5A623" />
              </svg>
              Proxy
            </Button>
            <Button
              data-ocid="settings.open_modal_button"
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-neon-purple/10"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {recentGames.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock
                className="w-5 h-5"
                style={{
                  color: "#A855FF",
                  filter: "drop-shadow(0 0 6px #A855FF)",
                }}
              />
              <h2
                className="text-sm font-black uppercase tracking-widest"
                style={{
                  color: "#A855FF",
                  textShadow: "0 0 12px #A855FF, 0 0 24px rgba(168,85,255,0.4)",
                  borderLeft: "3px solid #A855FF",
                  paddingLeft: "10px",
                }}
              >
                Recently Played
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {recentGames.map((game, i) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={handlePlay}
                  wide
                  index={i + 1}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gamepad2
                className="w-5 h-5"
                style={{
                  color: "#34E6FF",
                  filter: "drop-shadow(0 0 6px #34E6FF)",
                }}
              />
              <h2
                className="text-sm font-black uppercase tracking-widest"
                style={{
                  color: "#34E6FF",
                  textShadow: "0 0 12px #34E6FF, 0 0 24px rgba(52,230,255,0.4)",
                  borderLeft: "3px solid #34E6FF",
                  paddingLeft: "10px",
                }}
              >
                {search ? `Results for "${search}"` : "All Games"}
              </h2>
            </div>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {filteredGames.length} games
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 24 })
                .map((_, i) => i)
                .map((skelId) => (
                  <div
                    key={`skel-${skelId}`}
                    data-ocid="games.loading_state"
                    className="rounded-xl overflow-hidden"
                  >
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-2.5 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  </div>
                ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <div
              data-ocid="games.empty_state"
              className="text-center py-20 text-muted-foreground"
            >
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-semibold">No games found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredGames.map((game, i) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={handlePlay}
                  index={i + 1}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          data-ocid="settings.dialog"
          className="sm:max-w-sm"
          style={{
            background: dark ? "#0B1220" : undefined,
            border: "1px solid rgba(168, 85, 255, 0.3)",
            boxShadow: "0 0 40px rgba(168, 85, 255, 0.15)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-lg font-black uppercase tracking-widest"
              style={{
                background: "linear-gradient(135deg, #34E6FF 0%, #A855FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-toggle" className="text-sm font-medium">
                Dark Mode
              </Label>
              <Switch
                data-ocid="settings.switch"
                id="dark-toggle"
                checked={dark}
                onCheckedChange={setDark}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Game Launch Mode</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid="settings.toggle"
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all"
                  style={{
                    borderColor:
                      launchMode === "iframe"
                        ? "#34E6FF"
                        : "rgba(52,230,255,0.2)",
                    color: launchMode === "iframe" ? "#34E6FF" : undefined,
                    background:
                      launchMode === "iframe"
                        ? "rgba(52,230,255,0.08)"
                        : undefined,
                    textShadow:
                      launchMode === "iframe" ? "0 0 8px #34E6FF" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => setLaunchMode("iframe")}
                >
                  iFrame
                </button>
                <button
                  type="button"
                  data-ocid="settings.toggle"
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all"
                  style={{
                    borderColor:
                      launchMode === "blank"
                        ? "#A855FF"
                        : "rgba(168,85,255,0.2)",
                    color: launchMode === "blank" ? "#A855FF" : undefined,
                    background:
                      launchMode === "blank"
                        ? "rgba(168,85,255,0.08)"
                        : undefined,
                    textShadow:
                      launchMode === "blank" ? "0 0 8px #A855FF" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => setLaunchMode("blank")}
                >
                  New Tab
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {launchMode === "iframe"
                  ? "Games open fullscreen on this page"
                  : "Games open directly in a new browser tab"}
              </p>
            </div>

            {/* Tab Cloak */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tab Cloak
                <span className="ml-1 text-xs text-muted-foreground">
                  (disguise this tab)
                </span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {cloakOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-left truncate"
                    style={{
                      borderColor:
                        cloak === opt.value
                          ? "#34E6FF"
                          : "rgba(52,230,255,0.15)",
                      color:
                        cloak === opt.value
                          ? "#34E6FF"
                          : "rgba(200,210,240,0.6)",
                      background:
                        cloak === opt.value
                          ? "rgba(52,230,255,0.08)"
                          : "transparent",
                      textShadow:
                        cloak === opt.value ? "0 0 8px #34E6FF" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => setCloak(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="panic-key" className="text-sm font-medium">
                Panic Key
                <span className="ml-1 text-xs text-muted-foreground">
                  (redirects to Google)
                </span>
              </Label>
              <Input
                data-ocid="settings.input"
                id="panic-key"
                value={panicKeyInput}
                onChange={(e) => setPanicKeyInput(e.target.value)}
                placeholder="e.g. Escape or g"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Type a key name like <code>Escape</code>, <code>F1</code>, or a
                letter like <code>g</code>
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              data-ocid="settings.cancel_button"
              variant="ghost"
              onClick={() => setSettingsOpen(false)}
              style={{ cursor: "pointer" }}
            >
              Cancel
            </Button>
            <Button
              data-ocid="settings.save_button"
              onClick={saveSettings}
              style={{
                background: "linear-gradient(135deg, #3A7BFF 0%, #A855FF 100%)",
                border: "none",
                cursor: "pointer",
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
