import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-8 sm:p-16">
      <header className="flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            V
          </div>
          <span className="font-bold text-xl tracking-tight">VerifyLite</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign In
        </Link>
      </header>

      <main className="max-w-3xl mx-auto w-full my-auto text-center flex flex-col items-center gap-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          AI-Powered Verification Prototype
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Verify credentials & résumés with AI in seconds.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
          Upload documents to extract structured facts, detect anomalies, and perform semantic search across credentials.
        </p>
        <div className="flex gap-4 mt-2">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-6 py-3 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-zinc-500 py-6 border-t border-zinc-200 dark:border-zinc-800">
        VerifyLite • Built with Next.js, Supabase & Gemini
      </footer>
    </div>
  );
}
