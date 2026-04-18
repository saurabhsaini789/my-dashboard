"use client";
import React, { useMemo, useState } from "react";
import { X, Flame, TrendingUp, TrendingDown, Calendar, BarChart2, Target, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { Text } from "../ui/Text";

type HabitStatus = "none" | "done" | "missed";

interface Habit {
  id: string;
  name: string;
  records: Record<string, HabitStatus[]>;
  monthScope?: string[];
}

interface HabitDetailPanelProps {
  habit: Habit | null;
  onClose: () => void;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getMonthStats(habit: Habit, year: number, month: number) {
  const key = `${year}-${month}`;
  const isActive =
    !habit.monthScope ||
    habit.monthScope.length === 0 ||
    habit.monthScope.includes(key);
  if (!isActive) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;

  const days = habit.records?.[key] || [];
  let done = 0, missed = 0;
  for (let d = 0; d < maxDay; d++) {
    const s = days[d];
    if (s === "done") done++;
    else if (s === "missed") missed++;
  }
  const total = done + missed;
  const rate = total > 0 ? Math.round((done / total) * 100) : null;
  return { done, missed, total, rate, daysLogged: maxDay, key };
}

function getAllMonthsWithData(habit: Habit) {
  const keys = Object.keys(habit.records || {}).sort();
  const now = new Date();
  if (keys.length === 0) {
    return [{ year: now.getFullYear(), month: now.getMonth() }];
  }
  const first = keys[0].split("-").map(Number);
  const results: { year: number; month: number }[] = [];
  let y = first[0], m = first[1];
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    results.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return results;
}

function calcStreaks(habit: Habit) {
  const today = new Date();
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let longestMiss = 0;
  let tempMiss = 0;

  let checkDate = new Date(today);
  const todayKey = `${today.getFullYear()}-${today.getMonth()}`;
  const todayStatus = habit.records?.[todayKey]?.[today.getDate() - 1];
  if (!todayStatus || todayStatus === "none") {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  for (let i = 0; i < 1000; i++) {
    const k = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
    const idx = checkDate.getDate() - 1;
    const isActive = !habit.monthScope || habit.monthScope.length === 0 || habit.monthScope.includes(k);
    if (!isActive) break;
    const s = habit.records?.[k]?.[idx];
    if (s === "done") {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else { break; }
  }

  const allMonths = getAllMonthsWithData(habit);
  for (const { year, month } of allMonths) {
    const key = `${year}-${month}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
    const days = habit.records?.[key] || [];
    for (let d = 0; d < maxDay; d++) {
      const s = days[d];
      if (s === "done") {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
        tempMiss = 0;
      } else if (s === "missed") {
        tempMiss++;
        longestMiss = Math.max(longestMiss, tempMiss);
        tempStreak = 0;
      } else {
        tempStreak = 0;
        tempMiss = 0;
      }
    }
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak), longestMissRun: longestMiss };
}

// Monthly Grid Generator
function getMonthlyGrid(habit: Habit, year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const key = `${year}-${month}`;
  const records = habit.records?.[key] || [];
  const now = new Date();
  
  const grid: ({ day: number; status: HabitStatus | "future" | "inactive" } | null)[] = [];
  
  // Padding for first week
  for (let i = 0; i < firstDow; i++) grid.push(null);
  
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isActive = !habit.monthScope || habit.monthScope.length === 0 || habit.monthScope.includes(key);
    
    let status: HabitStatus | "future" | "inactive" = (records[d - 1] as HabitStatus) || "none";
    if (!isActive) status = "inactive";
    else if (date > now) status = "future";
    
    grid.push({ day: d, status });
  }
  
  return grid;
}

// Mini SVG Line Graph
function LineGraph({ data }: { data: { label: string; value: number | null }[] }) {
  const w = 360, h = 90, pad = { top: 10, right: 10, bottom: 24, left: 32 };
  const gW = w - pad.left - pad.right;
  const gH = h - pad.top - pad.bottom;

  const points = data.filter(d => d.value !== null);
  if (points.length < 2) {
    return <div className="h-24 flex items-center justify-center text-zinc-400 text-sm italic">Not enough data</div>;
  }

  const xs = data.map((_, i) => pad.left + (i / (data.length - 1)) * gW);
  const ys = data.map(d => d.value !== null ? pad.top + gH - (d.value / 100) * gH : null);

  let pathD = "";
  let inPath = false;
  data.forEach((d, i) => {
    if (d.value !== null) {
      const x = xs[i], y = ys[i]!;
      if (!inPath) { pathD += `M ${x} ${y}`; inPath = true; }
      else pathD += ` L ${x} ${y}`;
    } else { inPath = false; }
  });

  const firstI = data.findIndex(d => d.value !== null);
  const lastI = data.map(d => d.value !== null).lastIndexOf(true);
  let areaD = pathD;
  if (firstI >= 0 && lastI >= 0) {
    areaD += ` L ${xs[lastI]} ${pad.top + gH} L ${xs[firstI]} ${pad.top + gH} Z`;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id="lgGradDetail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map(v => {
        const y = pad.top + gH - (v / 100) * gH;
        return (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={pad.left + gW} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">{v}%</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#lgGradDetail)" />
      <path d={pathD} fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => d.value !== null ? (
        <circle key={i} cx={xs[i]} cy={ys[i]!} r="3" fill="#14b8a6" stroke="white" strokeWidth="1.5" />
      ) : null)}
      {data.map((d, i) => (i % 2 === 0 || i === data.length - 1) ? (
        <text key={i} x={xs[i]} y={h - 4} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">{d.label.split(' ')[0]}</text>
      ) : null)}
    </svg>
  );
}

// Mini SVG Bar Chart
function BarChart({ data }: { data: { label: string; rate: number | null }[] }) {
  const w = 360, h = 90, pad = { top: 10, right: 6, bottom: 24, left: 32 };
  const gW = w - pad.left - pad.right;
  const gH = h - pad.top - pad.bottom;
  const n = data.length;
  const barW = Math.max(6, (gW / n) - 6);

  if (n === 0) return <div className="h-24 flex items-center justify-center text-zinc-400 text-sm italic">No data</div>;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {[0, 50, 100].map(v => {
        const y = pad.top + gH - (v / 100) * gH;
        return (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={pad.left + gW} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">{v}%</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = pad.left + (i * (gW / n)) + (gW / n - barW) / 2;
        const val = d.rate ?? 0;
        const barH = (val / 100) * gH;
        const y = pad.top + gH - barH;
        const color = val >= 80 ? "#22c55e" : val >= 50 ? "#f59e0b" : "#ef4444";
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH || 1} rx="3" fill={color} fillOpacity={d.rate === null ? 0.15 : 0.8} />
            <text x={x + barW / 2} y={h - 4} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5 text-xs">{d.label.split(' ')[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function HabitDetailPanel({ habit, onClose }: HabitDetailPanelProps) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const handleNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    if (next <= now) setViewDate(next);
  };

  const allMonths = useMemo(() => habit ? getAllMonthsWithData(habit) : [], [habit]);

  const monthlyStats = useMemo(() => {
    if (!habit) return [];
    return allMonths.map(({ year, month }) => {
      const stats = getMonthStats(habit, year, month);
      return {
        label: `${MONTH_NAMES[month]} '${String(year).slice(2)}`,
        rate: stats?.rate ?? null,
        done: stats?.done ?? 0,
        missed: stats?.missed ?? 0,
        year, month,
      };
    });
  }, [habit, allMonths]);

  const lineData = useMemo(() => monthlyStats.map(m => ({ label: m.label, value: m.rate })), [monthlyStats]);
  const streaks = useMemo(() => habit ? calcStreaks(habit) : { currentStreak: 0, bestStreak: 0, longestMissRun: 0 }, [habit]);
  
  const calendarGrid = useMemo(() => habit ? getMonthlyGrid(habit, viewYear, viewMonth) : [], [habit, viewYear, viewMonth]);

  const currentStats = useMemo(() => habit ? getMonthStats(habit, viewYear, viewMonth) : null, [habit, viewYear, viewMonth]);
  const prevMonthDate = new Date(viewYear, viewMonth - 1, 1);
  const prevStats = useMemo(() => habit ? getMonthStats(habit, prevMonthDate.getFullYear(), prevMonthDate.getMonth()) : null, [habit, prevMonthDate]);

  const heatmapData = useMemo(() => {
    if (!habit) return [];
    const dots: { status: HabitStatus | "inactive"; date: string }[] = [];
    const end = new Date(viewYear, viewMonth + 1, 0);
    const start = new Date(viewYear, viewMonth - 11, 1); 
    
    let curr = new Date(start);
    while (curr <= end) {
      const y = curr.getFullYear(), m = curr.getMonth(), d = curr.getDate();
      const key = `${y}-${m}`;
      const isActive = !habit.monthScope || habit.monthScope.length === 0 || habit.monthScope.includes(key);
      const status = habit.records?.[key]?.[d - 1] as HabitStatus;
      
      let finalStatus: HabitStatus | "inactive" = "none";
      if (!isActive || curr > now) finalStatus = "inactive";
      else finalStatus = status || "none";

      dots.push({ status: finalStatus, date: `${d} ${MONTH_NAMES[m]}` });
      curr.setDate(curr.getDate() + 1);
    }
    return dots;
  }, [habit, viewYear, viewMonth]);

  if (!habit) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-end" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="relative z-[101] w-full max-w-xl flex flex-col bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 animate-slide-in-right">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex flex-col">
            <Text variant="title" as="h2" className="text-xl">{habit.name}</Text>
            <div className="flex items-center gap-2 mt-1">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300 min-w-[100px] text-center">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button 
                onClick={handleNextMonth}
                disabled={new Date(viewYear, viewMonth + 1, 1) > now}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30"
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">

          {/* ── Monthly Calendar Matrix ────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-teal-400" />
              <div className="flex flex-col">
                <Text variant="label" className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Monthly Analytics Matrix</Text>
                <Text variant="bodySmall" muted className="text-[10px]">Complete status for {MONTH_NAMES[viewMonth]} {viewYear}</Text>
              </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700/50">
              <div className="grid grid-cols-7 gap-y-6 gap-x-2">
                {DAY_NAMES.map(d => (
                  <Text key={d} className="text-[10px] text-zinc-400 font-black text-center uppercase tracking-tighter">{d}</Text>
                ))}
                {calendarGrid.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center gap-1.5 group min-h-[40px]">
                    {item ? (
                      <>
                        <div 
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            item.status === "done" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                            item.status === "missed" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" :
                            item.status === "future" ? "bg-zinc-100 dark:bg-zinc-800 opacity-30" :
                            item.status === "inactive" ? "bg-zinc-100 dark:bg-zinc-800 opacity-10" :
                            "bg-zinc-200 dark:bg-zinc-700 group-hover:bg-zinc-300"
                          }`} 
                        />
                        <Text className={`text-[10px] font-bold ${item.status === "future" ? "text-zinc-300" : "text-zinc-500Group group-hover:text-zinc-800 dark:group-hover:text-zinc-200"}`}>
                          {item.day}
                        </Text>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 justify-center mt-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50 grayscale-[0.8]">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[9px] text-zinc-500 uppercase font-black">Done</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span className="text-[9px] text-zinc-500 uppercase font-black">Missed</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" /><span className="text-[9px] text-zinc-500 uppercase font-black">None</span></div>
              </div>
            </div>
          </section>

          {/* ── Comparison Section ─────────────────────────── */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-zinc-400" />
                <Text variant="label" className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Performance Snapshot</Text>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: `${MONTH_NAMES[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`, stats: prevStats, accent: "zinc" },
                { label: `${MONTH_NAMES[viewMonth]} ${viewYear}`, stats: currentStats, accent: "teal" },
              ].map(({ label, stats, accent }) => (
                <div key={label} className={`rounded-2xl border p-5 flex flex-col gap-4 ${accent === "teal" ? "border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-500/5" : "border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-800/40"}`}>
                  <Text variant="bodySmall" className={`font-bold text-sm ${accent === "teal" ? "text-teal-700 dark:text-teal-400" : "text-zinc-500"}`}>{label}</Text>
                  {stats ? (
                    <div className="flex justify-between items-end">
                      <div className="text-center">
                        <div className="text-3xl font-black text-emerald-500">{stats.done}</div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">Done</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-black text-rose-500">{stats.missed}</div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">Missed</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-black ${stats.rate !== null ? (stats.rate >= 70 ? "text-teal-500" : stats.rate >= 40 ? "text-amber-500" : "text-red-500") : "text-zinc-400"}`}>
                          {stats.rate !== null ? `${stats.rate}%` : "—"}
                        </div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">Success</div>
                      </div>
                    </div>
                  ) : (
                    <Text variant="body" muted className="italic text-sm">No data recorded</Text>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── DOT HEATMAP (Continuous) ────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-500" />
              <div className="flex flex-col">
                <Text variant="label" className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Mastery Dotmap</Text>
                <Text variant="bodySmall" muted className="text-[10px]">Continuous 12-month consistency view</Text>
              </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 p-4">
               <div className="flex flex-wrap gap-[3px] justify-start content-start">
                 {heatmapData.map((d, i) => (
                   <div
                     key={i}
                     title={`${d.date}: ${d.status}`}
                     className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                       d.status === "done" ? "bg-emerald-500" :
                       d.status === "missed" ? "bg-rose-500" :
                       d.status === "none" ? "bg-zinc-200 dark:bg-zinc-700" :
                       "bg-zinc-100 dark:bg-zinc-800/30 opacity-10"
                     }`}
                   />
                 ))}
               </div>
            </div>
          </section>

          {/* ── Streak & Charts ────────────────── */}
          <div className="grid grid-cols-2 gap-6">
             <section className="col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <Text variant="label" className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Streak Overview</Text>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "Current Run", v: streaks.currentStreak, c: "text-orange-500", bg: "bg-orange-50/50 dark:bg-orange-500/10 border-orange-100" },
                    { l: "Best Streak", v: streaks.bestStreak, c: "text-teal-500", bg: "bg-teal-50/50 dark:bg-teal-500/10 border-teal-100" },
                    { l: "Longest Miss", v: streaks.longestMissRun, c: "text-rose-500", bg: "bg-rose-50/50 dark:bg-rose-500/10 border-rose-100" },
                  ].map(s => (
                    <div key={s.l} className={`p-4 rounded-2xl border ${s.bg} text-center flex flex-col gap-1`}>
                      <div className={`text-3xl font-black ${s.c}`}>{s.v}</div>
                      <div className="text-[9px] uppercase font-black tracking-tight text-zinc-400">{s.l}</div>
                    </div>
                  ))}
                </div>
             </section>

             <section>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                  <Text variant="label" className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Monthly Velocity</Text>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 p-4 min-h-[140px] flex items-center">
                  <BarChart data={monthlyStats} />
                </div>
             </section>

             <section>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                  <Text variant="label" className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Success Curve</Text>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 p-4 min-h-[140px] flex items-center">
                  <LineGraph data={lineData} />
                </div>
             </section>
          </div>

        </div>
      </aside>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
