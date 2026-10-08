import type { ProfileData, Member, Update } from "../types/workspace";

export const organizationName = "Anurag Space Research Center";

export const panel = "rounded-[24px] border border-[#e5e9ef] bg-white text-[#182d4c] shadow-[0_3px_20px_#1c345705]";
export const primary = "flex items-center justify-center gap-2 rounded-xl bg-[#1c3457] px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_4px_14px_#1c345726] transition hover:bg-[#284775] active:bg-[#142640] disabled:opacity-50";
export const secondary = "flex items-center justify-center gap-2 rounded-xl border border-[#d6dfe7] bg-white px-4 py-2.5 text-[11px] font-bold text-[#304866] transition hover:bg-[#f2f6f9] active:bg-[#e6ecf2] disabled:opacity-50";
export const field = "w-full rounded-xl border border-[#dce2e9] bg-white px-3.5 py-2.5 text-[11px] text-[#192b45] outline-none transition focus:border-[#6f8da8] focus:ring-2 focus:ring-[#6f8da8]/20 disabled:bg-[#f2f5f8]";
export const eyebrow = "text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#71849a]";

export const domainNames = [
  "CANSAT",
  "CUBESAT",
  "ROCKET",
  "ROVER",
  "ASTRONOMY",
] as const;

export const domains = [
  {
    name: "CANSAT",
    note: "Micro-satellite telemetry & flight hardware",
    icon: "📡",
    members: 4,
    team: "Telemetry & Sensor Systems",
    progress: 75,
    color: "bg-[#e8f1ec]",
    accent: "text-[#3f5f4b]",
  },
  {
    name: "CUBESAT",
    note: "Nanosatellite structural & orbital design",
    icon: "🛰️",
    members: 5,
    team: "Payload & Structure",
    progress: 40,
    color: "bg-[#e4ebf2]",
    accent: "text-[#364f69]",
  },
  {
    name: "ROCKET",
    note: "High-altitude propulsion & recovery avionics",
    icon: "🚀",
    members: 3,
    team: "Propulsion & Avionics",
    progress: 60,
    color: "bg-[#f5e7e4]",
    accent: "text-[#6e463d]",
  },
  {
    name: "ROVER",
    note: "Autonomous planetary traversal & mobility",
    icon: "🤖",
    members: 4,
    team: "Mobility & Robotics",
    progress: 30,
    color: "bg-[#e6e2f0]",
    accent: "text-[#4b3e63]",
  },
  {
    name: "ASTRONOMY",
    note: "Observational astrophysics & payload optics",
    icon: "🪐",
    members: 2,
    team: "Astrophysics & Payload Optics",
    progress: 50,
    color: "bg-[#e0eef2]",
    accent: "text-[#315663]",
  },
] as const;

export const sampleMembers: Member[] = [
  {
    name: "Dr. K. Narayana",
    role: "Faculty Advisor",
    department: "Aerospace Engineering",
    team: "Advisory Board",
    initials: "KN",
    color: "bg-[#dbe6de] text-[#415848]",
  },
  {
    name: "Aditya Kumar",
    role: "Student Lead",
    department: "Electronics & Communication",
    team: "Telemetry & Sensor Systems",
    initials: "AK",
    color: "bg-[#dce4ec] text-[#3b4f63]",
  },
  {
    name: "Sneha Reddy",
    role: "Subsystem Engineer",
    department: "Mechanical Engineering",
    team: "Payload & Structure",
    initials: "SR",
    color: "bg-[#f2dfdc] text-[#6d4138]",
  },
  {
    name: "Rahul Verma",
    role: "Avionics Specialist",
    department: "Computer Science & Engineering",
    team: "Propulsion & Avionics",
    initials: "RV",
    color: "bg-[#ded9e8] text-[#45385e]",
  },
  {
    name: "Pooja Sharma",
    role: "Research Member",
    department: "Electrical & Electronics Engineering",
    team: "Mobility & Robotics",
    initials: "PS",
    color: "bg-[#d7e6eb] text-[#33535e]",
  },
  {
    name: "Vikram Singh",
    role: "Research Member",
    department: "Aerospace Engineering",
    team: "Astrophysics & Payload Optics",
    initials: "VS",
    color: "bg-[#e5ded6] text-[#5e4b38]",
  },
];

export const sampleUpdates: Update[] = [
  {
    id: "sample-1",
    title: "Anurag Space Research Center Engineering Symposium",
    body: "An intensive research symposium focused on rapid prototyping, instrumentation engineering, and space-technology challenges across all research divisions. Demonstrative event for workspace environment; subject to institutional confirmation.",
    createdAt: new Date().toISOString(),
    date: new Date(Date.now() + 86400000 * 5).toISOString(),
    location: "Anurag University Campus, Auditorium 2",
    author: "Anurag Space Research Center Admin",
    category: "Hackathon",
    domain: "All domains",
  },
  {
    id: "sample-2",
    title: "CanSat Preliminary Design Review (PDR)",
    body: "Researchers should present payload structural schematics, link budget analyses, and primary telemetry benchmarks for formal technical evaluation. Demonstrative review session for workspace environment.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    date: new Date(Date.now() + 86400000 * 12).toISOString(),
    location: "Aerospace Design Lab & Virtual Link",
    author: "Telemetry Division Lead",
    category: "Event",
    domain: "CANSAT",
  },
  {
    id: "sample-3",
    title: "Laboratory Technical Report: Autonomous Flight Systems",
    body: "The Autonomous Aerial Systems division has released evaluation data regarding closed-loop flight-control algorithms and obstacle avoidance telemetry. Demonstrative technical report for workspace environment.",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    date: "",
    location: "Research Portal & Open Archive",
    author: "Autonomous Aerial Systems Group",
    category: "News",
    domain: "ROVER",
  },
];

export const blankProfile: ProfileData = {
  firstName: "",
  lastName: "",
  phone: "",
  department: "",
  roll: "",
  bio: "",
  interests: [],
  achievements: "",
};

export const sampleExpenses = [
  {
    title: "CanSat Telemetry Transceivers",
    team: "CANSAT",
    amount: "₹12,400",
    date: "Oct 02",
  },
  {
    title: "3D Printing Filament (Carbon-PETG)",
    team: "CUBESAT",
    amount: "₹3,800",
    date: "Sep 28",
  },
  {
    title: "Altimeter Test Rig Components",
    team: "ROCKET",
    amount: "₹1,800",
    date: "Sep 20",
  },
];
