"use client";

import { useState } from "react";

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }
      onSuccess();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-xl"
      >
        <h1 className="mb-1 text-xl font-bold text-[#1a3a5c]">Administración</h1>
        <p className="mb-6 text-sm text-gray-500">DirectTrack — Panel de gestión</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <label className="mb-1 block text-xs font-medium text-gray-600">Usuario</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e88e5]"
        />

        <label className="mb-1 block text-xs font-medium text-gray-600">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-6 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1e88e5]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#1e88e5] py-3 text-sm font-semibold text-white hover:bg-[#1565c0] disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
