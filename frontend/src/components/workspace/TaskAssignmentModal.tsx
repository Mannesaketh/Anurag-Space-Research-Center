import { useState, type FormEvent } from "react";
import { ClipboardList } from "lucide-react";
import type { Member } from "../../types/workspace";
import { domainNames, field, primary } from "../../constants/workspaceData";
import { createTaskInFirestore } from "../../firestoreService";

export function TaskAssignment({
  members,
  onAssigned,
  onError,
}: {
  members: Member[];
  onAssigned: () => void | Promise<void>;
  onError: (caught: unknown) => void;
}) {
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<string>("CANSAT");
  const [assigneeId, setAssigneeId] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !assigneeId) return;
    setBusy(true);
    try {
      await createTaskInFirestore({
        userId: assigneeId,
        title: title.trim(),
        domain,
        due: due || new Date(Date.now() + 86400000 * 7).toISOString(),
        done: false,
      });
      setTitle("");
      setDue("");
      await onAssigned();
    } catch (caught) {
      onError(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold">Assign to member</label>
        <select
          required
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className={`${field} mt-1.5`}
        >
          <option value="">Select researcher...</option>
          {members.map((m) => (
            <option key={m.id || m.name} value={m.id || m.name}>
              {m.name} ({m.department || m.role})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-semibold">Task title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Finalize payload enclosure schematics"
          className={`${field} mt-1.5`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-semibold">Research Domain</label>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={`${field} mt-1.5`}
          >
            {domainNames.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold">Due date</label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={`${field} mt-1.5`}
          />
        </div>
      </div>
      <button disabled={busy} className={`${primary} w-full`}>
        <ClipboardList size={14} />
        {busy ? "Assigning..." : "Assign task"}
      </button>
    </form>
  );
}
