import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore"
import { db, auth } from "./firebase"
import type {
  Session,
  ProfileData,
  Role,
  Update,
  TaskRecord,
  ProjectRecord,
  Member,
  TeamRequest,
  Budget,
  Access,
} from "./api"

const DEVELOPER_EMAIL = "sakethraja.manne@gmail.com"

export const sampleInitialUpdates: Update[] = []

export function isFacultyOrAdminEmail(email: string | null): boolean {
  if (!email) return false
  const clean = email.trim().toLowerCase()
  if (clean === DEVELOPER_EMAIL.toLowerCase()) return true
  if (
    clean.startsWith("narayana") ||
    clean.includes("faculty") ||
    clean.includes("admin") ||
    clean.includes("prof") ||
    clean.includes("lead")
  ) {
    return true
  }
  // If @anurag.edu.in: Check if it's student roll format (starts with student roll pattern)
  const isStudentRoll = /^\d{2}[a-z]{2,4}\d+[a-z0-9]*@/i.test(clean)
  if (clean.endsWith("@anurag.edu.in")) {
    return !isStudentRoll
  }
  return false
}

/**
 * Loads or initializes an account document in Firestore for the authenticated Google user.
 */
export async function getOrCreateAccount(user: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  phoneNumber: string | null
}): Promise<Session> {
  const isDev = user.email?.toLowerCase() === DEVELOPER_EMAIL.toLowerCase()
  const isFaculty = isFacultyOrAdminEmail(user.email)
  const initialRole: Role = isDev ? "developer" : isFaculty ? "admin" : "student"

  let cachedProfile: ProfileData | null = null
  try {
    const raw =
      localStorage.getItem(`asrc_profile_${user.uid}`) ||
      (user.email
        ? localStorage.getItem(`asrc_profile_${user.email.toLowerCase()}`)
        : null)
    if (raw) cachedProfile = JSON.parse(raw)
  } catch {}

  const fallbackProfile: ProfileData = {
    firstName:
      cachedProfile?.firstName || user.displayName?.split(" ")[0] || "",
    lastName:
      cachedProfile?.lastName ||
      user.displayName?.split(" ").slice(1).join(" ") ||
      "",
    phone: cachedProfile?.phone || user.phoneNumber || "",
    department: cachedProfile?.department || "",
    roll: cachedProfile?.roll || "",
    bio: cachedProfile?.bio || "",
    interests: cachedProfile?.interests || [],
    achievements: cachedProfile?.achievements || "",
    photo: cachedProfile?.photo || user.photoURL || "",
  }

  const isProfileComplete = Boolean(
    cachedProfile?.firstName &&
      cachedProfile?.lastName &&
      cachedProfile?.roll &&
      cachedProfile?.department,
  )

  try {
    const userRef = doc(db, "accounts", user.uid)
    const snap = await getDoc(userRef)

    let existingData = snap.exists() ? snap.data() : null

    // If not found by UID, search by email to retrieve previous student data
    if (!existingData && user.email) {
      try {
        const emailQuery = query(
          collection(db, "accounts"),
          where("email", "==", user.email.toLowerCase()),
        )
        const emailSnap = await getDocs(emailQuery)
        if (!emailSnap.empty) {
          existingData = emailSnap.docs[0].data()
        }
      } catch {}
    }

    if (existingData) {
      const role: Role = isDev
        ? "developer"
        : isFaculty
          ? "admin"
          : existingData.role || "student"
      const profileComplete = Boolean(
        existingData.profileComplete || isProfileComplete,
      )
      const profile: ProfileData = {
        firstName: existingData.profile?.firstName || fallbackProfile.firstName,
        lastName: existingData.profile?.lastName || fallbackProfile.lastName,
        phone: existingData.profile?.phone || fallbackProfile.phone,
        department:
          existingData.profile?.department ||
          fallbackProfile.department ||
          "General",
        roll: existingData.profile?.roll || fallbackProfile.roll || "",
        bio: existingData.profile?.bio || fallbackProfile.bio || "",
        interests:
          existingData.profile?.interests || fallbackProfile.interests || [],
        achievements:
          existingData.profile?.achievements ||
          fallbackProfile.achievements ||
          "",
        photo: existingData.profile?.photo || fallbackProfile.photo,
      }

      try {
        localStorage.setItem(`asrc_profile_${user.uid}`, JSON.stringify(profile))
        if (user.email)
          localStorage.setItem(
            `asrc_profile_${user.email.toLowerCase()}`,
            JSON.stringify(profile),
          )
      } catch {}

      if (
        (isDev && existingData.role !== "developer") ||
        (isFaculty &&
          existingData.role !== "admin" &&
          existingData.role !== "developer")
      ) {
        try {
          await updateDoc(userRef, { role })
        } catch {}
      }

      return {
        id: user.uid,
        email: user.email || "",
        role,
        profileComplete,
        profile,
      }
    }

    const newAccount = {
      id: user.uid,
      email: (user.email || "").toLowerCase(),
      role: initialRole,
      profileComplete: isProfileComplete,
      profile: fallbackProfile,
      createdAt: new Date().toISOString(),
    }

    try {
      await setDoc(userRef, newAccount)
      if (user.email) {
        localStorage.setItem(`asrc_profile_${user.email.toLowerCase()}`, JSON.stringify(fallbackProfile))
      }
    } catch (e) {
      console.warn("Could not save new account to Firestore immediately:", e)
    }

    return {
      id: user.uid,
      email: user.email || "",
      role: initialRole,
      profileComplete: isProfileComplete,
      profile: fallbackProfile,
    }
  } catch (err) {
    console.warn("Firestore getOrCreateAccount fallback used:", err)
    return {
      id: user.uid,
      email: user.email || "",
      role: initialRole,
      profileComplete: isProfileComplete,
      profile: fallbackProfile,
    }
  }
}

