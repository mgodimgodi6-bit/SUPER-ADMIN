import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export type AuditAction =
  | "sign_in"
  | "sign_out"
  | "session_expired"
  | "view_dashboard"
  | "view_project"
  | "access_denied"
  | "api_call";

export async function logAudit(action: AuditAction, details?: Record<string, any>) {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;

    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    await addDoc(collection(db, "audit_logs"), {
      action,
      email: user.email,
      uid: user.uid,
      timestamp: serverTimestamp(),
      expiresAt: ninetyDaysFromNow,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server",
      details: details || {},
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

export { db };