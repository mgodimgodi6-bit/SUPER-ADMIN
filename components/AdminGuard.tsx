"use client";

import { useEffect, useState, useRef } from "react";
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { logAudit } from "@/lib/audit";

const SUPER_ADMIN = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000;   // warn 2 min before

const T = {
  bg: "#000000",
  yellow: "#FFCB05",
  text: "#eef0f5",
  textMute: "#7a8194",
  red: "#ef4444",
};

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  // Track user activity (mouse, keyboard, scroll, click)
  useEffect(() => {
    if (status !== "authorized") return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      if (showWarning) setShowWarning(false);
    };

    window.addEventListener("mousemove", resetActivity);
    window.addEventListener("keydown", resetActivity);
    window.addEventListener("scroll", resetActivity);
    window.addEventListener("click", resetActivity);

    const checkInterval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= SESSION_TIMEOUT_MS) {
        logAudit("session_expired");
        signOut(auth).then(() => window.location.reload());
      } else if (idle >= SESSION_TIMEOUT_MS - WARNING_BEFORE_MS) {
        setShowWarning(true);
      }
    }, 10_000); // check every 10s

    return () => {
      window.removeEventListener("mousemove", resetActivity);
      window.removeEventListener("keydown", resetActivity);
      window.removeEventListener("scroll", resetActivity);
      window.removeEventListener("click", resetActivity);
      clearInterval(checkInterval);
    };
  }, [status, showWarning]);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === SUPER_ADMIN) {
        setStatus("authorized");
        lastActivityRef.current = Date.now();
        logAudit("sign_in", { email: user.email });
      } else if (user) {
        logAudit("access_denied", { attemptedEmail: user.email });
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
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.yellow }} />
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

  return (
    <>
      {children}
      {showWarning && (
        <div style={{
          position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 10000,
          background: T.bg, border: `2px solid ${T.yellow}`,
          padding: "1rem 1.25rem", borderRadius: 8,
          color: T.yellow, fontSize: "0.85rem", fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 12px 32px rgba(0,0,0,0.6)"
        }}>
          ⚠ Session expires in 2 minutes due to inactivity.
          <br />
          <span style={{ fontSize: "0.72rem", color: T.textMute, fontWeight: 400 }}>
            Move your mouse or click to stay signed in.
          </span>
        </div>
      )}
    </>
  );
}   