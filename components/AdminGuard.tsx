"use client";

import { useEffect, useState } from "react";
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const SUPER_ADMIN = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "";

const T = {
  bg: "#0a0a0a",
  yellow: "#FFCB05",
  text: "#eef0f5",
  textMute: "#7a8194",
  red: "#ef4444",
};

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === SUPER_ADMIN) {
        setStatus("authorized");
      } else if (user) {
        signOut(auth);
        setStatus("unauthorized");
      } else {
        signInWithPopup(auth, provider).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: T.bg, color: T.yellow,
        flexDirection: "column", gap: "1rem",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg, ${T.yellow}, #FFA500)`,
        }} />
        <p style={{ fontSize: "0.9rem" }}>Verifying identity...</p>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: T.bg, color: T.red,
        flexDirection: "column", gap: "1rem",
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ fontSize: "2rem" }}>⛔</div>
        <p style={{ fontWeight: 600 }}>Access Denied</p>
        <p style={{ fontSize: "0.8rem", color: T.textMute }}>This email is not authorised.</p>
      </div>
    );
  }

  return <>{children}</>;
}