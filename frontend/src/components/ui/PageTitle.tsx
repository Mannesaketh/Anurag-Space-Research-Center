import type { ReactNode } from "react";
import { eyebrow } from "../../constants/workspaceData";

export function PageTitle({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className={eyebrow}>{label}</p>
        <h1 className="mt-2 text-[29px] font-extrabold leading-tight sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-[#7b8796]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
