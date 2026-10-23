/** The Wisp mark: one thin line, with a little life in it. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M10 40c6-17 13-17 15-7s6 14 14 4 8-23 15-12"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
