import { useState, type FormEvent } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import type { Session } from "../../types/workspace";
import { field, primary } from "../../constants/workspaceData";
import GoogleSignIn from "../../GoogleSignIn";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "../../firebase";
import { getOrCreateAccount } from "../../firestoreService";

export function LoginForm({
  onLogin,
  externalError,
}: {
  onLogin: (session: Session) => void | Promise<void>;
  externalError?: string;
}) {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (mode === "verify") {
      setMode("login");
      return;
    }

    setBusy(true);
    setError("");

    try {
      let firebaseUser;
      if (mode === "login") {
        const credential = await signInWithEmailAndPassword(
          email.trim(),
          password,
        );
        firebaseUser = credential.user;
      } else {
        const credential = await createUserWithEmailAndPassword(
          email.trim(),
          password,
        );
        firebaseUser = credential.user;
      }

      const session = await getOrCreateAccount({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
      });

      await onLogin(session);
    } catch (caught: any) {
      const code = caught.code || "";
      let msg = caught.message || "Authentication failed.";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        msg = "Invalid email address or password. Please check your credentials.";
      } else if (code === "auth/email-already-in-use") {
        msg = "An account with this email address already exists. Please sign in.";
      } else if (code === "auth/weak-password") {
        msg = "Password should be at least 6 characters long.";
      } else if (code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      }

      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const activeError = externalError || error;

  return (
    <div className="mt-8 rounded-2xl border border-[#e2e7ed] bg-white p-7 shadow-xl shadow-[#1c34570a]">
      <div className="mb-5 flex gap-2">
        {(["login", "register", "verify"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(tab);
              setError("");
            }}
            className={`rounded-xl px-3 py-2 text-[11px] font-bold ${
              mode === tab
                ? "bg-[#1c3457] text-white"
                : "bg-[#f2f5f8] text-[#697a8e]"
            }`}
          >
            {tab === "login"
              ? "Sign in"
              : tab === "register"
                ? "Create account"
                : "Verification link"}
          </button>
        ))}
      </div>

      {activeError && (
        <div className="mb-4 rounded-xl bg-[#fcf0f0] p-3.5 text-[11px] font-medium text-[#b54a4a]">
          {activeError}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {mode !== "verify" ? (
          <>
            <div>
              <label className="block text-[11px] font-semibold">
                University email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@anurag.edu.in"
                className={`${field} mt-1.5`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${field} mt-1.5`}
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-[11px] font-semibold">
              Email verification link / token
            </label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Paste verification link or email token"
              className={`${field} mt-1.5`}
            />
          </div>
        )}

        <button disabled={busy} className={`${primary} w-full py-3`}>
          {busy
            ? "Authenticating..."
            : mode === "login"
              ? "Sign in to workspace"
              : mode === "register"
                ? "Create researcher account"
                : "Verify & sign in"}
          <ArrowRight size={14} />
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e8ecf0]" />
        <span className="text-[9px] font-bold text-[#98a4b3]">OR</span>
        <div className="h-px flex-1 bg-[#e8ecf0]" />
      </div>

      <GoogleSignIn onLogin={onLogin} />
    </div>
  );
}