/**
 * Saves profile updates to Cloud Firestore and local storage.
 */
export async function saveProfileToFirestore(
  userId: string,
  profile: ProfileData,
): Promise<void> {
  try {
    localStorage.setItem(`asrc_profile_${userId}`, JSON.stringify(profile))
    if (auth.currentUser?.email) {
      localStorage.setItem(`asrc_profile_${auth.currentUser.email}`, JSON.stringify(profile))
    }
  } catch {}

  const userRef = doc(db, "accounts", userId)
  await setDoc(
    userRef,
    {
      profile,
      profileComplete: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

/**
 * Fetches all updates / announcements from Firestore.
 */
export async function getUpdatesFromFirestore(): Promise<Update[]> {
  try {
    const q = query(collection(db, "updates"), orderBy("createdAt", "desc"))
    const snap = await getDocs(q)
    if (snap.empty) return sampleInitialUpdates
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Update)
  } catch {
    const snap = await getDocs(collection(db, "updates"))
    if (snap.empty) return sampleInitialUpdates
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Update)
  }
}

/**
 * Creates an update / announcement in Firestore.
 */
export async function createUpdateInFirestore(
  update: Omit<Update, "id" | "createdAt">,
): Promise<Update> {
  const newDoc = {
    ...update,
    createdAt: new Date().toISOString(),
  }
  const ref = await addDoc(collection(db, "updates"), newDoc)
  return { ...newDoc, id: ref.id }
}

/**
 * Deletes an update from Firestore.
 */
export async function deleteUpdateFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, "updates", id))
}

/**
 * Tasks operations
 */
