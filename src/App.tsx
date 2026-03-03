import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Car,
  Flag, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  Map as MapIcon,
  LayoutDashboard,
  Table as TableIcon,
  History,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { format, differenceInDays, parseISO, addWeeks, isAfter, startOfWeek, endOfWeek } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { io } from 'socket.io-client';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize socket connection
const socket = io();

interface Goal {
  id: number;
  goal: string;
  target: number;
}

interface RaceStats {
  total_starts: number;
  sheet_url?: string;
}

interface HistoryRecord {
  id: number;
  date: string;
  weekly_adds: number;
  total_starts: number;
}

const MASTER_TARGET = 125;
const DEADLINE = new Date('2026-06-30');

const MILESTONES = [
  { value: 60, label: "Bromley", id: "bromley" },
  { value: 75, label: "Orient", id: "orient" },
  { value: 90, label: "Millwall", id: "millwall" },
  { value: 100, label: "Arsenal", id: "arsenal" },
  { value: 125, label: "AC FUCKING MILAN", id: "milan" },
];

export default function App() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<RaceStats>({ total_starts: 0 });
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Socket listeners for real-time updates
    socket.on('stats_updated', (newStats: RaceStats) => {
      setStats(newStats);
    });

    socket.on('history_updated', (newHistory: HistoryRecord[]) => {
      setHistory(newHistory);
    });

    socket.on('goals_updated', (newGoals: Goal[]) => {
      setGoals(newGoals);
    });

    return () => {
      socket.off('stats_updated');
      socket.off('history_updated');
      socket.off('goals_updated');
    };
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/goals');
      const data = await res.json();
      setGoals(data.goals);
      setStats(data.stats);
      setHistory(data.history);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = async (totalStarts: number) => {
    try {
      const res = await fetch('/api/stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_starts: totalStarts }),
      });
      const updated = await res.json();
      setStats(updated);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const lastRecord = history[history.length - 1];
      if (!lastRecord || lastRecord.date !== today) {
        const weeklyAdds = lastRecord ? totalStarts - lastRecord.total_starts : totalStarts;
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, weekly_adds: weeklyAdds, total_starts: totalStarts }),
        });
        fetchData();
      }
    } catch (err) {
      console.error("Failed to update stats", err);
    }
  };

  const daysRemaining = Math.max(0, differenceInDays(DEADLINE, new Date()));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <div className="text-slate-500 font-mono text-xs tracking-widest uppercase">Initializing Race...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[160px] rounded-full" />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-8">
            <motion.div 
              initial={{ rotate: -15, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)] border border-white/10"
            >
              <Trophy size={40} className="text-white drop-shadow-lg" />
            </motion.div>
            <div>
              <motion.h1 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="text-7xl font-black tracking-tighter text-white uppercase italic leading-none"
              >
                Race to Milan
              </motion.h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">2026 Campaign</span>
                <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">Target: 125 Starts</span>
              </div>
            </div>
          </div>

          {/* Master Counter */}
          <div className="flex items-center gap-10 bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">Current Starts</span>
              <div className="flex items-center gap-8">
                <button 
                  onClick={() => updateStats(Math.max(0, stats.total_starts - 1))}
                  className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-white active:scale-90"
                >
                  <Minus size={28} />
                </button>
                <motion.span 
                  key={stats.total_starts}
                  initial={{ y: 20, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  className="text-8xl font-black tabular-nums text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  {stats.total_starts}
                </motion.span>
                <button 
                  onClick={() => updateStats(stats.total_starts + 1)}
                  className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-white/20"
                >
                  <Plus size={28} />
                </button>
              </div>
            </div>
            <div className="h-20 w-px bg-white/10" />
            <div className="flex flex-col justify-center">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Deadline</span>
              <div className="text-2xl font-black text-white">{format(DEADLINE, 'dd MMM yyyy')}</div>
              <div className="text-sm font-bold text-emerald-500 mt-1 flex items-center gap-2">
                <Clock size={16} /> {daysRemaining} days left
              </div>
            </div>
          </div>
        </header>

        {/* Main Roadmap Section */}
        <section className="mb-16 bg-slate-900/20 backdrop-blur-md border border-white/5 rounded-[3rem] p-16 relative overflow-hidden min-h-[600px] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
            <div className="absolute top-20 left-40 w-2 h-2 bg-white rounded-full animate-pulse" />
            <div className="absolute top-60 right-80 w-1 h-1 bg-white rounded-full animate-pulse delay-700" />
            <div className="absolute bottom-40 left-1/2 w-2 h-2 bg-white rounded-full animate-pulse delay-1000" />
          </div>

          <div className="flex items-center justify-end mb-16 relative z-20">
            <div className="flex items-center gap-6 bg-black/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-emerald-400">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> Unlocked
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-500">
                <div className="w-3 h-3 rounded-full bg-slate-800 border border-white/10" /> Locked
              </div>
            </div>
          </div>

          {/* The Winding Roadmap Track */}
          <div className="relative h-[400px] w-full max-w-[1200px] mx-auto">
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0F172A" />
                  <stop offset="50%" stopColor="#1E293B" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
                <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <pattern id="roadPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.05)" />
                </pattern>
              </defs>
              
              {/* Road Path Shadow */}
              <path 
                d="M 50 200 C 200 200, 200 50, 350 50 S 500 350, 650 350 S 800 50, 950 50 S 1100 200, 1150 200"
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="60"
                strokeLinecap="round"
                transform="translate(0, 10)"
              />

              {/* Road Path Definition */}
              <path 
                id="windingRoad"
                d="M 50 200 C 200 200, 200 50, 350 50 S 500 350, 650 350 S 800 50, 950 50 S 1100 200, 1150 200"
                fill="none"
                stroke="url(#roadGradient)"
                strokeWidth="50"
                strokeLinecap="round"
                className="opacity-90"
              />

              {/* Road Texture */}
              <path 
                d="M 50 200 C 200 200, 200 50, 350 50 S 500 350, 650 350 S 800 50, 950 50 S 1100 200, 1150 200"
                fill="none"
                stroke="url(#roadPattern)"
                strokeWidth="50"
                strokeLinecap="round"
              />

              {/* Road Center Line */}
              <path 
                d="M 50 200 C 200 200, 200 50, 350 50 S 500 350, 650 350 S 800 50, 950 50 S 1100 200, 1150 200"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="20 20"
                strokeLinecap="round"
                className="opacity-20"
              />

              {/* Progress Path */}
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: stats.total_starts / MASTER_TARGET }}
                transition={{ duration: 2, ease: "circOut" }}
                d="M 50 200 C 200 200, 200 50, 350 50 S 500 350, 650 350 S 800 50, 950 50 S 1100 200, 1150 200"
                fill="none"
                stroke="#10b981"
                strokeWidth="50"
                strokeLinecap="round"
                className="opacity-30"
                filter="url(#roadGlow)"
              />

              {/* Milestone Markers on Winding Path */}
              {MILESTONES.map((m) => {
                const isUnlocked = stats.total_starts >= m.value;
                const distance = (m.value / MASTER_TARGET) * 100;
                
                return (
                  <motion.g 
                    key={m.id}
                    style={{ 
                      offsetPath: 'path("M 50 200 C 200 200, 200 50, 350 50 S 500 350, 650 350 S 800 50, 950 50 S 1100 200, 1150 200")',
                      offsetDistance: `${distance}%`,
                      offsetRotate: '0deg',
                    }}
                  >
                    {/* Marker Dot */}
                    <circle 
                      cx="0" cy="0" 
                      r={isUnlocked ? 14 : 10} 
                      fill={isUnlocked ? "#ffffff" : "#020617"} 
                      stroke={isUnlocked ? "#34d399" : "#334155"} 
                      strokeWidth="4" 
                      className="transition-all duration-700"
                      filter={isUnlocked ? "drop-shadow(0 0 10px rgba(16,185,129,0.5))" : "none"}
                    />

                    {/* HTML Signpost via foreignObject */}
                    <foreignObject x="-150" y="-200" width="300" height="180" className="overflow-visible pointer-events-none">
                      <div className="w-full h-full flex flex-col items-center justify-end pb-4">
                        <motion.div 
                          animate={{ 
                            y: isUnlocked ? [0, -8, 0] : 0,
                            scale: isUnlocked ? 1.15 : 1,
                            rotate: isUnlocked ? [0, -2, 2, 0] : 0
                          }}
                          transition={{ duration: 0.5, repeat: isUnlocked ? Infinity : 0, repeatDelay: 3 }}
                          className={cn(
                            "mb-2 px-6 py-3 rounded-2xl border backdrop-blur-xl transition-all duration-700 pointer-events-auto",
                            isUnlocked 
                              ? "bg-emerald-500/40 border-emerald-400 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)]" 
                              : "bg-slate-900/80 border-white/10 text-white/80"
                          )}
                        >
                          <div className="text-[11px] font-black uppercase tracking-[0.2em] mb-1 text-white">{m.label}</div>
                          <div className="text-2xl font-black tabular-nums text-white leading-none">{m.value}</div>
                          {isUnlocked && (
                            <motion.div 
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="absolute -top-3 -right-3 bg-emerald-400 text-black rounded-full p-1 shadow-xl border-2 border-white/20"
                            >
                              <CheckCircle2 size={16} strokeWidth={3} />
                            </motion.div>
                          )}
                        </motion.div>

                        {/* Unlocked Badge */}
                        <AnimatePresence>
                          {isUnlocked && (
                            <motion.div 
                              initial={{ opacity: 0, y: 15, scale: 0.5 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className="px-3 py-1 rounded-full bg-emerald-400 text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                              Unlocked
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </foreignObject>
                  </motion.g>
                );
              })}

              {/* The Progress Marker on Winding Path */}
              <motion.g 
                style={{ 
                  offsetPath: 'path("M 50 200 C 200 200, 200 50, 350 50 S 500 350, 650 350 S 800 50, 950 50 S 1100 200, 1150 200")',
                  offsetRotate: 'auto'
                }}
                animate={{ offsetDistance: `${(stats.total_starts / MASTER_TARGET) * 100}%` }}
                transition={{ type: "spring", stiffness: 30, damping: 15 }}
              >
                <circle cx="0" cy="0" r="16" fill="#10b981" stroke="white" strokeWidth="4" filter="drop-shadow(0 0 15px rgba(16,185,129,0.8))" />
                <motion.circle 
                  cx="0" cy="0" r="16" fill="none" stroke="#34d399" strokeWidth="2"
                  animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
              </motion.g>
            </svg>
          </div>

        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center group hover:border-emerald-500/30 transition-all">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Target size={32} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Remaining Target</span>
            <span className="text-5xl font-black text-white tabular-nums">{Math.max(0, MASTER_TARGET - stats.total_starts)}</span>
            <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Starts to Milan</div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center group hover:border-purple-500/30 transition-all">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Calendar size={32} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Days Remaining</span>
            <span className="text-5xl font-black text-white tabular-nums">{daysRemaining}</span>
            <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Until 30 June 2026</div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center text-center group hover:border-orange-500/30 transition-all">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp size={32} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Overall Progress</span>
            <span className="text-5xl font-black text-white tabular-nums">{Math.round((stats.total_starts / MASTER_TARGET) * 100)}%</span>
            <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">To AC FUCKING MILAN</div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Trophy size={14} /> Race to Milan Dashboard v3.0
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
            Optimized for 4K TV Display • Manual Data Entry Mode
          </div>
        </footer>
      </div>
    </div>
  );
}
