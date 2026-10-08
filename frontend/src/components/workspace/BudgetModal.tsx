import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { domainNames, field, primary } from "../../constants/workspaceData";
import { addBudgetEntryInFirestore } from "../../firestoreService";

export function BudgetForm({
  onAdded,
  onError,
}: {
  onAdded: () => void | Promise<void>;
  onError: (caught: unknown) => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [team, setTeam] = useState<string>("CANSAT");
  const [kind, setKind] = useState<"allocation" | "expense">("expense");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number.parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsed) || parsed <= 0) return;
    setBusy(true);
    try {
      await addBudgetEntryInFirestore({
        title: title.trim(),
        team,
        kind,
        amount: parsed,
        date: new Date().toISOString().slice(0, 10),
      });
      setTitle("");
      setAmount("");
      await onAdded();
    } catch (caught) {
      onError(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold">Transaction type</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "allocation" | "expense")}
          className={`${field} mt-1.5`}
        >
          <option value="expense">Expense (Record spending)</option>
          <option value="allocation">Allocation (Add division funds)</option>
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-semibold">Title / Item description</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., CanSat Telemetry Transceivers"
          className={`${field} mt-1.5`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-semibold">Division</label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
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
          <label className="block text-[11px] font-semibold">Amount (INR)</label>
          <input
            type="number"
            required
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="12400"
            className={`${field} mt-1.5`}
          />
        </div>
      </div>
      <button disabled={busy} className={`${primary} w-full`}>
        <Wallet size={14} />
        {busy ? "Saving entry..." : "Record budget transaction"}
      </button>
    </form>
  );
}
