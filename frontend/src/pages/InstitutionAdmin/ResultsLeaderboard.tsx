import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ClipboardList, Code2, Users, CheckCircle2, Clock, Loader2, Award, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getAdminAssessmentsApi,
  getAdminContestsApi,
  getAssessmentResultsApi,
  getContestResultsApi,
} from '../../services/api';

interface LeaderboardItem {
  rank: number;
  student_name: string;
  score: number;
  submitted_at: string;
  time_taken_seconds: number;
}

interface ResultsResponse {
  title: string;
  cohort_name: string;
  total_assigned: number;
  total_attempted: number;
  leaderboard: LeaderboardItem[];
}

export const ResultsLeaderboard: React.FC = () => {
  const { authToken } = useApp();
  const [type, setType] = useState<'assessment' | 'contest'>('assessment');
  const [items, setItems] = useState<{ id: string; title?: string; cohort_name?: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(true);

  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(false);

  // Fetch list of assessments or contests created by admin's institution
  useEffect(() => {
    if (!authToken) return;
    setIsLoadingItems(true);
    setResults(null);
    setSelectedId('');

    if (type === 'assessment') {
      getAdminAssessmentsApi(authToken)
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setItems(list);
          if (list.length > 0) setSelectedId(list[0].id);
        })
        .catch((err) => console.warn('Failed to load admin assessments:', err))
        .finally(() => setIsLoadingItems(false));
    } else {
      getAdminContestsApi(authToken)
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setItems(list.map((c) => ({ id: c.id, title: `Contest (${c.cohort_name || 'Cohort'}) - ${c.question_count} Qs` })));
          if (list.length > 0) setSelectedId(list[0].id);
        })
        .catch((err) => console.warn('Failed to load admin contests:', err))
        .finally(() => setIsLoadingItems(false));
    }
  }, [authToken, type]);

  // Fetch results whenever selectedId changes
  useEffect(() => {
    if (!authToken || !selectedId) {
      setResults(null);
      return;
    }
    setIsLoadingResults(true);

    const apiCall = type === 'assessment' ? getAssessmentResultsApi : getContestResultsApi;

    apiCall(authToken, selectedId)
      .then((data) => setResults(data))
      .catch((err) => {
        console.warn('Failed to fetch results:', err);
        setResults(null);
      })
      .finally(() => setIsLoadingResults(false));
  }, [authToken, selectedId, type]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Institution Analytics
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Results & Leaderboard</h1>
          <p className="text-slate-400 text-sm">
            Real-time ranked performance breakdown with automated tiebreaks (Highest Score → Fastest Completion).
          </p>
        </div>

        {/* Type Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10">
          <button
            onClick={() => setType('assessment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'assessment'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Assessments
          </button>
          <button
            onClick={() => setType('contest')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'contest'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Coding Contests
          </button>
        </div>
      </div>

      {/* Select Dropdown */}
      <div className="bg-[#12141d]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Select {type === 'assessment' ? 'Assessment' : 'Contest Session'}
          </label>
          {isLoadingItems ? (
            <div className="text-slate-400 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Loading options...
            </div>
          ) : items.length === 0 ? (
            <p className="text-slate-400 text-sm">No scheduled {type}s found for your institution.</p>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full md:w-96 px-4 py-2.5 rounded-xl bg-[#181b28] border border-white/15 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id} className="bg-[#12141d]">
                  {item.title || 'Untitled'} ({item.cohort_name || 'Cohort'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Results Content */}
      {isLoadingResults ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <span className="text-sm font-semibold">Loading leaderboard standings...</span>
        </div>
      ) : !results ? (
        <div className="p-12 text-center bg-[#12141d]/40 border border-white/10 rounded-2xl text-slate-400">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold">Select an evaluation from the dropdown to view results.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Evaluation</span>
                <p className="text-sm font-extrabold text-white truncate max-w-[160px]">{results.title}</p>
                <p className="text-[10px] text-purple-300">{results.cohort_name}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Assigned Students</span>
                <p className="text-2xl font-black text-white">{results.total_assigned}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Submissions</span>
                <p className="text-2xl font-black text-emerald-400">{results.total_attempted}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Completion Rate</span>
                <p className="text-2xl font-black text-amber-400">
                  {results.total_assigned > 0
                    ? `${Math.round((results.total_attempted / results.total_assigned) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>

          {/* Ranked Table */}
          <div className="bg-[#12141d]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Official Leaderboard Standings
              </h2>
              <span className="text-xs text-slate-400">
                {results.leaderboard.length} student{results.leaderboard.length !== 1 ? 's' : ''} ranked
              </span>
            </div>

            {results.leaderboard.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">
                No submissions recorded yet for this evaluation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-white/5 text-[11px] font-bold uppercase text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-3.5">Rank</th>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Score</th>
                      <th className="px-6 py-3.5">Time Taken</th>
                      <th className="px-6 py-3.5">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {results.leaderboard.map((item) => {
                      const isGold = item.rank === 1;
                      const isSilver = item.rank === 2;
                      const isBronze = item.rank === 3;

                      return (
                        <tr
                          key={item.rank}
                          className={`transition-colors ${
                            isGold
                              ? 'bg-amber-500/10 hover:bg-amber-500/15'
                              : isSilver
                              ? 'bg-slate-400/10 hover:bg-slate-400/15'
                              : isBronze
                              ? 'bg-amber-700/10 hover:bg-amber-700/15'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="px-6 py-4 font-bold">
                            {isGold ? (
                              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black inline-flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-amber-400" /> #1
                              </span>
                            ) : isSilver ? (
                              <span className="px-3 py-1 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 text-xs font-black inline-flex items-center gap-1">
                                #2
                              </span>
                            ) : isBronze ? (
                              <span className="px-3 py-1 rounded-full bg-amber-700/20 text-amber-400 border border-amber-700/40 text-xs font-black inline-flex items-center gap-1">
                                #3
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold pl-2">#{item.rank}</span>
                            )}
                          </td>

                          <td className="px-6 py-4 font-semibold text-white">
                            {item.student_name}
                          </td>

                          <td className="px-6 py-4 font-bold text-emerald-400">
                            {item.score}%
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-300">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatDuration(item.time_taken_seconds)}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-400">
                            {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
