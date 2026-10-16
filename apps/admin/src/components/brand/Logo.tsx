/** SafeSphere mark + wordmark, as drawn in the approved mockup. */
export function Logo({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="14" fill="#0E1726" />
        <path d="M7 17c3 4 13 4 16 0" fill="none" stroke="#3DD39A" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="15" cy="11" r="3" fill="#FFFFFF" />
      </svg>
      {showWordmark && <span className="text-lg font-extrabold tracking-[-0.01em] text-ink">SafeSphere</span>}
    </span>
  )
}
