"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Connexion impossible.");
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
        <section className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
            Martial Spirit Gym
          </p>
          <h1 className="mt-2 text-2xl font-bold">Connexion admin</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Acces protege a la zone d&apos;administration.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">
                Mot de passe
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
              />
            </label>

            {errorMessage ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Connexion..." : "Connexion"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
