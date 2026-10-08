import type { ProfileData } from "../../types/workspace";
import { initials } from "../../utils/formatters";

export function Avatar({
  profile,
  size = "h-10 w-10",
}: {
  profile: ProfileData;
  size?: string;
}) {
  return profile.photo ? (
    <img
      src={profile.photo}
      alt={`${profile.firstName || "Your"} profile`}
      className={`${size} shrink-0 rounded-2xl object-cover`}
    />
  ) : (
    <span
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#e6e3f1] text-[12px] font-bold text-[#6d6387]`}
    >
      {initials(profile)}
    </span>
  );
}
