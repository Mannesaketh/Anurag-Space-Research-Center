import type { ReactNode } from "react";
import { eyebrow } from "../../constants/workspaceData";

export function SectionTitle({
  title,
  label,
  action,
}: {
  title: string;
  label?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {label && <p className={`${eyebrow} mb-1`}>{label}</p>}
        <h2 className="text-[18px] font-extrabold">{title}</h2>
      </div>
      {action}
    </div>
  );
}
