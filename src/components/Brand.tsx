export function Logo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#4b3bd6" />
      <g strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M20 44c8 2 10-6 6-14" stroke="#f5b52e" />
        <path d="M26 46c8 2 12-8 6-20" stroke="#39a0e6" />
        <path d="M34 18c-8-2-12 8-6 20" stroke="#7c5cfc" />
        <path d="M40 20c-8-2-10 6-6 14" stroke="#e6266d" />
      </g>
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`font-extrabold tracking-tight ${light ? 'text-white' : 'text-violet-800'}`}>
      MO <span className={light ? 'text-lime-300' : 'text-violet-500'}>Track</span>
    </span>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo className="h-9 w-9" />
      <div className="leading-tight">
        <div className="text-base">
          <Wordmark />
        </div>
        <div className="text-[10px] font-medium text-gray-400">Marketing Officer Reports</div>
      </div>
    </div>
  );
}
