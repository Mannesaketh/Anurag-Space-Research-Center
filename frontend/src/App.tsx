import { useEffect, useRef, useState } from "react";
import {
  createBrowserRouter,
  Link,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  GraduationCap,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Rocket,
  Search,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import Resources from "./Resources";
import LaunchScreen from "./LaunchScreen";
import GoogleSignIn from "./GoogleSignIn";
import LegalPage from "./LegalPage";

import {
  auth,
  onAuthStateChanged,
} from "./firebase";
import {
  getOrCreateAccount,
  saveProfileToFirestore,
  getUpdatesFromFirestore,
  createUpdateInFirestore,
  deleteUpdateFromFirestore,
  getTasksFromFirestore,
  toggleTaskInFirestore,
  getMembersFromFirestore,
  getBudgetFromFirestore,
  getTeamRequestsFromFirestore,
  getUserTeamMemberships,
  requestJoinTeamInFirestore,
  getAccessGrantsFromFirestore,
  grantAccessInFirestore,
  revokeAccessInFirestore,
} from "./firestoreService";

import {
  api,
  ApiError,
  backendEnabled,
  discoverSameOriginBackend,
  resolveProfile,
  type Budget,
  type Member,
  type ProjectRecord,
  type Session,
  type TaskRecord,
  type TeamRequest,
} from "./api";

import type { Role, ProfileData, Access, ModalType, Update } from "./types/workspace";
import {
  organizationName,
  domains,
  domainNames,
  sampleMembers,
  sampleUpdates,
  blankProfile,
  sampleExpenses,
  panel,
  primary,
  secondary,
  eyebrow,
  field,
} from "./constants/workspaceData";
import { formatDate, downloadEvent, money, normalizeUpdateBranding } from "./utils/formatters";

import { Brand } from "./components/ui/Brand";
import { Avatar } from "./components/ui/Avatar";
import { Tag } from "./components/ui/Tag";
import { PageTitle } from "./components/ui/PageTitle";
import { SectionTitle } from "./components/ui/SectionTitle";
import { Modal } from "./components/ui/Modal";
import { DomainCard } from "./components/ui/DomainCard";

import { Dashboard } from "./components/workspace/Dashboard";
import { Profile } from "./components/workspace/Profile";
import { LoginForm } from "./components/workspace/LoginForm";
import { Publish } from "./components/workspace/PublishModal";
import { AccessInvite } from "./components/workspace/AccessInviteModal";
import { BudgetForm } from "./components/workspace/BudgetModal";
import { TaskAssignment } from "./components/workspace/TaskAssignmentModal";

function Workspace() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = `${organizationName}`;
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
  }, []);

  const routeView = location.pathname.split("/")[1] || "home";
  const view = routeView === "library" ? "resources" : routeView;

  useEffect(() => {
    if (routeView === "library") navigate("/resources", { replace: true });
  }, [routeView, navigate]);

  const [role, setRole] = useState<Role>("student");
  const admin = role !== "student";
  const [profile, setProfile] = useState<ProfileData>(blankProfile);
  const [login, setLogin] = useState(true);
  const [ready, setReady] = useState(!backendEnabled);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroComplete(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  const [loginError, setLoginError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [liveTasks, setLiveTasks] = useState<TaskRecord[]>([]);
  const [liveProjects, setLiveProjects] = useState<ProjectRecord[]>([]);
  const [liveMembers, setLiveMembers] = useState<Member[]>([]);
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([]);
  const [liveBudget, setLiveBudget] = useState<Budget>({
    allocated: 0,
    spent: 0,
    remaining: 0,
    entries: [],
  });

  const knownUpdates = useRef<Set<string> | null>(null);
  const [onboard, setOnboard] = useState(false);
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [toast, setToast] = useState("");
  const [popup, setPopup] = useState<Update | null>(null);
  const [read, setRead] = useState<string[]>([]);
  const [requests, setRequests] = useState<string[]>([]);
  const [taskDone, setTaskDone] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [updateFilter, setUpdateFilter] = useState("All");
  const [access, setAccess] = useState<Access[]>([]);
  const [updates, setUpdates] = useState<Update[]>(() => {
    if (backendEnabled) return [];
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem("asrc-preview-updates-v1") || "null"
      );
      if (Array.isArray(stored)) return stored.map(normalizeUpdateBranding);
    } catch {}
    return sampleUpdates;
  });

  function reportError(caught: unknown) {
    const message =
      caught instanceof ApiError
        ? caught.message
        : "Unable to establish a connection with the backend research service. Please retry.";
    if (caught instanceof ApiError && caught.status === 401) {
      setSession(null);
      setProfile(blankProfile);
      setLogin(true);
      setLoginError(message);
      knownUpdates.current = null;
    }
    setToast(message);
  }

  async function refreshWorkspace(currentRole: Role, userId?: string) {
    const uid = userId || session?.id || auth.currentUser?.uid || "";
    const [updatesList, taskRecords, members, userMemberships] = await Promise.all([
      getUpdatesFromFirestore(),
      uid ? getTasksFromFirestore(uid) : Promise.resolve([]),
      getMembersFromFirestore(),
      uid ? getUserTeamMemberships(uid) : Promise.resolve<Record<string, "pending" | "approved" | "rejected">>({}),
    ]);

    const projects: ProjectRecord[] = domains.map((domain) => ({
      name: domain.name,
      team: domain.team,
      members: domain.members,
      progress: domain.progress,
      requested:
        userMemberships[domain.name] === "pending" ||
        userMemberships[domain.name] === "approved",
    }));

    const fresh =
      knownUpdates.current &&
      updatesList.find((item) => !knownUpdates.current!.has(item.id));
    knownUpdates.current = new Set(updatesList.map((item) => item.id));
    setUpdates(updatesList);
    setLiveProjects(projects);
    setRequests(
      projects
        .filter((project) => project.requested)
        .map((project) => project.name),
    );
    setLiveTasks(taskRecords);
    setLiveMembers(members);
    if (fresh) setPopup(fresh);

    if (currentRole !== "student") {
      const [budget, pending] = await Promise.all([
        getBudgetFromFirestore(),
        getTeamRequestsFromFirestore(),
      ]);
      setLiveBudget(budget);
      setTeamRequests(pending);
    } else {
      setLiveBudget({ allocated: 0, spent: 0, remaining: 0, entries: [] });
      setTeamRequests([]);
    }

    if (currentRole === "developer") {
      setAccess(await getAccessGrantsFromFirestore());
    } else {
      setAccess([]);
    }
  }

  async function acceptSession(next: Session) {
    setSession(next);
    setRole(next.role);
    setProfile(resolveProfile(next.profile));
    setLoginError("");
    setOnboard(!next.profileComplete);
    await refreshWorkspace(next.role, next.id);
    setLogin(false);
  }

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;
      if (firebaseUser) {
        try {
          const userSession = await getOrCreateAccount({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            phoneNumber: firebaseUser.phoneNumber,
          });
          if (!cancelled) {
            await acceptSession(userSession);
          }
        } catch (err) {
          console.error("Failed to restore session from Firebase:", err);
          if (!cancelled) setLogin(true);
        }
      } else {
        if (!cancelled) {
          setSession(null);
          setLogin(true);
        }
      }
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    setMenu(false);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  useEffect(() => {
    if (
      (!admin && view === "admin") ||
      (role !== "developer" && view === "access")
    )
      navigate("/", { replace: true });
  }, [role, admin, view, navigate]);

  const unread = updates.filter((update) => !read.includes(update.id));
  const navigation = [
    { path: "/", label: "Overview", icon: Home },
    { path: "/projects", label: "Project domains", icon: Rocket },
    { path: "/tasks", label: "Assigned Tasks", icon: ClipboardList },
    { path: "/team", label: "Research Personnel", icon: Users },
    { path: "/updates", label: "News & updates", icon: Megaphone },
    { path: "/assistant", label: "AI guide", icon: Bot },
    { path: "/resources", label: "Resources", icon: BookOpen },
    { path: "/profile", label: "My profile", icon: GraduationCap },
  ];

  function open(next: ModalType) {
    if ((next === "publish" || next === "budget" || next === "assign") && !admin) return;
    if (next === "access" && role !== "developer") return;
    setModal(next);
  }

  async function publish(update: Update) {
    if (!admin) return;
    try {
      const saved = await createUpdateInFirestore({
        title: update.title,
        body: update.body,
        category: update.category,
        domain: update.domain,
        date: update.date ? new Date(update.date).toISOString() : "",
        location: update.location,
        author: `${profile.firstName} ${profile.lastName}`.trim() || "Anurag Space Research Center team",
      });
      setModal(null);
      setToast("Announcement published.");
      await refreshWorkspace(role);
      setPopup(saved);
    } catch (caught) {
      reportError(caught);
    }
  }

  async function removeUpdate(id: string) {
    if (!admin || !window.confirm("Remove this update from the workspace?")) return;
    try {
      await deleteUpdateFromFirestore(id);
      await refreshWorkspace(role);
      setToast("Announcement removed.");
    } catch (caught) {
      reportError(caught);
    }
  }

  async function saveProfile(next: ProfileData) {
    if (session) {
      await saveProfileToFirestore(session.id, next);
      const resolved = resolveProfile(next);
      setProfile(resolved);
      setSession((prev) => prev && { ...prev, profileComplete: true, profile: next });
      setOnboard(false);
      setToast("Your profile has been saved to your account.");
      await refreshWorkspace(role, session.id);
      if (onboard) navigate("/");
    } else {
      setProfile(next);
      setToast("Profile saved for this preview session.");
      if (onboard) {
        setOnboard(false);
        navigate("/");
      }
    }
  }

  async function logout() {
    try {
      await auth.signOut();
      setSession(null);
      setProfile(blankProfile);
      setLiveTasks([]);
      setLiveMembers([]);
      setLiveProjects([]);
      setAccess([]);
      setUpdates([]);
      setLiveBudget({ allocated: 0, spent: 0, remaining: 0, entries: [] });
      setLogin(true);
    } catch (caught) {
      reportError(caught);
    }
  }

  const teamResults = (backendEnabled ? liveMembers : sampleMembers).filter(
    (member) =>
      `${member.name} ${member.department} ${member.team}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const tasks = backendEnabled
    ? liveTasks.map((task) => ({
        ...task,
        due: formatDate(task.due),
        urgency: "ASSIGNED TO YOU",
      }))
    : [];

  const completedCount = backendEnabled
    ? liveTasks.filter((task) => task.done).length
    : taskDone.length;

  const taskIsDone = (index: number) =>
    backendEnabled ? Boolean(liveTasks[index]?.done) : taskDone.includes(index);

  async function toggleTask(index: number) {
    const task = liveTasks[index];
    if (!task) return;
    try {
      await toggleTaskInFirestore(task.id, !task.done);
      setLiveTasks((prev) =>
        prev.map((entry) => (entry.id === task.id ? { ...entry, done: !entry.done } : entry))
      );
    } catch (caught) {
      reportError(caught);
    }
  }

  const workspaceDomains = domains.map((template) => {
    const project = liveProjects.find((entry) => entry.name === template.name);
    return {
      ...template,
      team: project?.team || `${template.name} research team`,
      members: project?.members || template.members,
      progress: project?.progress || template.progress,
    };
  });

  async function joinTeam(name: string) {
    try {
      if (session) {
        await requestJoinTeamInFirestore(session.id, name, profile, session.email);
      }
      setRequests((prev) => [...new Set([...prev, name])]);
      setToast("Your request to join the research domain has been submitted.");
    } catch (caught) {
      reportError(caught);
    }
  }

  const sidebar = (
    <>
      <Brand />
      <div className="mb-3 mt-9 flex items-center justify-between px-3">
        <span className="text-[8px] font-bold tracking-[0.15em] text-[#a1aab7]">
          WORKSPACE
        </span>
        <span className="rounded bg-[#f0f3f5] px-1.5 py-0.5 text-[8px] text-[#8a98a8]">
          2026
        </span>
      </div>
      <nav className="space-y-1">
        {navigation.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-current={location.pathname === item.path ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[11px] font-semibold transition ${
              location.pathname === item.path
                ? "bg-[#1e3556] text-white shadow-[0_4px_10px_#1e35561a]"
                : "text-[#8490a0] hover:bg-[#f2f5f7]"
            }`}
          >
            <item.icon size={17} strokeWidth={1.7} />
            {item.label}
          </button>
        ))}
      </nav>
      {admin && (
        <div className="mt-6 border-t border-[#edf0f3] pt-5">
          <button
            onClick={() => navigate("/admin")}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[11px] font-semibold ${
              view === "admin" ? "bg-[#e9eee6] text-[#60775b]" : "text-[#8490a0]"
            }`}
          >
            <Settings2 size={17} />
            Admin studio
          </button>
        </div>
      )}
      <div className="mt-auto pt-8">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl border border-[#e5e9ef] p-3 text-[10px] font-bold text-[#b54a4a] hover:bg-[#fcf0f0]"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </>
  );

  if (!introComplete || !ready)
    return <LaunchScreen connecting={introComplete && !ready} />;

  if (login || !backendEnabled || !session)
    return (
      <main className="grid min-h-dvh bg-[#f5f6f8] p-5 lg:grid-cols-2 lg:p-0">
        <section className="hidden flex-col justify-between bg-[#1b3152] p-16 text-white lg:flex">
          <div className="rounded-xl bg-white p-2 w-fit">
            <Brand />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[#a7c1c5]">
              ANURAG SPACE RESEARCH CENTER
            </p>
            <h1 className="mt-6 text-[54px] font-bold leading-[1.12]">
              Student ideas today.
              <br />
              <span className="text-[#bcd4c4]">
                A brighter tomorrow
                <br />
                in space.
              </span>
            </h1>
            <p className="mt-6 text-[13px] text-[#9caec5]">
              Collaborate · Build · Innovate · Launch
            </p>
          </div>
          <p className="text-[10px] text-[#93a5bd]">
            Anurag Space Research Center · Anurag University
          </p>
        </section>
        <section className="flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            <Brand />
            <LoginForm externalError={loginError} onLogin={acceptSession} />
          </div>
        </section>
      </main>
    );

  return (
    <div className="min-h-dvh bg-[#f5f6f8] lg:grid lg:grid-cols-[225px_1fr] 2xl:grid-cols-[245px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-[#e5e9ef] bg-white px-5 py-6 lg:flex">
        {sidebar}
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#e5e9ef] bg-white/95 backdrop-blur-md">
          <div className="flex min-h-[86px] items-center justify-between gap-2 px-3 py-3 sm:px-8">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
              <button
                onClick={() => setMenu(true)}
                aria-label="Open navigation"
                className="shrink-0 rounded-xl p-1.5 lg:hidden"
              >
                <Menu size={22} />
              </button>
              <Brand header />
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate("/profile")}
                aria-label="Open profile"
              >
                <Avatar profile={profile} size="h-9 w-9" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1450px] px-5 py-7 pb-28 sm:px-8 lg:px-9 lg:py-8 lg:pb-10">
          {view === "home" && (
            <Dashboard
              profile={profile}
              admin={admin}
              updates={updates}
              activeTasks={tasks.length - completedCount}
              projectDomains={workspaceDomains}
              budget={liveBudget}
              teamCount={liveMembers.length}
              navigate={navigate}
              open={open}
            />
          )}
          {view === "projects" && (
            <>
              <PageTitle
                label="COLLABORATE · BUILD · LAUNCH"
                title="Find your mission."
                description={`${domainNames.length} domains. Endless possibilities. Find a team and start building.`}
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {workspaceDomains.map((domain) => (
                  <DomainCard
                    domain={domain}
                    key={domain.name}
                    requested={requests.includes(domain.name)}
                    onJoin={() => void joinTeam(domain.name)}
                    onResources={() => navigate(`/resources?domain=${domain.name}`)}
                  />
                ))}
              </div>
            </>
          )}
          {view === "profile" && (
            <Profile profile={profile} onboard={onboard} save={saveProfile} />
          )}
          {view === "tasks" && (
            <>
              <PageTitle
                label="ONE STEP CLOSER TO LAUNCH"
                title="My tasks"
                description="Small steps. Strong systems. Successful missions."
                action={
                  admin && (
                    <button onClick={() => open("assign")} className={primary}>
                      <Plus size={14} /> Assign task
                    </button>
                  )
                }
              />
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <button
                    key={task.title}
                    onClick={() => void toggleTask(index)}
                    className={`${panel} flex w-full items-center gap-4 p-5 text-left`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                        taskIsDone(index) ? "bg-[#728b75] text-white" : "border-[#ccd5df]"
                      }`}
                    >
                      {taskIsDone(index) && <Check size={14} />}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-[13px] font-bold">{task.title}</h3>
                      <p className="mt-2 text-[10px] text-[#8b97a6]">{task.domain} · Due {task.due}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "team" && (
            <>
              <PageTitle
                label="RESEARCH DIRECTORY"
                title="Research Personnel Directory"
                description="Interdisciplinary faculty, engineers, and student researchers across active divisions."
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {teamResults.map((member) => (
                  <article key={member.name} className={`${panel} p-6`}>
                    <div className="flex items-center justify-between">
                      <span className={`${member.color} flex h-12 w-12 items-center justify-center rounded-2xl text-[13px] font-bold`}>
                        {member.initials}
                      </span>
                      <Tag>{member.role}</Tag>
                    </div>
                    <h3 className="mt-5 text-[14px] font-extrabold">{member.name}</h3>
                    <p className="mt-1 text-[10px] text-[#8b96a5]">{member.department}</p>
                  </article>
                ))}
              </div>
            </>
          )}
          {view === "updates" && (
            <>
              <PageTitle
                label="STAY CURIOUS. STAY CONNECTED."
                title="News & opportunities"
                description="Hackathons, community events, research news, and what's next."
                action={
                  admin && (
                    <button onClick={() => open("publish")} className={primary}>
                      <Plus size={15} /> Publish update
                    </button>
                  )
                }
              />
              <div className="space-y-4">
                {updates.map((update) => (
                  <article key={update.id} className={`${panel} p-6`}>
                    <Tag>{update.category}</Tag>
                    <h3 className="mt-2 text-[16px] font-bold">{update.title}</h3>
                    <p className="mt-2 text-[12px] text-[#6d7c8d]">{update.body}</p>
                  </article>
                ))}
              </div>
            </>
          )}
          {view === "resources" && (
            <Resources
              key={session?.id || "preview"}
              accountId={session?.id}
              onError={reportError}
            />
          )}
        </main>
      </div>

      {menu && (
        <Modal title="Your workspace" onClose={() => setMenu(false)}>
          <div className="flex min-h-[500px] flex-col">{sidebar}</div>
        </Modal>
      )}
      {modal === "publish" && (
        <Modal title="Publish Announcement" onClose={() => setModal(null)}>
          <Publish onPublish={publish} />
        </Modal>
      )}
      {modal === "assign" && (
        <Modal title="Assign Task" onClose={() => setModal(null)}>
          <TaskAssignment members={liveMembers} onAssigned={() => setModal(null)} onError={reportError} />
        </Modal>
      )}
      {modal === "budget" && (
        <Modal title="Budget Transaction" onClose={() => setModal(null)}>
          <BudgetForm onAdded={() => setModal(null)} onError={reportError} />
        </Modal>
      )}
    </div>
  );
}

function WorkspaceBootstrap() {
  const [checked, setChecked] = useState(backendEnabled);
  useEffect(() => {
    if (checked) return;
    let active = true;
    void discoverSameOriginBackend().finally(() => {
      if (active) setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [checked]);
  return checked ? <Workspace /> : <LaunchScreen connecting />;
}

const router = createBrowserRouter([
  { path: "/privacy", Component: LegalPage },
  { path: "/terms", Component: LegalPage },
  { path: "*", Component: WorkspaceBootstrap },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
