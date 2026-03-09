"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Users, ArrowRight, Zap } from "lucide-react";
const buttonBase = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
const buttonDefault = `${buttonBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`;
const buttonOutline = `${buttonBase} border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground`;
const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";
export default function HomePage() {
    const router = useRouter();
    const [showJoin, setShowJoin] = useState(false);
    const [pin, setPin] = useState("");
    const [nickname, setNickname] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function handleJoin() {
        if (!pin || !nickname) {
            setError("Please enter both PIN and nickname");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/game/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin, nickname }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                return;
            }
            router.push(`/play/${data.gameId}?playerId=${data.playerId}&nickname=${encodeURIComponent(nickname)}`);
        }
        catch {
            setError("Failed to join game");
        }
        finally {
            setLoading(false);
        }
    }
    return (<main className="student-arcade min-h-screen flex flex-col items-center justify-center p-4">
      <div className="arcade-lights" aria-hidden>
        <span className="light light-1"/>
        <span className="light light-2"/>
        <span className="light light-3"/>
      </div>

      <div className="flex flex-col items-center gap-3 mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary p-3 logo-bob">
            <Zap className="size-8 text-primary-foreground"/>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl text-balance title-glow">
            QuizBlitz
          </h1>
        </div>
        <p className="text-muted-foreground text-lg text-center max-w-md text-pretty">
          Create and play real-time quizzes with your class. Fast, fun, and engaging.
        </p>
      </div>

      {!showJoin ? (<>
          <div className="flex flex-col gap-4 w-full max-w-sm md:flex-row md:max-w-2xl relative z-10">
          <div className="flex-1 cursor-pointer transition-all arcade-card" onClick={() => setShowJoin(true)}>
            <div className="rounded-2xl border bg-card/85 backdrop-blur-md text-card-foreground shadow h-full overflow-hidden">
            <div className="flex flex-col space-y-1.5 p-6 items-center text-center">
              <div className="rounded-full bg-accent/20 p-4 mb-2">
                <Users className="size-8 text-accent"/>
              </div>
              <h3 className="text-xl font-semibold leading-none tracking-tight">I&#39;m a Student</h3>
              <p className="text-sm text-muted-foreground">Join a quiz using a game PIN</p>
            </div>
            <div className="p-6 pt-0 flex justify-center">
              <button className={`${buttonOutline} gap-2 arcade-glow-btn`}>
                Join Game <ArrowRight className="size-4"/>
              </button>
            </div>
            </div>
          </div>

          <div className="flex-1 cursor-pointer transition-all arcade-card" onClick={() => router.push("/auth/login")}>
            <div className="rounded-2xl border bg-card/85 backdrop-blur-md text-card-foreground shadow h-full overflow-hidden">
            <div className="flex flex-col space-y-1.5 p-6 items-center text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-2">
                <GraduationCap className="size-8 text-primary"/>
              </div>
              <h3 className="text-xl font-semibold leading-none tracking-tight">I&#39;m a Professor</h3>
              <p className="text-sm text-muted-foreground">Create quizzes and host games</p>
            </div>
            <div className="p-6 pt-0 flex justify-center">
              <button className={`${buttonDefault} gap-2 arcade-glow-btn` }>
                Get Started <ArrowRight className="size-4"/>
              </button>
            </div>
            </div>
          </div>
        </div>

        </>) : (<div className="w-full max-w-sm rounded-2xl border bg-card/90 backdrop-blur-md text-card-foreground shadow-xl relative z-10">
          <div className="flex flex-col space-y-1.5 p-6 text-center">
            <h3 className="text-xl font-semibold leading-none tracking-tight">Join a Game</h3>
            <p className="text-sm text-muted-foreground">Enter the PIN shown on screen</p>
          </div>
          <div className="p-6 pt-0 flex flex-col gap-4">
            <input placeholder="Game PIN" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} className={`${inputClass} text-center text-2xl tracking-widest h-14 font-mono`} inputMode="numeric"/>
            <input placeholder="Your Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className={`${inputClass} text-center h-12`} onKeyDown={(e) => e.key === "Enter" && handleJoin()}/>
            {error && (<p className="text-sm text-destructive text-center">{error}</p>)}
            <div className="flex gap-2">
              <button className={`${buttonOutline} flex-1 arcade-glow-btn`} onClick={() => {
                setShowJoin(false);
                setError("");
            }}>
                Back
              </button>
              <button className={`${buttonDefault} flex-1 arcade-glow-btn`} onClick={handleJoin} disabled={loading}>
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        </div>)}

      <style jsx>{`
        .student-arcade {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(800px 360px at 8% -5%, rgba(157, 78, 221, 0.35), transparent 60%),
            radial-gradient(860px 380px at 95% 8%, rgba(72, 149, 239, 0.3), transparent 62%),
            radial-gradient(700px 300px at 50% 120%, rgba(58, 12, 163, 0.28), transparent 60%),
            linear-gradient(145deg, #12163a 0%, #1f2761 45%, #161a43 100%);
        }

        .student-arcade::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle, rgba(255,255,255,0.17) 1px, transparent 1px);
          background-size: 22px 22px;
          opacity: 0.24;
        }

        .arcade-lights {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .light {
          position: absolute;
          width: 230px;
          height: 230px;
          border-radius: 999px;
          filter: blur(26px);
          animation: drift 7s ease-in-out infinite;
        }

        .light-1 { top: 8%; left: 10%; background: rgba(255, 0, 255, 0.26); }
        .light-2 { top: 20%; right: 8%; background: rgba(0, 246, 255, 0.22); animation-delay: 1s; }
        .light-3 { bottom: -8%; left: 40%; background: rgba(118, 255, 3, 0.17); animation-delay: 2s; }

        .title-glow {
          text-shadow: 0 0 18px rgba(87, 117, 255, 0.55);
          color: #f6f8ff;
        }

        .logo-bob { animation: bob 2.2s ease-in-out infinite; }

        .arcade-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 30px rgba(32, 38, 95, 0.35);
        }

        .arcade-glow-btn {
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }

        .arcade-glow-btn:hover {
          box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.5), 0 0 20px rgba(124, 58, 237, 0.45);
          transform: translateY(-1px);
        }

        @keyframes bob {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes drift {
          0%,100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-12px) translateX(8px); }
        }
      `}</style>
    </main>);
}
