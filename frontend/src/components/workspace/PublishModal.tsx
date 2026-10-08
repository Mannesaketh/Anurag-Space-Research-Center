import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import type { Update } from "../../types/workspace";
import { domainNames, field, primary } from "../../constants/workspaceData";

export function Publish({
  onPublish,
}: {
  onPublish: (update: Update) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Announcement");
  const [domain, setDomain] = useState<string>("All domains");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPublishing(true);
    try {
      await onPublish({
        id: `pub-${Date.now()}`,
        title,
        body,
        category,
        domain,
        date,
        location: location.trim() || "Anurag Space Research Center Campus & Portal",
        createdAt: new Date().toISOString(),
        author: "Anurag Space Research Center Admin",
      });
      setTitle("");
      setBody("");
      setDate("");
      setLocation("");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold">Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., CanSat Design Review & Telemetry Milestone"
          className={`${field} mt-1.5`}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-semibold">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${field} mt-1.5`}
          >
            <option value="Announcement">Announcement</option>
            <option value="Hackathon">Symposium / Hackathon</option>
            <option value="Event">Design Review / Workshop</option>
            <option value="News">Research Paper / News</option>
            <option value="Organisation">Organisation update</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold">Research Domain</label>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={`${field} mt-1.5`}
          >
            <option value="All domains">All domains</option>
            {domainNames.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold">
          Event / Milestone date <span className="font-normal text-[#8997a6]">(optional)</span>
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${field} mt-1.5`}
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold">
          Location / Venue <span className="font-normal text-[#8997a6]">(optional)</span>
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Aerospace Design Lab & Virtual Link"
          className={`${field} mt-1.5`}
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold">Details</label>
        <textarea
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the announcement or update details..."
          className={`${field} mt-1.5 resize-none`}
        />
      </div>
      <button disabled={publishing} className={`${primary} w-full`}>
        <Send size={14} />
        {publishing ? "Publishing..." : "Publish announcement"}
      </button>
    </form>
  );
}
