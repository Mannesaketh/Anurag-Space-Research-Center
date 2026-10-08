import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  GraduationCap,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react"
import { api, backendEnabled } from "./api"
import {
  getLearningProgressFromFirestore,
  setLearningProgressInFirestore,
} from "./firestoreService"
import { learningPathCount, lessonIds, resources } from "./resourceCatalog"

const tabs = [
  "All resources",
  "Self-paced learning",
  "Tools & software",
  "Research & references",
]
const domains = [
  "All domains",
  "CANSAT",
  "CUBESAT",
  "ROCKET",
  "DRONES",
  "ROBOTICS",
  "ROVERS",
]
const previewKey = "anurag-space-research-center-preview-learning-v1"
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e3e7ed] bg-white px-4 py-2.5 text-[11px] font-bold transition hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-50"

export default function Resources({
  accountId,
  onError,
  onChecklist,
  onDownload,
}: {
  accountId?: string
  onError: (error: unknown) => void
  onChecklist: () => void
  onDownload: () => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const sections = ["all", "learning", "tools", "research"]
  const sectionIndex = sections.indexOf(searchParams.get("section") || "all")
  const tab = tabs[sectionIndex < 0 ? 0 : sectionIndex]
  const requestedDomain = searchParams.get("domain") || domains[0]
  const domain = domains.includes(requestedDomain)
    ? requestedDomain
    : domains[0]
  function setFilters(nextTab: string, nextDomain: string) {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous)
        const section = sections[tabs.indexOf(nextTab)]
        if (section === "all") params.delete("section")
        else params.set("section", section)
        if (nextDomain === domains[0]) params.delete("domain")
        else params.set("domain", nextDomain)
        return params
      },
      { preventScrollReset: true },
    )
  }
  function setTab(next: string) {
    setFilters(next, domain)
  }
  function setDomain(next: string) {
    setFilters(tab, next)
  }
  const [query, setQuery] = useState("")
  const [active, setActive] = useState<string | null>(null)
  const [completed, setCompleted] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    const load = async () => {
      try {
        let saved: string[] = []
        if (accountId) {
          saved = await getLearningProgressFromFirestore(accountId)
        } else {
          saved = JSON.parse(localStorage.getItem(previewKey) || "[]")
        }
        if (!cancelled) {
          setCompleted(
            Array.isArray(saved)
              ? saved.filter(
                  (id): id is string =>
                    typeof id === "string" && lessonIds.includes(id),
                )
              : [],
          )
        }
      } catch {
        if (!cancelled)
          setError(
            "Your learning progress could not be loaded. Retry before marking sessions complete.",
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [accountId, retry])

  async function toggleLesson(id: string) {
    if (loading || busy || error) return
    setBusy(true)
    const done = !completed.includes(id)
    const next = done
      ? [...completed, id]
      : completed.filter((item) => item !== id)
    try {
      if (accountId) {
        await setLearningProgressInFirestore(accountId, id, done)
      } else {
        localStorage.setItem(previewKey, JSON.stringify(next))
      }
      setCompleted(next)
    } catch (caught) {
      onError(caught)
    } finally {
      setBusy(false)
    }
  }
  const filtered = resources.filter(
    (resource) =>
      (tab === tabs[0] ||
        resource.kind ===
          { [tabs[1]]: "Learning", [tabs[2]]: "Tools", [tabs[3]]: "Research" }[
            tab
          ]) &&
      (domain === domains[0] ||
        resource.domains.includes(domain) ||
        resource.domains.includes(domains[0])) &&
      `${resource.title} ${resource.source} ${resource.description} ${resource.domains.join(" ")} ${resource.lessons?.map((lesson) => lesson.title).join(" ") || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const courses = resources.filter((resource) => resource.lessons)
  const finished = courses.filter((resource) =>
    resource.lessons!.every((_, index) =>
      completed.includes(`${resource.id}-${index + 1}`),
    ),
  ).length
  return (
    <>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8090a2]">
          ACADEMIC & TECHNICAL REPOSITORY
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold sm:text-[34px]">
          Technical Curricula & Research Literature.
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#7e8d9e]">
          Comprehensive instructional modules, engineering calculation tools, and peer-reviewed aerospace literature supporting research across all active center divisions.
        </p>
      </header>
      <section
        aria-label="Learning overview"
        className="mb-6 grid overflow-hidden rounded-[24px] bg-[#1b3152] text-white md:grid-cols-[1.5fr_1fr]"
      >
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[9px] font-bold tracking-[0.1em] text-[#bcd2c5]">
            <GraduationCap size={13} /> SELF-PACED CURRICULUM · OPEN ACCESS
          </span>
          <h2 className="mt-5 text-[24px] font-bold">
            Modular Technical Curriculum.
          </h2>
          <p className="mt-3 max-w-md text-[12px] leading-6 text-[#b2c2d6]">
            {learningPathCount} structured curricula featuring guided documentation, laboratory benchmarks, and engineering application exercises.
          </p>
          <button
            onClick={() => {
              setFilters(tabs[1], domains[0])
              setQuery("")
            }}
            className="mt-5 inline-flex items-center gap-3 rounded-xl bg-[#e7eee5] px-5 py-3 text-[11px] font-bold text-[#314b43]"
          >
            Access Learning Curricula <ArrowRight size={15} />
          </button>
        </div>
        <div className="flex flex-col justify-center border-t border-white/10 bg-white/[0.035] p-6 sm:p-8 md:border-t-0 md:border-l">
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#b2c2d6]">
            ACADEMIC PROGRESS RECORD
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-[42px] font-extrabold leading-none">
              {loading || error ? "—" : completed.length}
            </span>
            <span className="pb-1 text-[11px] text-[#b2c2d6]">
              / {lessonIds.length} modules completed
            </span>
          </div>
          <progress
            aria-label="Overall learning progress"
            max={lessonIds.length}
            value={loading || error ? 0 : completed.length}
            className="mission-progress mt-5 h-1.5 w-full"
          />
          <p className="mt-3 text-[11px] text-[#b2c2d6]">
            {finished} of {courses.length} curricula completed
          </p>
          <p className="mt-4 text-[9px] leading-5 text-[#96a9bf]">
            {backendEnabled
              ? "Your progress is saved to your account."
              : "Preview progress is saved only in this browser."}{" "}
            Completion reflects recorded self-guided modules.
          </p>
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ebd0c7] bg-[#fff4ee] p-4 text-[12px]"
        >
          <span>{error}</span>
          <button
            onClick={() => setRetry((value) => value + 1)}
            className={button}
          >
            Retry Synchronization
          </button>
        </div>
      )}
      <div
        role="tablist"
        aria-label="Resource categories"
        onKeyDown={(event) => {
          const index = tabs.indexOf(tab)
          const next =
            event.key === "ArrowRight"
              ? (index + 1) % tabs.length
              : event.key === "ArrowLeft"
                ? (index + tabs.length - 1) % tabs.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : null
          if (next === null) return
          event.preventDefault()
          setTab(tabs[next])
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>('[role="tab"]')
            [next]?.focus()
        }}
        className="mb-5 flex flex-wrap gap-2"
      >
        {tabs.map((item) => (
          <button
            key={item}
            role="tab"
            tabIndex={tab === item ? 0 : -1}
            aria-selected={tab === item}
            aria-controls="resource-results"
            id={`resource-tab-${tabs.indexOf(item)}`}
            onClick={() => setTab(item)}
            className={`rounded-xl border px-4 py-2.5 text-[11px] font-bold transition ${
              tab === item
                ? "border-[#1c3457] bg-[#1c3457] text-white"
                : "border-[#e3e7ed] bg-white text-[#7e8d9e] hover:bg-[#edf2f5]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search resources</span>
          <Search
            size={16}
            className="absolute top-3.5 left-4 text-[#8a9aab]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Python, CAD, rocket science…"
            className="w-full rounded-xl border border-[#dfe4eb] bg-white py-3 pr-10 pl-11 text-[12px] outline-none focus:border-[#526d8e] focus:ring-2 focus:ring-[#dce7ef]"
          />
          {query && (
            <button
              aria-label="Clear resource search"
              onClick={() => setQuery("")}
              className="absolute top-3 right-3 rounded p-0.5"
            >
              <X size={15} />
            </button>
          )}
        </label>
        <label>
          <span className="sr-only">Filter resources by domain</span>
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            className="h-full min-h-11 w-full rounded-xl border border-[#dfe4eb] bg-white px-4 py-3 text-[12px] font-semibold outline-none focus:border-[#526d8e] sm:w-44"
          >
            {domains.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mb-4 flex items-center justify-between gap-3 text-[10px] text-[#8292a4]">
        <p aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "resource" : "resources"}
          {domain !== domains[0] && ` for ${domain}`}
        </p>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={12} /> Curated external sources
        </span>
      </div>
      <section
        id="resource-results"
        role="tabpanel"
        aria-labelledby={`resource-tab-${tabs.indexOf(tab)}`}
        className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {filtered.map((resource) => {
          const Icon =
            resource.kind === "Learning"
              ? GraduationCap
              : resource.kind === "Tools"
                ? Wrench
                : BookOpen
          const count =
            resource.lessons?.filter((_, index) =>
              completed.includes(`${resource.id}-${index + 1}`),
            ).length || 0
          const selected = active === resource.id
          return (
            <article
              key={resource.id}
              className="overflow-hidden rounded-[22px] border border-[#e6e9ee] bg-white"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      resource.kind === "Learning"
                        ? "bg-[#e5eee5] text-[#58765e]"
                        : resource.kind === "Tools"
                          ? "bg-[#f4e5df] text-[#9c7263]"
                          : "bg-[#e2ecf4] text-[#557492]"
                    }`}
                  >
                    <Icon size={21} strokeWidth={1.6} />
                  </span>
                  <span className="rounded-full bg-[#f5f7f9] px-2.5 py-1 text-[8px] font-bold tracking-[0.07em] text-[#718395]">
                    {resource.kind === "Learning"
                      ? "FREE · SELF-PACED"
                      : resource.kind === "Tools"
                        ? "TOOLS & SOFTWARE"
                        : "OPEN KNOWLEDGE"}
                  </span>
                </div>
                <p className="mt-5 text-[9px] font-semibold text-[#8898a8]">
                  {resource.source}
                </p>
                <h2 className="mt-2 text-[17px] font-extrabold leading-6">
                  {resource.title}
                </h2>
                <p className="mt-3 min-h-18 text-[11px] leading-6 text-[#7e8d9e]">
                  {resource.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {resource.domains.map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-[#f2f5f7] px-2 py-1 text-[8px] font-bold text-[#778a9b]"
                    >
                      {item === "All domains" ? "EVERY DOMAIN" : item}
                    </span>
                  ))}
                </div>
                {resource.lessons ? (
                  <>
                    <div className="mt-5 flex items-center justify-between text-[9px] text-[#7e8d9e]">
                      <span className="flex items-center gap-1">
                        <Clock3 size={12} /> 3 sessions · {resource.level}
                      </span>
                      <span>{loading || error ? "—" : count}/3 complete</span>
                    </div>
                    <progress
                      aria-label={`${resource.title} progress`}
                      max={3}
                      value={count}
                      className="mission-progress mt-2 h-1 w-full"
                    />
                    <button
                      aria-expanded={selected}
                      aria-controls={`lessons-${resource.id}`}
                      onClick={() => setActive(selected ? null : resource.id)}
                      className={`${button} mt-4 w-full`}
                    >
                      {selected
                        ? "Close sessions"
                        : count === 3
                          ? "Review learning path"
                          : count > 0
                            ? "Continue learning"
                            : "Start learning"}
                      <ChevronDown
                        size={14}
                        className={selected ? "rotate-180" : ""}
                      />
                    </button>
                  </>
                ) : (
                  <a
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center justify-between border-t border-[#edf0f3] pt-4 text-[11px] font-bold"
                  >
                    Open resource <ExternalLink size={13} />
                    <span className="sr-only">
                      : {resource.title} (opens a new tab)
                    </span>
                  </a>
                )}
              </div>
              {selected && resource.lessons && (
                <div
                  id={`lessons-${resource.id}`}
                  className="border-t border-[#e6e9ee] bg-[#f8faf9] p-5"
                >
                  <p className="mb-4 text-[9px] leading-5 text-[#809187]">
                    Review the instructional material, complete the practical exercise, and record your module completion.
                  </p>
                  <ol className="space-y-5">
                    {resource.lessons.map((lesson, index) => {
                      const id = `${resource.id}-${index + 1}`,
                        done = completed.includes(id)
                      return (
                        <li key={id}>
                          <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#7b9276]">
                            SESSION 0{index + 1}
                          </p>
                          <h3 className="mt-1 text-[12px] font-bold">
                            {lesson.title}
                          </h3>
                          <p className="mt-2 text-[10px] leading-5 text-[#7e8d9e]">
                            <span className="font-semibold text-[#58765e]">
                              Exercise:{" "}
                            </span>
                            {lesson.practice}
                          </p>
                          <a
                            href={lesson.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-2 py-1 text-[10px] font-bold text-[#3e647f]"
                          >
                            Access Module Documentation <ExternalLink size={11} />
                            <span className="sr-only">
                              : {lesson.title} (opens a new tab)
                            </span>
                          </a>
                          <button
                            disabled={loading || busy || Boolean(error)}
                            aria-pressed={done}
                            onClick={() => void toggleLesson(id)}
                            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold disabled:opacity-50 ${
                              done
                                ? "border-[#c9ddcd] bg-[#e5eee5] text-[#58765e]"
                                : "border-[#e0e6e2] bg-white text-[#778a9b]"
                            }`}
                          >
                            {done ? (
                              <CheckCheck size={13} />
                            ) : (
                              <Check size={13} />
                            )}
                            {done
                              ? "Completed · undo"
                              : "Mark Module Complete"}
                            <span className="sr-only">: {lesson.title}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )}
            </article>
          )
        })}
      </section>
      {!filtered.length && (
        <div className="rounded-[22px] border border-[#e6e9ee] bg-white px-6 py-12 text-center">
          <Search size={28} className="mx-auto text-[#90a1b2]" />
          <h2 className="mt-4 text-[17px] font-bold">
            No technical resources found.
          </h2>
          <p className="mt-2 text-[12px] text-[#7e8d9e]">
            Please refine your search keywords or adjust the domain filter.
          </p>
          <button
            className={`${button} mt-5`}
            onClick={() => {
              setQuery("")
              setFilters(tabs[0], domains[0])
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <section
        aria-label="Project starter kit"
        className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-[22px] border border-[#dce5df] bg-[#edf2ed] p-6"
      >
        <div className="flex items-start gap-3">
          <Code2 size={22} className="mt-1 shrink-0 text-[#647e69]" />
          <div>
            <h2 className="text-[16px] font-bold">
              Turn what you learn into a mission.
            </h2>
            <p className="mt-2 max-w-lg text-[11px] leading-6 text-[#7d8d80]">
              Use the project checklist to define goals, assign roles, plan a
              budget, and record test results.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onChecklist} className={button}>
            Read checklist
          </button>
          <button onClick={onDownload} className={button}>
            <Download size={13} /> Download template
          </button>
        </div>
      </section>
      <p className="mt-5 text-[10px] leading-6 text-[#8c99a8]">
        Learning materials are hosted on external websites and may require a
        free account or software installation. Optional certificates, premium
        features, or hardware can cost extra. Always follow campus safety rules:
        flight, propulsion, and hardware tests need appropriate supervision and
        approvals.
      </p>
    </>
  )
}