export async function getTasksFromFirestore(userId: string): Promise<TaskRecord[]> {
  const q = query(collection(db, "tasks"), where("assignedTo", "==", userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as TaskRecord)
}

export async function toggleTaskInFirestore(
  taskId: string,
  done: boolean,
): Promise<void> {
  await updateDoc(doc(db, "tasks", taskId), { done })
}

export async function createTaskInFirestore(
  task: {
    title: string
    domain: string
    assignedTo: string
    due: string
    done: boolean
    createdBy: string
  },
): Promise<TaskRecord> {
  const ref = await addDoc(collection(db, "tasks"), task)
  return {
    id: ref.id,
    title: task.title,
    domain: task.domain,
    due: task.due,
    done: task.done,
  }
}

/**
 * Team Memberships / Domain Requests / Leadership
 */
export type DetailedStudentAccount = {
  id: string
  email: string
  role: Role
  domainLead?: string | null
  joinedDomains: string[]
  profileComplete: boolean
  profile: ProfileData
  createdAt: string
  updatedAt?: string
}

export async function getAllStudentAccounts(): Promise<DetailedStudentAccount[]> {
  try {
    const snap = await getDocs(collection(db, "accounts"))
    const memSnap = await getDocs(
      query(collection(db, "team_memberships"), where("status", "==", "approved")),
    )
    const domainMap: Record<string, string[]> = {}
    memSnap.forEach((d) => {
      const data = d.data()
      const uid = data.userId || d.id.split("_")[0]
      if (!domainMap[uid]) domainMap[uid] = []
      if (data.domain && !domainMap[uid].includes(data.domain)) {
        domainMap[uid].push(data.domain)
      }
    })

    const list: DetailedStudentAccount[] = []
    snap.forEach((d) => {
      const data = d.data()
      list.push({
        id: d.id,
        email: data.email || "",
        role: data.role || "student",
        domainLead: data.domainLead || null,
        joinedDomains: domainMap[d.id] || [],
        profileComplete: Boolean(data.profileComplete),
        profile: {
          firstName: data.profile?.firstName || "",
          lastName: data.profile?.lastName || "",
          phone: data.profile?.phone || "",
          department: data.profile?.department || "General",
          roll: data.profile?.roll || "",
          bio: data.profile?.bio || "",
          interests: data.profile?.interests || [],
          achievements: data.profile?.achievements || "",
          photo: data.profile?.photo || "",
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      })
    })
    return list
  } catch (err) {
    console.error("Failed to fetch all student accounts:", err)
    return []
  }
}

export async function assignDomainLead(
  userId: string,
  domain: string | null,
): Promise<void> {
  const userRef = doc(db, "accounts", userId)
  if (domain) {
    await updateDoc(userRef, {
      domainLead: domain,
      role: "admin",
    })
    const memId = `${userId}_${domain}`
    await setDoc(
      doc(db, "team_memberships", memId),
      {
        id: memId,
        userId,
        domain,
        status: "approved",
        role: "lead",
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )
  } else {
    await updateDoc(userRef, {
      domainLead: null,
    })
  }
}

export async function requestJoinTeamInFirestore(
  userId: string,
  domain: string,
  profile: ProfileData,
  email: string,
): Promise<void> {
  const memId = `${userId}_${domain}`
  await setDoc(
    doc(db, "team_memberships", memId),
    {
      id: memId,
      userId,
      domain,
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      email: email.toLowerCase(),
      roll: profile.roll || "",
      department: profile.department || "",
      status: "pending",
      role: "member",
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export async function directAddStudentToTeam(
  userId: string,
  domain: string,
  student: {
    firstName: string
    lastName: string
    email: string
    department?: string
    roll?: string
  },
): Promise<void> {
  const memId = `${userId}_${domain}`
  await setDoc(
    doc(db, "team_memberships", memId),
    {
      id: memId,
      userId,
      domain,
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      email: student.email.toLowerCase(),
      roll: student.roll || "",
      department: student.department || "",
      status: "approved",
      role: "member",
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  )
}

export async function getTeamRequestsFromFirestore(): Promise<
  (TeamRequest & { roll?: string; department?: string; createdAt?: string })[]
> {
  const q = query(
    collection(db, "team_memberships"),
    where("status", "==", "pending"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      domain: data.domain,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: data.email || "",
      roll: data.roll || "",
      department: data.department || "",
      createdAt: data.createdAt,
    }
  })
}

export async function approveTeamRequestInFirestore(
  membershipId: string,
): Promise<void> {
  await updateDoc(doc(db, "team_memberships", membershipId), {
    status: "approved",
    reviewedAt: new Date().toISOString(),
  })
}

export async function rejectTeamRequestInFirestore(
  membershipId: string,
): Promise<void> {
  await updateDoc(doc(db, "team_memberships", membershipId), {
    status: "rejected",
    reviewedAt: new Date().toISOString(),
  })
}

export async function getUserTeamMemberships(
  userId: string,
): Promise<Record<string, "pending" | "approved" | "rejected">> {
  try {
    const q = query(
      collection(db, "team_memberships"),
      where("userId", "==", userId),
    )
    const snap = await getDocs(q)
    const map: Record<string, "pending" | "approved" | "rejected"> = {}
    snap.forEach((d) => {
      const data = d.data()
      if (data.domain && data.status) {
        map[data.domain] = data.status
      }
    })
    return map
  } catch {
    return {}
  }
}

export async function getMembersFromFirestore(): Promise<Member[]> {
  const snap = await getDocs(collection(db, "accounts"))
  const members: Member[] = []

  snap.forEach((d) => {
    const data = d.data()
    const p = data.profile || {}
    const firstName = p.firstName || ""
    const lastName = p.lastName || ""
    const name = (firstName + " " + lastName).trim() || data.email || "Researcher"
    const initials =
      (firstName.charAt(0) + (lastName.charAt(0) || firstName.charAt(1) || "")).toUpperCase() || "AS"

    const leadRole = data.domainLead ? `${data.domainLead} Team Lead` : null

    members.push({
      id: d.id,
      name,
      initials,
      department: p.department || "Aerospace & Space Systems",
      team: data.domainLead || p.department || "Independent Researcher",
      role:
        data.role === "developer"
          ? "Director / Lead"
          : leadRole || (data.role === "admin" ? "Faculty Admin" : "Researcher"),
      color: "bg-[#e5eee6]",
    })
  })

  return members
}

/**
 * Budget operations
 */
export async function getBudgetFromFirestore(): Promise<Budget> {
  const snap = await getDocs(collection(db, "budget_entries"))
  let allocated = 0
  let spent = 0
  const entries: Budget["entries"] = []

  snap.forEach((d) => {
    const data = d.data()
    const amount = Number(data.amount) || 0
    if (data.kind === "allocation") {
      allocated += amount
    } else {
      spent += amount
    }
    entries.push({
      id: d.id,
      title: data.title || "",
      team: data.team || data.domain || "",
      kind: data.kind || "expense",
      amount,
      date: data.createdAt || new Date().toISOString(),
    })
  })

  // Provide default budget metrics if none entered yet
  if (entries.length === 0) { return { allocated: 0, spent: 0, remaining: 0, entries: [] } }

  return {
    allocated,
    spent,
    remaining: allocated - spent,
    entries,
  }
}

export async function addBudgetEntryInFirestore(
  entry: Omit<Budget["entries"][0], "id" | "date"> & {
    domain: string
    createdBy: string
  },
): Promise<Budget> {
  await addDoc(collection(db, "budget_entries"), {
    ...entry,
    createdAt: new Date().toISOString(),
  })
  return getBudgetFromFirestore()
}

/**
 * Learning / Resources progress
 */
export async function getLearningProgressFromFirestore(
  userId: string,
): Promise<string[]> {
  const q = query(
    collection(db, "learning_progress"),
    where("userId", "==", userId),
    where("done", "==", true),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data().lessonId as string)
}

export async function setLearningProgressInFirestore(
  userId: string,
  lessonId: string,
  done: boolean,
): Promise<void> {
  const progressId = `${userId}_${lessonId}`
  await setDoc(doc(db, "learning_progress", progressId), {
    userId,
    lessonId,
    done,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Access Grants
 */
export async function getAccessGrantsFromFirestore(): Promise<Access[]> {
  const snap = await getDocs(collection(db, "access_grants"))
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Access)
}

export async function grantAccessInFirestore(
  email: string,
  role: "admin" | "student",
  grantedBy: string,
): Promise<void> {
  await setDoc(doc(db, "access_grants", email.toLowerCase()), {
    id: email.toLowerCase(),
    email: email.toLowerCase(),
    role,
    status: "Active",
    grantedBy,
    createdAt: new Date().toISOString(),
  })
}

export async function revokeAccessInFirestore(email: string): Promise<void> {
  await deleteDoc(doc(db, "access_grants", email.toLowerCase()))
}

