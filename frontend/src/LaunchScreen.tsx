import logo from "./imports/image.png"

export default function LaunchScreen({ connecting }: { connecting: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f6f8] px-6 text-center">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-[#dbe5df] bg-white shadow-[0_12px_45px_#1c34570a]">
        <span
          aria-hidden="true"
          className="absolute -inset-3 rounded-full border border-[#e5e9ef]"
        />
        <img
          src={logo}
          alt="Anurag Space Research Center logo"
          width={128}
          height={128}
          fetchPriority="high"
          className="h-32 w-32 rounded-full object-contain"
        />
      </div>
      <p className="mt-10 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8b9baa]">
        ANURAG UNIVERSITY
      </p>
      <h1 className="mt-3 max-w-lg text-[25px] font-extrabold leading-snug text-[#1b2f4e] sm:text-[32px]">
        Anurag Space Research Center
      </h1>
      <p className="mt-3 text-[10px] tracking-[0.08em] text-[#8293a7]">
        COLLABORATE · BUILD · INNOVATE · LAUNCH
      </p>
      <div
        role="status"
        aria-live="polite"
        className="mt-10 flex items-center gap-2.5 text-[11px] text-[#8293a7]"
      >
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border-2 border-[#d2ded6] border-t-[#5f7d6b] motion-safe:animate-spin"
        />
        {connecting
          ? "Connecting securely to your workspace…"
          : "Preparing your next mission…"}
      </div>
    </main>
  )
}

