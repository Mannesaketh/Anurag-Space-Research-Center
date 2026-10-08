export type Role = "student" | "admin" | "developer"
export type ProfileData = {
  firstName: string
  lastName: string
  phone: string
  department: string
  roll: string
  bio: string
  interests: string[]
  achievements: string
  photo: string
}
export type Update = {
  id: string
  title: string
  body: string
  category: string
  domain: string
  date: string
  location: string
  createdAt: string
  author: string
}
export type Access = {
  id: string
  email: string
  role: "admin" | "student"
  status: "Invited" | "Active"
}
export type Session = {
  id: string
  email: string
  role: Role
  profileComplete: boolean
  profile: ProfileData
}
export type TaskRecord = {
  id: string
  title: string
  domain: string
  due: string
  done: boolean
}
export type ProjectRecord = {
  name: string
  team: string
  members: number
  progress: number
  requested: boolean
}
export type Member = {
  id: string
  name: string
  initials: string
  department: string
  team: string
  role: string
  color: string
}
export type TeamRequest = {
  id: string
  domain: string
  firstName: string
  lastName: string
  email: string
}
export type Budget = {
  allocated: number
  spent: number
  remaining: number
  entries: {
    id: string
    title: string
    team: string
    kind: "allocation" | "expense"
    amount: number
    date: string
  }[]
}
export type NotificationRecord = { update: Update } & { read: boolean }

export let apiBase = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/$/, "")
export let backendEnabled = true
let discoveryRequest: Promise<boolean> | null = null
let csrfRequest: Promise<string> | null = null

export function discoverSameOriginBackend(): Promise<boolean> {
  if (backendEnabled) return Promise.resolve(true)
  if (!discoveryRequest)
    discoveryRequest = (async () => {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 3000)
      try {
        const response = await fetch("/api/auth/providers", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })
        if (
          !response.ok ||
          !response.headers.get("Content-Type")?.includes("application/json")
        ) return false
        const provider = await response.json()
        if (
          provider?.application !== "anurag-space-research-center" ||
          typeof provider.googleClientId !== "string"
        ) return false
        apiBase = "/api"
        backendEnabled = true
        return true
      } catch {
        return false
      } finally {
        window.clearTimeout(timeout)
      }
    })()
  return discoveryRequest
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function csrf(): Promise<string> {
  if (!csrfRequest)
    csrfRequest = fetch(`${apiBase}/auth/csrf`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok)
          throw new ApiError(
            "Could not establish a secure session.",
            response.status,
          )
        const result = await response.json()
        if (typeof result.token !== "string")
          throw new Error("Invalid CSRF response.")
        return result.token as string
      })
      .finally(() => {
        csrfRequest = null
      })
  return csrfRequest
}

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (!backendEnabled)
    throw new Error("The API URL is not configured.")
  const headers: Record<string, string> = {}
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart)
    headers["Content-Type"] = "application/json"
  if (!["GET", "HEAD", "OPTIONS"].includes(method))
    headers["X-XSRF-TOKEN"] = await csrf()
  const response = await fetch(`${apiBase}${path}`, {
    method,
    credentials: "include",
    headers,
    body:
      body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  })
  const text = await response.text()
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("text/html")) {
    throw new ApiError(
      "The server returned an HTML page instead of an API response. The backend endpoint is not available at this address.",
      response.status,
    )
  }
  let result: unknown
  try {
    result = text ? JSON.parse(text) : undefined
  } catch {
    throw new ApiError(
      "The backend returned an invalid response.",
      response.status,
    )
  }
  if (!response.ok) {
    const message =
      result && typeof result === "object" && "message" in result
        ? String(result.message)
        : `Request failed (${response.status}).`
    throw new ApiError(message, response.status)
  }
  return result as T
}

export function resolveProfile(profile: ProfileData): ProfileData {
  const photo = profile.photo || ""
  const isDirect =
    photo.startsWith("data:") ||
    photo.startsWith("http://") ||
    photo.startsWith("https://")
  return {
    ...profile,
    photo: isDirect ? photo : photo ? `${apiBase}${photo}?v=${Date.now()}` : "",
  }
}
