export default function SiteNavigation() {
  return (
    <>
      <a href="#weather-map" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-sky-100 p-3 text-slate-950 focus:not-sr-only">ข้ามไปสำรวจแผนที่</a>
      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/[0.08]">
        <nav aria-label="เมนูหลัก" className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-10 lg:px-16">
          <a href="#top" aria-label="Beyond the Forecast หน้าแรก" className="flex shrink-0 items-center gap-2 text-white sm:gap-3">
            <svg aria-hidden="true" viewBox="0 0 36 36" className="h-9 w-9" fill="none" stroke="currentColor"><circle cx="18" cy="18" r="14" strokeOpacity=".3"/><ellipse cx="18" cy="18" rx="7" ry="14"/><path d="M4 18h28M7 10h22M7 26h22" strokeOpacity=".5"/><circle cx="27" cy="8" r="3" fill="#b6e9eb" stroke="none"/></svg>
            <span className="whitespace-nowrap text-[9px] font-semibold leading-4 tracking-[.1em] sm:text-[10px] sm:tracking-[.16em]">BEYOND<br/>THE FORECAST<span className="text-cyan-200">.</span></span>
          </a>
          <div className="hidden items-center gap-7 text-xs text-slate-300 md:flex">
            <a href="#weather-map" className="transition hover:text-white">Weather Atlas</a>
            <a href="#weather-details" className="transition hover:text-white">Conditions</a>
            <a href="#weather-analytics" className="transition hover:text-white">Analytics</a>
          </div>
          <a href="#weather-map" className="whitespace-nowrap rounded-full border border-white/20 px-3 py-2.5 text-[10px] text-sky-100 transition hover:border-cyan-200/60 hover:bg-white/5 sm:px-4 sm:text-[11px]">สำรวจแผนที่ <span aria-hidden="true" className="ml-1 sm:ml-2">↗</span></a>
        </nav>
      </header>
    </>
  );
}
