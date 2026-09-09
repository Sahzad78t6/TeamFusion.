import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Award, Shield, Settings, Moon, Sun, Globe, Bell, CheckCircle2, Trophy, ExternalLink, Sparkles, BarChart3, TrendingUp, Activity, Clock, Zap, LogOut, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const Profile: React.FC = () => {
  const { user, analytics, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'analytics' | 'settings'>('profile');

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Profile Header */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/40 shadow-xl shadow-purple-500/20 shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white">{user.name}</h1>
                <Badge variant="purple">Level {user.level}</Badge>
              </div>
              <p className="text-xs font-semibold text-slate-300">{user.title}</p>
              <p className="text-xs text-slate-400 max-w-md">{user.bio}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 3 Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'profile' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Profile & Badges
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'analytics' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'settings' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Settings
              </button>
            </div>

            {/* Quick Sign Out Button in Header */}
            <Button
              size="sm"
              variant="danger"
              onClick={handleSignOut}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Tab 1: Profile & Badges */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          {/* Institution & Academic Year */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Institution & Academic Year
              </h3>
              <Badge variant="cyan">{user.year || '1st Year'}</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-slate-300 pt-2">
              <div>
                <span className="text-slate-400">Institution: </span>
                <span className="text-white font-semibold">{user.title || user.location || 'Registered Institution'}</span>
              </div>
              <div className="hidden sm:block text-slate-600">•</div>
              <div>
                <span className="text-slate-400">Academic Year: </span>
                <span className="text-indigo-300 font-semibold">{user.year || '1st Year'}</span>
              </div>
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Unlocked Achievements & Badges
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {user.achievements.map((ach) => (
                <div key={ach.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{ach.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{ach.description}</p>
                  </div>
                  <span className="text-[10px] text-purple-400 font-semibold block pt-2">Unlocked {ach.unlockedAt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Certificates */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Verified Credentials & Certificates
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.certificates.map((cert) => (
                <div key={cert.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{cert.issuer}</span>
                    <h4 className="text-sm font-bold text-white">{cert.title}</h4>
                    <span className="text-xs text-slate-400 block">{cert.date}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {cert.skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 text-[9px] rounded bg-white/5 text-slate-300 border border-white/10">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Analytics & Telemetry (Integrated View) */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Growth Prediction</span>
              <p className="text-3xl font-extrabold text-white">{analytics.growthPredictionScore} / 100</p>
              <span className="text-xs font-bold text-emerald-400">+6% Projected Next Month</span>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Burnout Risk Gauge</span>
              <p className="text-3xl font-extrabold text-emerald-400">{analytics.burnoutRiskPercentage}%</p>
              <span className="text-xs font-bold text-emerald-300">Optimal Work-Rest Cadence</span>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consistency Rate</span>
              <p className="text-3xl font-extrabold text-indigo-400">{analytics.consistencyRate}%</p>
              <span className="text-xs font-bold text-slate-400">24-Day Active Streak</span>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Deep Work Hours</span>
              <p className="text-3xl font-extrabold text-cyan-400">{analytics.learningHoursTotal}h</p>
              <span className="text-xs font-bold text-slate-400">Logged since Jan 2026</span>
            </div>
          </div>

          {/* Charts Grid: Skill Radar + Weekly Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skill Mastery Radar */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Skill Mastery Radar (Current vs Target)
                </h3>
                <Badge variant="purple">6 Core Dimensions</Badge>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analytics.radarSkills}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={10} />
                    <Radar name="Current Mastery" dataKey="current" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                    <Radar name="Target Archetype" dataKey="target" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
                    <Tooltip contentStyle={{ backgroundColor: '#12141d', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Heatmap Bar Chart */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Weekly Deep Learning Heatmap (Hours)
                </h3>
                <Badge variant="cyan">Avg 5.3h / Day</Badge>
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.weeklyHeatmap}>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#12141d', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                    <Bar dataKey="hours" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Settings */}
      {activeTab === 'settings' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Application Preferences & Security
          </h3>

          <div className="space-y-4 text-xs text-slate-300">
            {/* Theme Toggle Option */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-300" />}
                <div>
                  <h4 className="font-bold text-white">Appearance Theme</h4>
                  <p className="text-[11px] text-slate-400">Current mode: {theme === 'dark' ? 'Dark Mode (Primary)' : 'Light Mode'}</p>
                </div>
              </div>

              <Button size="sm" variant="outline" onClick={toggleTheme}>
                Toggle to {theme === 'dark' ? 'Light' : 'Dark'}
              </Button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="font-bold text-white">Language & Locale</h4>
                  <p className="text-[11px] text-slate-400">English (United States) — UTC -7</p>
                </div>
              </div>
              <Badge variant="cyan">Default</Badge>
            </div>

            {/* Sign Out Section in Profile Settings */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 mt-6">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-rose-400" />
                <div>
                  <h4 className="font-bold text-white">Account Session</h4>
                  <p className="text-[11px] text-slate-400">Sign out of your GrowthOS account session safely</p>
                </div>
              </div>

              <Button size="sm" variant="danger" onClick={handleSignOut} leftIcon={<LogOut className="w-4 h-4" />}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
