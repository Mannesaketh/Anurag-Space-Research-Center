import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Plus,
  Rocket,
  ShieldCheck,
  Users,
  Wallet,
  ChevronRight,
} from "lucide-react";
import logo from "../../imports/image.png";
import type { ProfileData, Update, Budget, ModalType } from "../../types/workspace";
import {
  organizationName,
  domains,
  panel,
  primary,
  secondary,
  eyebrow,
} from "../../constants/workspaceData";
import { formatDate, money } from "../../utils/formatters";
import { learningPathCount, learningSessionCount } from "../../resourceCatalog";
import { backendEnabled } from "../../api";
import { SectionTitle } from "../ui/SectionTitle";
import { DomainCard } from "../ui/DomainCard";

export function Dashboard({
  profile,
  admin,
  updates,
  activeTasks,
  projectDomains,
  budget,
  teamCount,
  navigate,
  open,
}: {
  profile: ProfileData;
  admin: boolean;
  updates: Update[];
  activeTasks: number;
  projectDomains: typeof domains;
  budget: Budget;
  teamCount: number;
  navigate: (path: string) => void;
  open: (modal: ModalType) => void;
}) {
  const upcoming = updates
    .filter((update) => update.date && new Date(update.date) >= new Date())
    .sort((first, second) => first.date.localeCompare(second.date))[0];

  return (
    <>
      <section
        aria-label="Anurag Space Research Center"
        className="mb-6 flex flex-wrap items-center justify-between gap-5 rounded-[24px] border border-[#e3e8ef] bg-white px-5 py-5 shadow-[0_3px_20px_#1c345703] sm:px-7"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
          <img
            src={logo}
            alt="Your uploaded AnuragSat logo for Anurag Space Research Center"
            className="h-20 w-20 shrink-0 rounded-2xl object-contain sm:h-24 sm:w-24"
          />
          <div className="min-w-0">
            <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.17em] text-[#8b9baa]">
              ANURAG UNIVERSITY
            </p>
            <h1 className="text-[20px] font-extrabold leading-tight sm:text-[30px]">
              {organizationName}
            </h1>
            <p className="mt-2 hidden text-[9px] tracking-[0.06em] text-[#899aab] sm:block">
              Collaborate <span className="mx-1.5 text-[#ccd4dc]"> · </span> Build{" "}
              <span className="mx-1.5 text-[#ccd4dc]"> · </span> Innovate{" "}
              <span className="mx-1.5 text-[#ccd4dc]"> · </span> Launch
            </p>
          </div>
        </div>
        <div className="hidden max-w-[210px] border-l border-[#e6ece8] pl-6 xl:block">
          <p className="text-[12px] font-semibold leading-6 text-[#6e8276]">
            Student ideas today.
            <br />Pioneering Excellence in Space Science and Engineering.
          </p>
          <p className="mt-2 text-[8px] font-bold tracking-[0.1em] text-[#9aac9e]">
            INTERDISCIPLINARY RESEARCH · SCIENTIFIC EXCELLENCE
          </p>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={eyebrow}>RESEARCH & OPERATIONS CONSOLE</p>
          <h2 className="mt-1.5 text-[25px] font-extrabold sm:text-[29px]">
            Mission Operations Console<span className="text-[#da5c67]">.</span>
          </h2>
        </div>
        <span className="flex items-center gap-2 rounded-xl border border-[#e4e8ed] bg-white px-3.5 py-2.5 text-[10px] font-semibold text-[#738296]">
          <CalendarDays size={14} />
          {formatDate(new Date().toISOString(), {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <section className="relative isolate min-h-[255px] overflow-hidden rounded-[24px] bg-[#1b3152] px-6 py-8 text-white sm:px-9 sm:py-9">
        <div className="relative z-10 max-w-[440px]">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b7d8c5]" />
            <span className="text-[9px] font-bold tracking-[0.17em] text-[#b7c6da]">
              WELCOME BACK
              {profile.firstName
                ? `, ${profile.firstName.toUpperCase()}`
                : ", RESEARCHER"}
            </span>
          </div>
          <h2 className="text-[31px] font-bold leading-[1.15] sm:text-[38px]">
            Advancing Aerospace Engineering.
            <br />
            Pioneering Frontier Research.
          </h2>
          <p className="mt-3 max-w-[305px] text-[11px] leading-relaxed text-[#aebed2]">
            Collaborate, design, and advance space research missions through interdisciplinary engineering.
            Welcome to the research workspace.
          </p>
          <button
            onClick={() => navigate("/projects")}
            className="mt-6 flex items-center gap-4 rounded-xl bg-[#e9f1e9] px-4 py-2.5 text-[10px] font-extrabold text-[#213b50]"
          >
            Explore Divisions <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <nav aria-label="Dashboard quick actions" className="mt-4 flex flex-wrap gap-2">
        {[
          {
            label: "Assigned Tasks",
            icon: ClipboardList,
            action: () => navigate("/tasks"),
          },
          { label: "Research Personnel", icon: Users, action: () => navigate("/team") },
          {
            label: "Resources",
            icon: BookOpen,
            action: () => navigate("/resources"),
          },
          ...(admin
            ? [
                {
                  label: "Publish an update",
                  icon: Plus,
                  action: () => open("publish"),
                },
              ]
            : [
                {
                  label: "Complete my profile",
                  icon: GraduationCap,
                  action: () => navigate("/profile"),
                },
              ]),
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex items-center gap-2 rounded-xl border border-[#e3e8ef] bg-white px-3.5 py-2.5 text-[10px] font-semibold text-[#6d8197] transition hover:border-[#bccddc] hover:bg-[#f0f4f7] active:bg-[#e9eff3]"
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </nav>

      <section aria-label="Student resources" className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-[22px] border border-[#dce5df] bg-[#edf2ed] p-5 sm:p-6">
        <div className="flex max-w-xl items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#647e69]">
            <BookOpen size={22} strokeWidth={1.6} />
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#7b9276]">
              YOUR STUDENT LEARNING HUB
            </p>
            <h2 className="mt-1 text-[20px] font-extrabold">Resources</h2>
            <p className="mt-2 text-[11px] leading-6 text-[#728575]">
              Free self-paced learning sessions, research papers, engineering tools, and project guides. Everything in one place, ready for your next mission.
            </p>
            <p className="mt-2 text-[9px] font-semibold text-[#728575]">
              {learningPathCount} learning paths · {learningSessionCount} sessions · NASA, ISRO, ESA & MIT references
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/resources?section=learning")}
            className={primary}
          >
            <GraduationCap size={15} /> Academic Modules
          </button>
          <button onClick={() => navigate("/resources")} className={secondary}>
            Explore Technical Resources <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[
          {
            title: "ACTIVE TASKS",
            value: String(activeTasks).padStart(2, "0"),
            note: "Pending deliverables and milestones",
            icon: ClipboardList,
            color: "bg-[#e4eee7]",
            action: () => navigate("/tasks"),
          },
          ...(admin
            ? [
                {
                  title: "AVAILABLE BUDGET",
                  value: backendEnabled ? money(budget.remaining) : "₹42,000",
                  note: backendEnabled
                    ? `${
                        budget.allocated
                          ? Math.round(
                              (budget.remaining / budget.allocated) * 100,
                            )
                          : 0
                      }% of allocation remaining`
                    : "70% of sample allocation",
                  icon: Wallet,
                  color: "bg-[#f5e5e2]",
                  action: () => open("budget"),
                },
              ]
            : [
                {
                  title: "PROJECT DOMAINS",
                  value: String(projectDomains.length).padStart(2, "0"),
                  note: "Active engineering divisions",
                  icon: Rocket,
                  color: "bg-[#f5e5e2]",
                  action: () => navigate("/projects"),
                },
              ]),
          {
            title: "TEAM MEMBERS",
            value: backendEnabled ? String(teamCount).padStart(2, "0") : "12",
            note: "Enrolled research personnel",
            icon: Users,
            color: "bg-[#eae5f2]",
            action: () => navigate("/team"),
          },
          {
            title: "LATEST UPDATES",
            value: String(updates.length).padStart(2, "0"),
            note: "Institutional communications",
            icon: Megaphone,
            color: "bg-[#e1edf1]",
            action: () => navigate("/updates"),
          },
        ].map((stat) => (
          <button
            key={stat.title}
            onClick={stat.action}
            className={`${stat.color} rounded-[18px] p-4 text-left transition hover:-translate-y-0.5 sm:p-5`}
          >
            <div className="mb-4 flex items-center justify-between">
              <stat.icon size={19} strokeWidth={1.7} />
              <ArrowRight size={13} className="text-[#7d8d9c]" />
            </div>
            <p className="text-[8px] font-bold tracking-[0.11em] text-[#6e7b89]">
              {stat.title}
            </p>
            <strong className="mt-1 block text-[25px] font-extrabold">
              {stat.value}
            </strong>
            <p className="mt-1 text-[9px] text-[#717e8c]">{stat.note}</p>
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle
            title="Research & Engineering Divisions"
            label="PROJECT DOMAINS"
            action={
              <button
                onClick={() => navigate("/projects")}
                className="flex items-center gap-1 text-[10px] font-bold text-[#6e7e91]"
              >
                View all divisions <ArrowRight size={13} />
              </button>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {projectDomains.slice(0, 4).map((domain) => (
              <DomainCard
                domain={domain}
                key={domain.name}
                compact
                requested={false}
                onJoin={() => navigate("/projects")}
              />
            ))}
          </div>

          <div className="mt-6">
            <SectionTitle title="On the horizon" label="UPCOMING" />
            {upcoming ? (
              <button
                onClick={() => navigate("/updates")}
                className={`${panel} flex w-full items-center gap-4 p-4 text-left transition hover:border-[#becbd7]`}
              >
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#f6e4e0]">
                  <strong className="text-[22px] leading-tight text-[#bd6d65]">
                    {new Date(upcoming.date).getDate()}
                  </strong>
                  <span className="text-[8px] font-bold uppercase text-[#a96b65]">
                    {formatDate(upcoming.date, { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#b17872]">
                    {upcoming.category} · {upcoming.domain}
                  </span>
                  <h3 className="mt-1 truncate text-[12px] font-bold">
                    {upcoming.title}
                  </h3>
                  <p className="mt-1 truncate text-[9px] text-[#8591a0]">
                    {upcoming.location}
                  </p>
                </div>
                <ChevronRight size={17} className="shrink-0 text-[#8c98a6]" />
              </button>
            ) : (
              <div className={`${panel} p-5 text-[12px] text-[#8290a1]`}>
                No scheduled events or deadlines at this time.
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionTitle
            title="Institutional Announcements"
            label="COMMUNITY UPDATES"
            action={
              <button
                onClick={() => navigate("/updates")}
                aria-label="See all updates"
                className="rounded-lg bg-white p-2"
              >
                <ArrowRight size={14} />
              </button>
            }
          />
          <div className={`${panel} p-5`}>
            {updates.slice(0, 3).map((update, index) => (
              <button
                key={update.id}
                onClick={() => navigate("/updates")}
                className={`flex w-full gap-3 py-4 text-left ${
                  index ? "border-t border-[#edf0f3]" : "pt-0"
                }`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#688199]">
                  {update.category === "Hackathon" ? (
                    <Rocket size={15} />
                  ) : update.category === "Event" ? (
                    <CalendarDays size={15} />
                  ) : (
                    <Megaphone size={15} />
                  )}
                </span>
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.07em] text-[#9a8492]">
                    {update.category}
                  </span>
                  <h3 className="mt-1 text-[11px] font-bold leading-relaxed">
                    {update.title}
                  </h3>
                  <p className="mt-1 text-[9px] text-[#9aa4b0]">
                    {formatDate(update.createdAt)} · {update.author}
                  </p>
                </div>
              </button>
            ))}
            <button
              onClick={() => navigate("/updates")}
              className="mt-1 flex w-full items-center justify-center gap-2 border-t border-[#edf0f3] pt-4 text-[10px] font-bold text-[#6f8297]"
            >
              View All Announcements & Dispatches <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
