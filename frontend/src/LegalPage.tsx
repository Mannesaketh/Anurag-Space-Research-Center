import { useEffect } from "react"
import { Link, useLocation } from "react-router"
import { ArrowLeft, ArrowUpRight, FileText, ShieldCheck } from "lucide-react"
import logo from "./imports/image.png"

export default function LegalPage() {
  const privacy = useLocation().pathname === "/privacy"
  const title = privacy ? "Privacy policy" : "Terms of service"
  const email = (import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL || "").trim()
  const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · Anurag Space Research Center`
    return () => {
      document.title = previous
    }
  }, [title])
  const sections = privacy
    ? [
        {
          title: "Information used to run your account",
          paragraphs: [
            "Google sign-in uses your verified university email, Google account identifier, name, and university-domain verification to authenticate you. The server checks Google's signed identity token; it does not store the Google identity token in the database or browser storage. The application does not request access to Google Drive, Gmail messages, or your calendar.",
            "Your student profile contains your first and last name, contact number, department, roll number, research interests, biography, previous achievements, and any profile photo you choose to upload. Photos are optional and accept JPEG or PNG files up to 2 MB; processing crops and re-encodes the image for use in the app.",
            "The service also stores account permissions, team requests, assigned tasks, notification read status, and self-reported learning progress. If you create an email/password account, your password is stored as a BCrypt hash rather than as readable text.",
          ],
        },
        {
          title: "How your information is used",
          paragraphs: [
            "Information is used to verify university membership, manage account access, maintain your profile, coordinate research teams, deliver in-app updates, and save your learning progress. Google identity information is used for authentication, not advertising.",
            "Authorised workspace members can see shared directory information such as your name, department, team, role, and profile photo. Contact numbers, email addresses, and roll numbers are excluded from the shared member directory. Administrators manage team requests and activities; only the developer can grant or revoke admin permissions.",
          ],
        },
        {
          title: "Hosting, providers, and external links",
          paragraphs: [
            "The deploying institution and its authorised technical operators manage the application and cloud infrastructure. Hosting and security providers may process technical request information under their own institutional privacy policies.",
            "Google handles Google authentication, and Google Fonts provides the interface font. Those services may receive browser and network information when used. Learning resources link to external providers; opening a link takes you to a service with its own privacy policy. There is no configured advertising or analytics integration in this release.",
          ],
        },
        {
          title: "Cookies and security",
          paragraphs: [
            "Essential cookies keep you signed in and protect requests. The session cookie is HttpOnly and expires after eight hours. A short-lived Google challenge and a CSRF token protect sign-in and changes to your account. HTTPS deployments use Secure session cookies; signing out invalidates your account's active sessions.",
            "Application authentication tokens are not stored in local storage. Budget information, role management, and administrative operations are protected by server-side permissions. No security measure can eliminate every risk; do not upload confidential research or personal information you are not authorised to share.",
          ],
        },
        {
          title: "Your choices, retention, and requests",
          paragraphs: [
            "You can edit your profile, replace or remove your photo, and update your learning progress. The app does not currently offer self-service account deletion or data export. Contact the institution's designated administrator to request access, correction, deletion, or assistance.",
            "The institution must establish and communicate its retention schedule, backup handling, applicable legal requirements, and request process before public launch. This draft does not promise a retention period or deletion deadline that has not been approved by the institution.",
          ],
        },
      ]
    : [
        {
          title: "University accounts and access",
          paragraphs: [
            "This workspace supports students and authorised staff of Anurag Space Research Center. Sign in using your verified @anurag.edu.in identity and complete the required student profile before entering the workspace. Keep your account credentials private and provide accurate profile information.",
            "Authentication establishes your identity; permissions are assigned by the server. Students receive student access. Admin access is assigned by the developer and is not granted by signing in or changing a browser setting. Team membership requests require administrative approval.",
          ],
        },
        {
          title: "Responsible participation",
          paragraphs: [
            "Use the workspace for learning, research coordination, and university activities. Treat other participants respectfully. Do not impersonate another person, attempt to bypass access controls, misuse another student's data, or upload unlawful, harmful, or unauthorised material.",
            "Only share work and images you have permission to use. Follow your institution's research, intellectual-property, confidentiality, academic-integrity, and safety policies. Those policies remain applicable when you use this application.",
          ],
        },
        {
          title: "Research resources and third-party services",
          paragraphs: [
            "Resources and self-paced sessions link to external learning providers. Their availability, content, certificates, and any optional charges are governed by those providers. Learning progress in this app is self-reported and is not an independently verified qualification.",
            "Gazebo and digital-twin materials are learning references, not a live hosted robotics simulator or a connection to physical equipment. Research content does not replace qualified supervision, engineering validation, or permission to operate hardware.",
          ],
        },
        {
          title: "Administrative information and availability",
          paragraphs: [
            "Authorised administrators can publish updates, assign tasks, review team requests, and access restricted budgets. Administrators are responsible for checking the information they publish and following institutional processes. In-app budget records do not process payments or substitute for official financial approval.",
            "Features may be unavailable during maintenance or provider interruptions. Verify important event dates, research instructions, and operational decisions through official university channels. The institution must review applicable service commitments and legal terms before launch.",
          ],
        },
        {
          title: "Privacy, questions, and policy changes",
          paragraphs: [
            "The privacy policy explains the information collected and the services used by this application. Contact the institution's designated administrator for account problems, privacy requests, or questions about permitted use.",
            "These draft terms describe the current implementation. The deploying institution must approve the final terms, contact details, and any jurisdiction-specific requirements before using them as an official public policy.",
          ],
        },
      ]
  const Icon = privacy ? ShieldCheck : FileText
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <Link
            to="/"
            className="flex max-w-xs items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#617a6b]"
          >
            <img
              src={logo}
              alt="Anurag Space Research Center logo"
              className="h-14 w-14 shrink-0 rounded-lg object-contain"
            />
            <span>
              <span className="block text-[13px] font-extrabold leading-relaxed">
                Anurag Space Research Center
              </span>
              <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.18em] text-[#8b9baa]">
                Anurag University
              </span>
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[11px] font-bold transition hover:bg-background"
          >
            Back to sign in <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-3xl">
          <div className="mb-6 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#6e897a]">
            <Icon size={16} /> Trust &amp; transparency
          </div>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#758498]">
            {privacy
              ? "How your university identity and research profile are used in this workspace."
              : "A shared framework for learning, collaborating, and building responsibly."}
          </p>
        </div>
        <div
          role="note"
          className="mt-8 max-w-3xl rounded-2xl border border-[#e7d9b8] bg-[#faf5e9] px-5 py-4 text-[11px] leading-6 text-[#84724a]"
        >
          <strong className="block font-bold">
            Draft for institutional review
          </strong>
          The institution must approve this policy, confirm its retention and
          contact arrangements, and remove the draft notice before submitting it
          as an official production policy to Google.
        </div>
        <div className="mt-10 grid gap-9 lg:grid-cols-[200px_1fr] lg:gap-14">
          <nav
            aria-label="Policy pages"
            className="flex flex-wrap gap-2 self-start lg:sticky lg:top-8 lg:flex-col"
          >
            {[
              { path: "/privacy", label: "Privacy policy" },
              { path: "/terms", label: "Terms of service" },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={
                  (privacy ? "/privacy" : "/terms") === item.path
                    ? "page"
                    : undefined
                }
                className={`rounded-xl px-4 py-3 text-[11px] font-bold transition ${
                  (privacy ? "/privacy" : "/terms") === item.path
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-white text-[#758498] hover:bg-[#eef2f4]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <p className="mt-3 hidden px-4 text-[10px] leading-5 text-[#91a0ad] lg:block">
              These pages are public.
              <br />
              Your workspace remains protected.
            </p>
          </nav>
          <article className="min-w-0 rounded-3xl border border-border bg-white px-6 sm:px-9">
            {sections.map((section, index) => (
              <section
                key={section.title}
                aria-labelledby={`policy-section-${index}`}
                className="border-b border-[#edf0f3] py-8"
              >
                <p className="text-[9px] font-bold tracking-[0.16em] text-[#95a5af]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2
                  id={`policy-section-${index}`}
                  className="mt-3 text-lg font-extrabold leading-relaxed"
                >
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-[13px] leading-7 text-[#728195]"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
            <section className="py-8">
              <h2 className="text-lg font-extrabold">Contact the center</h2>
              {supportEmail ? (
                <p className="mt-4 text-[13px] leading-7 text-[#728195]">
                  For account support or privacy requests, contact{" "}
                  <a
                    href={`mailto:${encodeURIComponent(supportEmail)}`}
                    className="break-all font-semibold text-primary underline decoration-[#bcccd1] underline-offset-4"
                  >
                    {supportEmail}
                  </a>
                  .
                </p>
              ) : (
                <p className="mt-4 text-[13px] leading-7 text-[#728195]">
                  Contact the center administrator through your university's
                  official channels. The deployment owner must configure an
                  approved public support email before publishing the final
                  policy.
                </p>
              )}
            </section>
          </article>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 text-[10px] text-[#8999a8]">
          <span>Anurag Space Research Center · Anurag University</span>
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-[#61758b]"
          >
            <ArrowLeft size={13} /> Return to sign in
          </Link>
        </footer>
      </main>
    </div>
  )
}

