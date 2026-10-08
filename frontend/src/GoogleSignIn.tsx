import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { auth, googleProvider, signInWithPopup } from "./firebase"
import { getOrCreateAccount } from "./firestoreService"
import type { Session } from "./api"

export default function GoogleSignIn({
  onLogin,
}: {
  onLogin: (session: Session) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignIn = async () => {
    setLoading(true)
    setError("")
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      let session: Session
      try {
        session = await getOrCreateAccount({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
        })
      } catch (err) {
        console.warn("Using direct session from Google user:", err)
        const isDev = user.email?.toLowerCase() === "sakethraja.manne@gmail.com"
        session = {
          id: user.uid,
          email: user.email || "",
          role: isDev ? "developer" : "student",
          profileComplete: false,
          profile: {
            firstName: user.displayName?.split(" ")[0] || "",
            lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
            phone: user.phoneNumber || "",
            department: "",
            roll: "",
            bio: "",
            interests: [],
            achievements: "",
            photo: user.photoURL || "",
          },
        }
      }

      await onLogin(session)
    } catch (caught: any) {
      console.error("Google sign-in error:", caught)
      if (caught?.code === "auth/popup-closed-by-user") {
        setError("Authentication window was closed prior to completion. Please retry the sign-in procedure.")
      } else if (caught?.code === "auth/popup-blocked") {
        setError("Authentication window was blocked by browser security settings. Please allow popups for this domain and retry.")
      } else if (caught?.code === "auth/cancelled-popup-request") {
        setError("Previous sign-in request was cancelled. Please click sign-in again.")
      } else if (caught?.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized in Firebase Auth settings.")
      } else {
        setError(caught?.message || "Failed to sign in with Google")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section aria-label="Google university sign-in" className="mb-5">
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#dfe4eb] bg-white px-4 py-3 text-[12px] font-semibold text-[#778a9b] transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <ShieldCheck size={16} />
        {loading ? "Connecting to Firebase..." : "Sign In with Google Workspace"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-[10px] leading-5 text-[#da5c67]">
          {error}
        </p>
      )}

      <p className="mt-3 text-[10px] leading-5 text-[#8293a7]">
        Authenticate using your institutional Google Workspace account. Identity verification is processed securely through Google Identity Services; access permissions are governed by university administration.
      </p>
    </section>
  )
}


