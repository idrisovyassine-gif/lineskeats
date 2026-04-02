const sizeClassByPreset = {
  sm: {
    wrap: "gap-3",
    mark: "h-11 w-11 rounded-2xl p-2",
    title: "text-[1.6rem] sm:text-[1.8rem]",
    tagline: "text-[10px] sm:text-[11px]",
    subline: "text-[10px]",
  },
  md: {
    wrap: "gap-3.5",
    mark: "h-14 w-14 rounded-[1.15rem] p-2.5",
    title: "text-[2rem] sm:text-[2.4rem]",
    tagline: "text-[11px] sm:text-xs",
    subline: "text-[11px] sm:text-xs",
  },
  lg: {
    wrap: "gap-4",
    mark: "h-16 w-16 rounded-[1.35rem] p-3 sm:h-[4.5rem] sm:w-[4.5rem]",
    title: "text-[2.2rem] sm:text-[2.9rem]",
    tagline: "text-[11px] sm:text-xs",
    subline: "text-xs sm:text-sm",
  },
}

export default function BrandLogo({
  preset = "md",
  tone = "dark",
  showTagline = true,
  showSubline = false,
  className = "",
}) {
  const presetClasses = sizeClassByPreset[preset] || sizeClassByPreset.md
  const isDarkTone = tone === "dark"
  const titleColor = isDarkTone ? "text-white" : "text-[var(--ls-header)]"
  const taglineColor = isDarkTone ? "text-white/75" : "text-[var(--ls-emerald-strong)]"
  const sublineColor = isDarkTone ? "text-white/60" : "text-[var(--ls-text-soft)]"
  const markShell = isDarkTone
    ? "bg-[#fff7ef]/98 shadow-[0_18px_34px_rgba(21,7,14,0.2)] ring-1 ring-white/15"
    : "bg-[#fff7ef] shadow-[0_14px_30px_rgba(62,42,54,0.12)] ring-1 ring-[rgba(110,25,50,0.08)]"

  return (
    <div className={`flex items-center ${presetClasses.wrap} ${className}`.trim()}>
      <div className={`${presetClasses.mark} ${markShell} flex items-center justify-center shrink-0`}>
        <img
          src="/brand/lineskeats-mark.svg"
          alt="Lineskeats"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0">
        <div className={`lineskeats-brand leading-none ${presetClasses.title} ${titleColor}`}>
          Lineskeats
        </div>
        {showTagline ? (
          <p className={`mt-1 font-evogria uppercase tracking-[0.18em] ${presetClasses.tagline} ${taglineColor}`}>
            Le bon endroit, au bon moment.
          </p>
        ) : null}
        {showSubline ? (
          <p className={`mt-1 font-evogria ${presetClasses.subline} ${sublineColor}`}>
            Cuisine et retrait synchronises.
          </p>
        ) : null}
      </div>
    </div>
  )
}
