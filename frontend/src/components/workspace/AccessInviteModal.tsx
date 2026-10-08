import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import type { Access } from "../../types/workspace";
import { field, primary } from "../../constants/workspaceData";

export function AccessInvite({
  onSave,
}: {
  onSave: (access: Access) => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Access["role"]>("admin");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: `acc-${Date.now()}`,
        email: email.trim().toLowerCase(),
        role,
        grantedAt: new Date().toISOString(),
      });
      setEmail("");
      setRole("admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold">Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g., researcher@anurag.edu.in"
          className={`${field} mt-1.5`}
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold">Assigned role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Access["role"])}
          className={`${field} mt-1.5`}
        >
          <option value="admin">Admin  -  updates, budget, and teams</option>
          <option value="developer">Developer  -  full control & access management</option>
          <option value="student">Student  -  shared workspace</option>
        </select>
      </div>
      <button disabled={saving} className={`${primary} w-full`}>
        <ShieldCheck size={14} />
        {saving ? "Saving access..." : "Grant access"}
      </button>
    </form>
  );
}
