import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Code2,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Terminal,
  FileCode,
  ShieldAlert,
  ArrowLeft,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getContestsApi,
  submitContestCodeApi,
  startContestAttemptApi,
  StudentContestItem,
  ContestSubmitResponse,
  CodingContestQuestion,
} from '../../services/api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

const LANGUAGE_OPTIONS = [
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'c', label: 'C', monacoId: 'c' },
];

export const Contest: React.FC = () => {
  const { authToken, setIsFocusMode } = useApp();
  const [contests, setContests] = useState<StudentContestItem[]>([]);
  const [selectedContest, setSelectedContest] = useState<StudentContestItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testEnded, setTestEnded] = useState<boolean>(false);
  const [testEndedReason, setTestEndedReason] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [languageMap, setLanguageMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resultsMap, setResultsMap] = useState<Record<string, ContestSubmitResponse>>({});

  // Timer states
  const [attemptStartIso, setAttemptStartIso] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for auto-submit handlers
  const contestRef = useRef<StudentContestItem | null>(null);
  contestRef.current = selectedContest;
  const activeQuestionIndexRef = useRef<number>(0);
  activeQuestionIndexRef.current = activeQuestionIndex;
  const codeMapRef = useRef<Record<string, string>>({});
  codeMapRef.current = codeMap;
  const languageMapRef = useRef<Record<string, string>>({});
  languageMapRef.current = languageMap;
  const testEndedRef = useRef<boolean>(false);
  testEndedRef.current = testEnded;

  const fetchContests = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const items = await getContestsApi(authToken);
      setContests(items);
    } catch (err: any) {
      setMessage(err.message || 'Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  // Clean up focus mode and browser fullscreen on unmount
  useEffect(() => {
    return () => {
      setIsFocusMode(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [setIsFocusMode]);

  const getStarterCode = (q: CodingContestQuestion, lang: string): string => {
    if (!q || !q.starter_code) return '';
    if (typeof q.starter_code === 'object') {
      return q.starter_code[lang] || q.starter_code['python'] || Object.values(q.starter_code)[0] || '';
    }
    return String(q.starter_code);
  };

  const enterFocusMode = async () => {
    setIsFocusMode(true);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      // Suppress browser fullscreen warning
    }
  };

  const exitFocusMode = () => {
    setIsFocusMode(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const terminateAndAutoSubmit = async (reason = 'Test ended — session locked') => {
    if (testEndedRef.current) return;
    setTestEnded(true);
    setTestEndedReason(reason);

    const currentContest = contestRef.current;
    if (currentContest && currentContest.questions && currentContest.questions.length > 0) {
      const currentQIndex = activeQuestionIndexRef.current;
      const activeQ = currentContest.questions[currentQIndex];
      if (activeQ && authToken) {
        const currentLang = languageMapRef.current[activeQ.id] || 'python';
        const currentCode = codeMapRef.current[activeQ.id] !== undefined
          ? codeMapRef.current[activeQ.id]
          : getStarterCode(activeQ, currentLang);
        try {
          const res = await submitContestCodeApi(authToken, currentContest.id, {
            question_id: activeQ.id,
            code: currentCode,
            language: currentLang,
          });
          setResultsMap((prev) => ({ ...prev, [activeQ.id]: res }));
        } catch (err) {
          console.error('Error auto-submitting on exit:', err);
        }
      }
    }
  };

  // Fullscreen change & Escape listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!document.fullscreenElement;
      if (!isFullscreenNow && selectedContest && !testEndedRef.current) {
        terminateAndAutoSubmit('Test ended — you exited fullscreen');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedContest && !testEndedRef.current) {
        terminateAndAutoSubmit('Test ended — you exited fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedContest, authToken]);

  const handleStartContest = async (c: StudentContestItem) => {
    if (!authToken) return;
    try {
      const startRes = await startContestAttemptApi(authToken, c.id);
      const startIso = startRes.start_time || new Date().toISOString();
      setAttemptStartIso(startIso);
      setSelectedContest(c);
      setTestEnded(false);
      setTestEndedReason('');
      setActiveQuestionIndex(0);

      // Initialize starter code & language map
      const initialCode: Record<string, string> = {};
      const initialLang: Record<string, string> = {};
      c.questions.forEach((q) => {
        initialLang[q.id] = 'python';
        initialCode[q.id] = getStarterCode(q, 'python');
      });
      setCodeMap(initialCode);
      setLanguageMap(initialLang);
      setResultsMap({});

      await enterFocusMode();
    } catch (e: any) {
      setMessage(e.message || 'Failed to start contest attempt');
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (!selectedContest || !attemptStartIso) return;

    const computeTime = () => {
      const nowMs = Date.now();
      const startMs = new Date(attemptStartIso.replace('Z', '+00:00')).getTime();
      const durationMins = selectedContest.duration_minutes || 60;
      const attemptEndMs = startMs + durationMins * 60 * 1000;

      let windowEndMs = attemptEndMs;
      if (selectedContest.end_time) {
        const etMs = new Date(selectedContest.end_time.replace('Z', '+00:00')).getTime();
        windowEndMs = Math.min(attemptEndMs, etMs);
      }

      const diffSec = Math.max(0, Math.floor((windowEndMs - nowMs) / 1000));
      setRemainingSec(diffSec);

      if (diffSec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        terminateAndAutoSubmit('Contest time expired! Session locked.');
      }
    };

    computeTime();
    timerRef.current = setInterval(computeTime, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedContest, attemptStartIso]);

  const formatTimer = (sec: number | null): string => {
    if (sec === null) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLanguageChange = (newLang: string) => {
    const q = selectedContest?.questions[activeQuestionIndex];
    if (!q || testEnded) return;

    const currentCode = codeMap[q.id] || '';
    const oldLang = languageMap[q.id] || 'python';
    const oldStarter = getStarterCode(q, oldLang);
    const newStarter = getStarterCode(q, newLang);

    const allStarters = LANGUAGE_OPTIONS.map((opt) => getStarterCode(q, opt.id));
    const isUnmodified = !currentCode.trim() || currentCode === oldStarter || allStarters.includes(currentCode);

    if (isUnmodified) {
      setCodeMap((prev) => ({ ...prev, [q.id]: newStarter }));
    }

    setLanguageMap((prev) => ({ ...prev, [q.id]: newLang }));
  };

  const handleManualSubmit = async () => {
    if (!selectedContest || testEnded || submitting || !authToken) return;
    const activeQ = selectedContest.questions[activeQuestionIndex];
    if (!activeQ) return;

    const currentLang = languageMap[activeQ.id] || 'python';
    const currentCode = codeMap[activeQ.id] !== undefined
      ? codeMap[activeQ.id]
      : getStarterCode(activeQ, currentLang);

    setSubmitting(true);
    try {
      const res = await submitContestCodeApi(authToken, selectedContest.id, {
        question_id: activeQ.id,
        code: currentCode,
        language: currentLang,
      });
      setResultsMap((prev) => ({ ...prev, [activeQ.id]: res }));
    } catch (err: any) {
      alert(`Submission error: ${err.message || 'Server error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-300 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span>Loading coding contests...</span>
      </div>
    );
  }

  const liveContests = contests.filter((c) => c.status === 'live');
  const upcomingContests = contests.filter((c) => c.status === 'upcoming');
  const pastContests = contests.filter((c) => c.status === 'past');

  // CONTEST TAKEOVER VIEW (TRUE FULLSCREEN)
  if (selectedContest) {
    const activeQuestion = selectedContest.questions[activeQuestionIndex];
    const activeLang = languageMap[activeQuestion?.id] || 'python';
    const activeCode = codeMap[activeQuestion?.id] !== undefined
      ? codeMap[activeQuestion?.id]
      : getStarterCode(activeQuestion, activeLang);
    const currentResult = resultsMap[activeQuestion?.id];
    const selectedLangObj = LANGUAGE_OPTIONS.find((l) => l.id === activeLang) || LANGUAGE_OPTIONS[0];
    const isTimerWarning = remainingSec !== null && remainingSec < 120;

    return (
      <div className="min-h-screen w-full bg-[#090b11] text-white p-4 lg:p-6 flex flex-col select-none overflow-auto">
        {/* Test Ended Banner if exited fullscreen or time expired */}
        {testEnded && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <h2 className="font-bold text-red-300 text-sm">{testEndedReason || 'Contest session ended'}</h2>
                <p className="text-xs text-red-200/80">Your code has been saved and your session is locked.</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded bg-red-950/60 border border-red-800 text-red-300 font-mono">
              LOCKED
            </span>
          </div>
        )}

        {/* Header bar with timer and exit button */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exitFocusMode();
                setSelectedContest(null);
                fetchContests();
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-base font-bold text-white">{selectedContest.title}</h1>
              <p className="text-xs text-slate-400">
                Question {activeQuestionIndex + 1} of {selectedContest.questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs transition-all ${
                isTimerWarning
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Remaining: {formatTimer(remainingSec)}</span>
            </div>

            {/* Question Selector Tabs */}
            <div className="flex items-center gap-1.5">
              {selectedContest.questions.map((q, idx) => {
                const hasResult = resultsMap[q.id];
                const isPassed = hasResult?.passed === true;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      activeQuestionIndex === idx
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <span>Q{idx + 1}</span>
                    {hasResult && (
                      isPassed ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-400" />
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question & Monaco Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Left Column: Problem Statement & HackerEarth Sample I/O */}
          <div className="lg:col-span-5 flex flex-col gap-4 bg-[#0e111a] border border-white/10 rounded-2xl p-5 overflow-y-auto max-h-[75vh]">
            {activeQuestion ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
                    {activeQuestion.difficulty || 'Easy'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Piston Judge</span>
                </div>

                <h2 className="text-lg font-semibold text-white">{activeQuestion.title}</h2>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {activeQuestion.description}
                </div>

                {/* PART E — HackerEarth-Style Sample Input / Sample Output */}
                {activeQuestion.sample_test_cases && activeQuestion.sample_test_cases.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Sample Test Cases (HackerEarth Format)
                    </h3>
                    {activeQuestion.sample_test_cases.map((sample, idx) => (
                      <div key={idx} className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/10">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sample Case #{idx + 1}
                        </span>

                        <div>
                          <span className="text-[10px] font-semibold text-indigo-300 block mb-1">Sample Input:</span>
                          <pre className="p-2.5 rounded-lg bg-[#06080e] border border-white/5 font-mono text-xs text-slate-200 overflow-x-auto">
                            {sample.input}
                          </pre>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-emerald-300 block mb-1">Sample Output:</span>
                          <pre className="p-2.5 rounded-lg bg-[#06080e] border border-white/5 font-mono text-xs text-emerald-300 overflow-x-auto">
                            {sample.expected_output}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Judge Verdict Display */}
                {currentResult && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Verdict
                    </h3>
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between mb-3 ${
                        currentResult.passed === true
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : currentResult.passed === false
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {currentResult.passed === true ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : currentResult.passed === false ? (
                          <XCircle className="w-5 h-5 text-red-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                        )}
                        <div>
                          <div className="text-xs font-bold">
                            {currentResult.passed === true
                              ? 'All Test Cases Passed!'
                              : currentResult.passed === false
                              ? 'Wrong Answer / Failure'
                              : 'Service Unavailable'}
                          </div>
                          <div className="text-[11px] opacity-80">
                            {currentResult.passed === true
                              ? 'All hidden test cases passed successfully.'
                              : currentResult.error || 'Check your code logic.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-xs">No question selected.</p>
            )}
          </div>

          {/* Right Column: Monaco Editor Component */}
          <div className="lg:col-span-7 flex flex-col bg-[#0e111a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0d14] border-b border-white/10">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="font-mono">solution.{selectedLangObj.monacoId}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Language:</label>
                <select
                  value={activeLang}
                  disabled={testEnded}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#141824] border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.id} value={lang.id} className="bg-[#0e111a]">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-[380px] bg-[#1e1e1e]">
              <Editor
                height="380px"
                theme="vs-dark"
                language={selectedLangObj.monacoId}
                value={activeCode}
                options={{
                  readOnly: testEnded,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  tabSize: 4,
                }}
                onChange={(val) => {
                  if (activeQuestion && val !== undefined) {
                    setCodeMap((prev) => ({ ...prev, [activeQuestion.id]: val }));
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0d14] border-t border-white/10">
              <span className="text-[11px] text-slate-400">Standard stdin/stdout judgment</span>
              <Button
                variant="glow"
                size="sm"
                onClick={handleManualSubmit}
                disabled={testEnded || submitting}
                leftIcon={submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
              >
                {submitting ? 'Running & Submitting...' : 'Run & Submit Code'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT CONTEST LIST VIEW (LIVE, UPCOMING, PAST)
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="purple">Coding Contests</Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-white mt-2">Competitive Coding Arena</h1>
        <p className="text-xs text-slate-400 mt-1">
          Timed algorithmic contests created by your institution with automated multi-language judgment.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* 1. LIVE CONTESTS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          Live Contests
        </h2>

        {liveContests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {liveContests.map((c) => (
              <div
                key={c.id}
                className="glass-panel p-6 rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 space-y-4 shadow-xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="cyan">LIVE NOW</Badge>
                    <h3 className="text-lg font-bold text-white mt-2">{c.title}</h3>
                    <p className="text-xs text-slate-300 mt-1">{c.questions?.length || 0} Algorithmic Challenges</p>
                  </div>
                  {c.my_score !== null && c.my_score !== undefined && (
                    <Badge variant="purple">Completed: {c.my_score}%</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    {c.duration_minutes || 60} mins
                  </span>
                  <span>Ends: {c.end_time?.slice(0, 16).replace('T', ' ')}</span>
                </div>

                <Button
                  variant="glow"
                  className="w-full"
                  onClick={() => handleStartContest(c)}
                  leftIcon={<Code2 className="w-4 h-4" />}
                >
                  {c.my_score !== null && c.my_score !== undefined ? 'Resume / View Contest' : 'Enter Contest (Fullscreen)'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-slate-400 text-xs italic">
            No live coding contests currently active for your institution.
          </div>
        )}
      </div>

      {/* 2. UPCOMING CONTESTS */}
      {upcomingContests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Upcoming Contests
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {upcomingContests.map((c) => (
              <div key={c.id} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3 opacity-80">
                <div className="flex items-center justify-between">
                  <Badge variant="amber">UPCOMING</Badge>
                  <span className="text-[10px] text-slate-400">Starts: {c.start_time?.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <h3 className="text-base font-bold text-white">{c.title}</h3>
                <p className="text-xs text-slate-400">{c.questions?.length || 0} Challenges · {c.duration_minutes || 60} mins</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PAST CONTESTS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-indigo-400" />
          Past Contest History
        </h2>

        {pastContests.length > 0 ? (
          <div className="space-y-3">
            {pastContests.map((c) => (
              <div key={c.id} className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{c.title}</h3>
                  <span className="text-[11px] text-slate-400">{c.questions?.length || 0} Questions · Ended: {c.end_time?.slice(0, 10)}</span>
                </div>

                <div>
                  {c.my_score !== null && c.my_score !== undefined ? (
                    <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                      Score: {c.my_score}%
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 font-medium text-xs border border-white/10">
                      Not Attempted
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-slate-400 text-xs italic">
            No past contest history recorded.
          </div>
        )}
      </div>
    </div>
  );
};

export default Contest;
