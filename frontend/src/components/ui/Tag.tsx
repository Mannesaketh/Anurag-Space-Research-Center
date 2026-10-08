import type { ReactNode } from "react";

export function Tag({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-bold ${
        dark ? "bg-white/10 text-[#b9cece]" : "bg-[#eef2f5] text-[#697b91]"
      }`}
    >
      {children}
    </span>
  );
}
