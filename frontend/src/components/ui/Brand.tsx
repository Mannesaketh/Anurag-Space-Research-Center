import logo from "../../imports/image.png";
import { organizationName } from "../../constants/workspaceData";

export function Brand({ header = false }: { header?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src={logo}
        alt="Anurag Space Research Center, AnuragSat logo"
        className={`${
          header ? "h-11 w-11 sm:h-14 sm:w-14" : "h-14 w-14"
        } shrink-0 rounded-xl bg-white object-contain`}
      />
      <div className="min-w-0">
        <b
          className={`${
            header
              ? "max-w-[210px] text-[13px] sm:max-w-[420px] sm:text-[20px]"
              : "text-[12px]"
          } block font-extrabold leading-snug`}
        >
          {organizationName}
        </b>
        <p
          className={`${
            header
              ? "max-w-[200px] text-[10px] sm:max-w-none sm:text-[12px]"
              : "text-[8px]"
          } mt-1 font-semibold leading-relaxed text-[#6d8097]`}
        >
          ANURAG UNIVERSITY
        </p>
      </div>
    </div>
  );
}
