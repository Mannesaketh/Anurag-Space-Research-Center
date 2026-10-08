import { BookOpen, Users } from "lucide-react";
import { domains } from "../../constants/workspaceData";
import { backendEnabled } from "../../api";

export function DomainCard({
  domain,
  requested,
  onJoin,
  onResources,
  compact = false,
}: {
  domain: typeof domains[number];
  requested: boolean;
  onJoin: () => void;
  onResources?: () => void;
  compact?: boolean;
}) {
  return (
    <article className={`${domain.color} rounded-[20px] p-5`}>
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/65 text-[25px] ${domain.accent}`}
          aria-hidden="true"
        >
          {domain.icon}
        </span>
        <span className={`text-[9px] font-bold ${domain.accent}`}>
          {domain.members} MEMBERS
        </span>
      </div>
      <h3 className="mt-5 text-[17px] font-extrabold tracking-[0.015em]">
        {domain.name}
      </h3>
      <p className="mt-1 text-[10px] text-[#647586]">{domain.note}</p>
      <div className="mt-5 flex items-center justify-between">
        {backendEnabled ? (
          <span className="flex items-center gap-1.5 text-[9px] text-[#708477]">
            <Users size={14} />
            {domain.members ? `${domain.members} researchers` : "Team forming"}
          </span>
        ) : (
          <div className="flex -space-x-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#526b7d] text-[7px] font-bold text-white">
              AK
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#bb8578] text-[7px] font-bold text-white">
              SR
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-[7px] font-bold">
              +{domain.members - 2}
            </span>
          </div>
        )}
        <span className="text-[9px] font-semibold text-[#647586]">
          {domain.team}
        </span>
      </div>
      <progress
        value={domain.progress}
        max={100}
        aria-label={`${domain.name} milestone progress`}
        className="mission-progress mt-4 h-1 w-full"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-[#69798a]">
          {domain.progress}% complete
        </span>
        {!compact && (
          <button
            onClick={onJoin}
            disabled={requested}
            className="rounded-lg bg-white/70 px-2.5 py-1.5 text-[9px] font-bold disabled:opacity-65"
          >
            {requested ? "Requested ✓" : "Join team"}
          </button>
        )}
      </div>
      {!compact && onResources && (
        <button
          onClick={onResources}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/60 bg-white/45 px-3 py-2.5 text-[10px] font-bold"
        >
          Learning resources <BookOpen size={13} />
        </button>
      )}
    </article>
  );
}
