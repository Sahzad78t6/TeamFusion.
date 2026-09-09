import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, Users, ClipboardList, Code2, Trophy, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import { getInstitutionAnalyticsApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';

export const InstitutionAdmin: React.FC = () => {
  const { authToken } = useApp();
  const [analytics, setAnalytics] = useState<any>();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authToken) {
      getInstitutionAnalyticsApi(authToken)
        .then((data) => setAnalytics(data))
        .catch((err) => setErrorMsg(err.message));
    }
  }, [authToken]);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          Institution Dashboard
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview & Analytics</h1>
        <p className="text-slate-400 text-sm">
          Tenant-scoped institution analytics, assessment management, and contest monitoring.
        </p>
      </div>

      {errorMsg && <p className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">{errorMsg}</p>}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Registered Students</p>
          <p className="text-3xl font-extrabold text-white">{analytics?.total_students ?? 0}</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Assessments Created</p>
          <p className="text-3xl font-extrabold text-white">{analytics?.assessment_count ?? 0}</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Code2 className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Coding Contests</p>
          <p className="text-3xl font-extrabold text-white">{analytics?.contest_count ?? 0}</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Submissions</p>
          <p className="text-3xl font-extrabold text-white">{analytics?.total_submissions ?? 0}</p>
        </div>
      </div>

      {/* Quick Actions Navigation Grid */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Quick Management Portal
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NavLink
            to="/institution/schedule-assessment"
            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">Schedule Assessment</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create time-bounded evaluations using quiz bank question sampling or custom question entry.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 pt-2">
              Launch Assessment Tool <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </NavLink>

          <NavLink
            to="/institution/schedule-contest"
            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">Schedule Coding Contest</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Set up competitive programming challenges with AST sandbox execution and automated test case evaluation.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 pt-2">
              Launch Contest Tool <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </NavLink>

          <NavLink
            to="/institution/results"
            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Results & Leaderboard</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect real-time student submissions, ranked leaderboards, completion metrics, and tiebreaks.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 pt-2">
              View Leaderboards <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
};
