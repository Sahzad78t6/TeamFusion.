import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Circle,
  Flame,
  ArrowUpRight,
  Activity,
  BookOpen,
  Compass,
  PenTool,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  BookCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProgressRing } from '../../components/common/ProgressRing';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const Dashboard: React.FC = () => {
  const { user, identityTwin, tasks, toggleTask, opportunities, learningResources, analytics, setIsCopilotOpen, curriculumPlan, phaseInfo, skippedTopics } = useApp();
  const [isSkippedOpen, setIsSkippedOpen] = useState(false);

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const taskProgress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-black border border-white/10 relative overflow-hidden backdrop-blur-xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="purple" icon={<Sparkles className="w-3.5 h-3.5" />}>
                Identity Alignment: {identityTwin.alignmentPercentage}%
              </Badge>
              <Badge variant="green" icon={<Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}>
                {user.streak} Day Streak
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
              Welcome back, {user.name} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Target Role: <strong className="text-white">{user.dreamRole}</strong>. Identity drift reduced by 12% this week.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NavLink to="/reflection">
              <Button variant="outline" size="sm" leftIcon={<PenTool className="w-4 h-4" />}>
                Log Reflection
              </Button>
            </NavLink>
            <Button
              variant="glow"
              size="sm"
              onClick={() => setIsCopilotOpen(true)}
              leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
            >
              Ask AI Copilot
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Career Pathway Strategy & Phase Progress Banner */}
      {(curriculumPlan || phaseInfo?.display) && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/50 to-slate-900/90 border border-purple-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xl shadow-lg">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-400">
              {curriculumPlan || 'Career Pathway Strategy'}
            </span>
            <h4 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
              {phaseInfo?.display || phaseInfo?.current_phase || 'Active Strategy Phase'}
            </h4>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="cyan" icon={<Sparkles className="w-3.5 h-3.5" />}>
              {phaseInfo?.phase_step && phaseInfo?.total_phases
                ? `Phase ${phaseInfo.phase_step} of ${phaseInfo.total_phases}`
                : 'Strategy Active'}
            </Badge>
          </div>
        </div>
      )}

      {/* Core Key Metric Cards (4 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Identity Score */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identity Score</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{user.identityScore}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">+4% this week</span>
          </div>
          <p className="text-[11px] text-slate-400">{identityTwin.currentArchetype} → {identityTwin.dreamArchetype}</p>
        </div>

        {/* Card 2: Growth Score */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Growth Score</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{user.growthScore}</span>
            <span className="text-xs font-bold text-emerald-400">+14% MoM</span>
          </div>
          <p className="text-[11px] text-slate-400">148 total deep learning hours logged.</p>
        </div>

        {/* Card 3: Burnout Risk Gauge */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Burnout Risk</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{analytics.burnoutRiskPercentage}%</span>
            <span className="text-xs font-bold text-emerald-300">Optimal (Low)</span>
          </div>
          <p className="text-[11px] text-slate-400">Rest windows schedule optimal performance.</p>
        </div>

        {/* Card 4: Daily Task Progress */}
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{completedCount} / {tasks.length}</span>
            <span className="text-xs font-bold text-cyan-400">{taskProgress}% Done</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full transition-all duration-500" style={{ width: `${taskProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Main Grid Section (Analytics + Today's Planner & Opportunities) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Weekly Growth Analytics & Learning Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Growth Analytics Chart */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Growth Prediction & Learning Velocity
                </h3>
                <p className="text-xs text-slate-400">Monthly trajectory towards Founder Archetype</p>
              </div>
              <Badge variant="purple">94% Growth Projection</Badge>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyProgress}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12141d',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Curated Learning Queue */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Recommended Learning Resources</h3>
              </div>
              <NavLink to="/learning" className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {learningResources.slice(0, 2).map((res) => (
                <div key={res.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all space-y-3 group">
                  <div className="relative h-32 rounded-xl overflow-hidden">
                    <img src={res.imageUrl} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-black/70 text-white backdrop-blur-md uppercase">
                      {res.type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">{res.title}</h4>
                  <p className="text-[11px] text-slate-400">{res.author} • {res.duration}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Today's Planner & Top Opportunities */}
        <div className="space-y-6">
          {/* Today's Tasks Widget */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Today's Focus Tasks</h3>
              <NavLink to="/planner" className="text-xs font-semibold text-indigo-400 hover:underline">
                Open Planner
              </NavLink>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    task.isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-400 line-through'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold">{task.title}</p>
                      <span className="text-[10px] text-slate-400">{task.time} • {task.duration}</span>
                    </div>
                  </div>
                </div>
              ))}

              {skippedTopics && skippedTopics.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsSkippedOpen(!isSkippedOpen)}
                    className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white py-1 transition-colors group"
                  >
                    <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <BookCheck className="w-4 h-4" />
                      Already know ({skippedTopics.length})
                    </span>
                    {isSkippedOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isSkippedOpen && (
                    <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/40">
                      {skippedTopics.map((item) => (
                        <div key={item.topic_code} className="flex items-center gap-2 text-[11px] text-slate-300 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          <span className="ml-auto text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Skipped
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Opportunities Preview */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Matches For You</h3>
              </div>
              <NavLink to="/opportunities" className="text-xs font-semibold text-cyan-400 hover:underline">
                Explore All
              </NavLink>
            </div>

            <div className="space-y-3">
              {opportunities.slice(0, 2).map((opp) => (
                <div key={opp.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="cyan">{opp.matchScore}% Match</Badge>
                    <span className="text-[10px] text-slate-400">{opp.deadline}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{opp.title}</h4>
                  <p className="text-[11px] text-slate-400">{opp.organization}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
