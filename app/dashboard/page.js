"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [verifying, setVerifying] = useState({});
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const loadFiles = useCallback(async (userId) => {
    const { data, error } = await supabase.storage.from("documents").list(userId, {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (!error && data) {
      setFiles(data.filter((f) => f.name !== ".emptyFolderPlaceholder"));
    }
  }, []);

  const loadResults = useCallback(async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setResults(data);
    }
  }, []);

  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        loadFiles(user.id);
        loadResults();
      }
    }
    initUser();
  }, [router, loadFiles, loadResults]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !user) return;

    // Check size (≤ 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setStatusMessage({ text: "File too large. Maximum allowed size is 5MB.", type: "error" });
      return;
    }

    setUploading(true);
    setStatusMessage({ text: "", type: "" });

    // Path structure: user_id/timestamp_filename
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;

    const { error } = await supabase.storage.from("documents").upload(filePath, file);

    setUploading(false);

    if (error) {
      setStatusMessage({
        text: `Upload failed: ${error.message}. Make sure the 'documents' bucket exists in Supabase.`,
        type: "error",
      });
    } else {
      setStatusMessage({ text: `Successfully uploaded ${file.name}!`, type: "success" });
      setFile(null);
      // Reset file input element
      const fileInput = document.getElementById("file-upload");
      if (fileInput) fileInput.value = "";
      loadFiles(user.id);
    }
  }

  async function handleVerify(storageFile) {
    setVerifying((prev) => ({ ...prev, [storageFile.name]: true }));
    setStatusMessage({ text: "", type: "" });

    try {
      const filePath = `${user.id}/${storageFile.name}`;
      const { data: blob, error: downloadError } = await supabase.storage
        .from("documents")
        .download(filePath);
      if (downloadError) throw new Error(downloadError.message);

      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append("file", blob, storageFile.name);
      formData.append("filePath", filePath);

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.details || body.error || "Verification failed");
      }

      setStatusMessage({ text: `Verified ${storageFile.name}`, type: "success" });
      loadResults();
    } catch (err) {
      setStatusMessage({ text: `Verification failed: ${err.message}`, type: "error" });
    } finally {
      setVerifying((prev) => ({ ...prev, [storageFile.name]: false }));
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">
        Loading session...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6 sm:p-12 max-w-4xl mx-auto w-full gap-8">
      {/* Top Bar */}
      <header className="flex justify-between items-center pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VerifyLite Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Logged in as {user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* Upload Card */}
      <section className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 flex flex-col gap-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Upload Document for Verification</h2>
          <p className="text-xs text-zinc-500">
            Accepts PDF, PNG, JPG (maximum 5MB). Files are securely stored in your private folder.
          </p>
        </div>

        {statusMessage.text && (
          <div
            className={`p-3 rounded-lg text-sm ${
              statusMessage.type === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            id="file-upload"
            type="file"
            accept=".pdf,image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
          />
          <button
            type="submit"
            disabled={!file || uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </form>
      </section>

      {/* Document List */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Your Uploaded Documents</h2>
        {files.length === 0 ? (
          <p className="text-xs text-zinc-500 italic p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
            No documents uploaded yet. Upload a test résumé or diploma above.
          </p>
        ) : (
          <div className="grid gap-2">
            {files.map((f) => (
              <div
                key={f.id || f.name}
                className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50"
              >
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-zinc-500">
                    {f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(1)} KB` : "Uploaded"}
                  </p>
                </div>
                <button
                  onClick={() => handleVerify(f)}
                  disabled={verifying[f.name]}
                  className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {verifying[f.name] ? "Verifying..." : "Verify with AI"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Verification Results */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Verification Results</h2>
        {results.length === 0 ? (
          <p className="text-xs text-zinc-500 italic p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
            No documents verified yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {results.map((r) => (
              <div
                key={r.id}
                className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{r.file_name}</p>
                  <p className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <p className="text-sm">{r.summary}</p>
                {r.extracted && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 grid grid-cols-2 gap-1">
                    {Object.entries(r.extracted)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <span key={k}>
                          <span className="font-medium">{k}:</span> {String(v)}
                        </span>
                      ))}
                  </div>
                )}
                {r.flags?.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {r.flags.map((flag, i) => (
                      <span
                        key={i}
                        className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-2 py-1"
                      >
                        ⚠ {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
