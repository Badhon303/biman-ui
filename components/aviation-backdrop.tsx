"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function AirlinerSilhouette({ className, illustrated = false, illustratedOpacity = 1 }: { className?: string; illustrated?: boolean; illustratedOpacity?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 640 640" className={cn("h-auto w-full", className)} aria-hidden="true" focusable="false">
      {illustrated ? (
        <>
          <defs>
            <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#c4d2e7" />
              <stop offset=".32" stopColor="#fff" />
              <stop offset=".72" stopColor="#e6edf7" />
              <stop offset="1" stopColor="#aabbd4" />
            </linearGradient>
            <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#aebdd4" />
              <stop offset=".22" stopColor="#f9fbff" />
              <stop offset=".5" stopColor="#fff" />
              <stop offset=".78" stopColor="#e1e9f4" />
              <stop offset="1" stopColor="#9daec7" />
            </linearGradient>
            <linearGradient id={`${id}-engine`} x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#9eafc8" />
              <stop offset=".38" stopColor="#fff" />
              <stop offset=".72" stopColor="#e5ebf4" />
              <stop offset="1" stopColor="#91a3bd" />
            </linearGradient>
            <filter id={`${id}-shadow`} x="-30%" y="-20%" width="160%" height="160%" colorInterpolationFilters="sRGB">
              <feDropShadow dx="8" dy="16" stdDeviation="11" floodColor="#314668" floodOpacity=".28" />
            </filter>
          </defs>
          <g filter={`url(#${id}-shadow)`} opacity={illustratedOpacity}>
            <path d="M307 208 77 326q-16 8-7 25l9 17 228-59Zm26 0 230 118q16 8 7 25l-9 17-228-59Z" fill={`url(#${id}-wing)`} stroke="#8192aa" strokeOpacity=".35" strokeWidth="2" />
            <path d="M307 464 169 525q-17 8-8 24l8 15 138-43Zm26 0 138 61q17 8 8 24l-8 15-138-43Z" fill={`url(#${id}-wing)`} stroke="#8192aa" strokeOpacity=".3" strokeWidth="2" />
            <g fill={`url(#${id}-engine)`} stroke="#8192aa" strokeOpacity=".48" strokeWidth="2">
              <path d="M168 288q0-17 14-17t14 17v60q0 17-14 17t-14-17Zm54 16q0-17 14-17t14 17v60q0 17-14 17t-14-17Zm208-16q0-17 14-17t14 17v60q0 17-14 17t-14-17Zm-54 16q0-17 14-17t14 17v60q0 17-14 17t-14-17Z" />
            </g>
            <path d="M320 35c-19 29-26 59-26 99v346c0 27-8 52-24 74l-20 29q-4 7 4 9l66-39 66 39q8-2 4-9l-20-29c-16-22-24-47-24-74V134c0-40-7-70-26-99Z" fill={`url(#${id}-body)`} stroke="#8292a9" strokeOpacity=".55" strokeWidth="2" />
            <path d="M320 52q-12 17-12 38 12-7 24 0 0-21-12-38Z" fill="#586982" opacity=".78" />
            <path d="M320 112v343" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3" />
            <path d="m307 298-183 47m209-47 183 47M307 478l-112 49m138-49 112 49" fill="none" stroke="#71839d" strokeOpacity=".35" strokeWidth="2" />
          </g>
        </>
      ) : (
        <path fill="currentColor" d="M320 24c-17 29-23 66-23 113v61L68 316q-17 10-5 27l13 18 221-49v126c0 23-6 45-18 67l-19 34 60-34 60 34-19-34c-12-22-18-44-18-67V312l221 49 13-18q12-17-5-27L343 198v-61c0-47-6-84-23-113Z" />
      )}
    </svg>
  );
}

export function AviationBackdrop({
  className,
  intensity = "subtle",
  animate = true,
  layout = "dashboard",
}: {
  className?: string;
  intensity?: "subtle" | "bold";
  animate?: boolean;
  layout?: "dashboard" | "login";
}) {
  const bold = intensity === "bold";
  const login = layout === "login";
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <div className={cn("absolute inset-0", login ? "bg-[radial-gradient(ellipse_at_85%_8%,rgba(96,165,250,0.10),transparent_58%)]" : "bg-[radial-gradient(ellipse_at_85%_0%,rgba(96,165,250,0.16),transparent_65%)]")} />
      <svg viewBox="0 0 1600 900" preserveAspectRatio="none" className={cn("absolute inset-0 h-full w-full text-blue-600/15", animate && "aviation-flightpath")}>
        <path d="M680 -60 C 600 200 1260 30 1460 260 S 1140 560 1700 680" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="6 10" />
        <path d="M-60 480 C 400 280 750 760 1220 560 S 1500 300 1700 320" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 10" />
      </svg>
      <div className={cn(
        "absolute drop-shadow-[0_18px_18px_rgba(35,58,93,0.16)]",
        login ? "right-[4%] top-[3%] w-[240px] sm:right-[5%] sm:top-[4%] sm:w-[320px] lg:right-[5%] lg:top-[6%] lg:w-[370px] xl:w-[420px]" : "-right-16 top-12 w-[280px] sm:w-[420px] xl:w-[520px]",
        animate ? "aviation-plane" : "rotate-[-22deg]",
        bold ? "text-blue-600/[0.14]" : "text-blue-600/[0.12]",
      )}>
        <AirlinerSilhouette illustrated illustratedOpacity={login ? 0.72 : 0.38} />
      </div>
      <AirlinerSilhouette className={cn("absolute rotate-[32deg]", login ? "left-[8%] top-[12%] w-9 text-blue-500/20" : "right-[42%] top-12 w-14 text-blue-500/20")} />
      <AirlinerSilhouette className={cn("absolute rotate-[48deg]", login ? "bottom-[8%] right-[4%] w-12 text-blue-500/15" : "right-[12%] top-[520px] w-20 text-blue-500/15")} />
    </div>
  );
}
