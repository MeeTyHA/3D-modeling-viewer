"use client";

import { useEffect, useState } from "react";
import LoginForm from "@/components/Admin/LoginForm";
import AdminDashboard from "@/components/Admin/AdminDashboard";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e88e5] border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <AdminDashboard
      onLogout={() => {
        window.location.assign("/api/auth/session?logout=1");
      }}
    />
  );
}
