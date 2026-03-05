"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
const buttonBase = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
const buttonDefault = `${buttonBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`;
const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";
export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
                return;
            }
            window.location.href = "/dashboard";
        }
        catch {
            setError("Failed to login");
        }
        finally {
            setLoading(false);
        }
    }
    return (<main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col space-y-1.5 p-6 text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="rounded-lg bg-primary p-2">
              <Zap className="size-5 text-primary-foreground"/>
            </div>
            <span className="text-xl font-bold text-foreground">QuizBlitz</span>
          </Link>
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Welcome Back</h3>
          <p className="text-sm text-muted-foreground">Sign in to your professor account</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="p-6 pt-0 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
              <input id="email" type="email" placeholder="professor@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass}/>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
              <input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass}/>
            </div>
            {error && (<p className="text-sm text-destructive text-center">{error}</p>)}
            <button type="submit" className={`${buttonDefault} w-full`} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
        <div className="p-6 pt-0 flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&#39;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>);
}
