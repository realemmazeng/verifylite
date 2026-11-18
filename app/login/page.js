"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    // If user already logged in, redirect to dashboard
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push("/dashboard");
    });
  }, [router]);

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else if (data?.session) {
      router.push("/dashboard");
    } else {
      setMessage({
        text: "Account created! Check your email or log in directly if confirmation is disabled.",
        type: "success",
      });
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm bg-white dark:bg-zinc-950 flex flex-col gap-6">
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:underline mb-2 inline-block">
            &larr; Back to home
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to VerifyLite</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Enter your email and password to access your documents.
          </p>
        </div>

        {message.text && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
            }`}
          >
            {message.text}
          </div>
        )}

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
              EMAIL
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@usc.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
              PASSWORD
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Sign In"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSignUp}
              className="w-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
