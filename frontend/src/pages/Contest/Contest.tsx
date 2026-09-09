import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getActiveContestApi,
  submitContestCodeApi,
  ActiveContestResponse,
  ContestSubmitResponse,
  CodingContestQuestion,
} from '../../services/api';

const LANGUAGE_OPTIONS = [
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'c', label: 'C', monacoId: 'c' },
];

export const Contest: React.FC = () => {
  const { authToken } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  const [contest, setContest] = useState<ActiveContestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState<boolean>(false);
  const [testEnded, setTestEnded] = useState<boolean>(false);
  const [testEndedReason, setTestEndedReason] = useState<string>('');

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [languageMap, setLanguageMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resultsMap, setResultsMap] = useState<Record<string, ContestSubmitResponse>>({});
  const [lastAutoSubmitted, setLastAutoSubmitted] = useState<boolean>(false);

  // Keep latest state in refs for event listener access without closure staleness
  const contestRef = useRef<ActiveContestResponse | null>(null);
  contestRef.current = contest;
  const activeQuestionIndexRef = useRef<number>(0);
  activeQuestionIndexRef.current = activeQuestionIndex;
  const codeMapRef = useRef<Record<string, string>>({});
  codeMapRef.current = codeMap;
  const languageMapRef = useRef<Record<string, string>>({});
  languageMapRef.current = languageMap;
  const hasEnteredFullscreenRef = useRef<boolean>(false);
  hasEnteredFullscreenRef.current = hasEnteredFullscreen;
  const testEndedRef = useRef<boolean>(false);
  testEndedRef.current = testEnded;

  // Helper to extract starter code string based on language
  const getStarterCode = (q: CodingContestQuestion, lang: string): string => {
    if (!q || !q.starter_code) return '';
    if (typeof q.starter_code === 'object') {
      return q.starter_code[lang] || q.starter_code['python'] || Object.values(q.starter_code)[0] || '';
    }
    return String(q.starter_code);
  };

  // 1. Poll GET /contests/active every 5 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchActiveContest = async () => {
      if (!authToken) return;
      try {
        const active = await getActiveContestApi(authToken);
        if (!isMounted) return;

        setContest(active);
        // Initialize starter code & language if not already set
        if (active && active.questions && active.questions.length > 0) {
          setCodeMap((prev) => {
            const nextCode = { ...prev };
            active.questions.forEach((q) => {
              const lang = languageMap[q.id] || 'python';
              if (nextCode[q.id] === undefined) {
                nextCode[q.id] = getStarterCode(q, lang);
              }
            });
            return nextCode;
          });

          setLanguageMap((prev) => {
            const nextLang = { ...prev };
            active.questions.forEach((q) => {
              if (nextLang[q.id] === undefined) {
                nextLang[q.id] = 'python';
              }
            });
            return nextLang;
          });
        }
      } catch (err) {
        console.error('Failed to poll active contest:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActiveContest();
    const interval = setInterval(fetchActiveContest, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authToken]);

  // Helper to immediately auto-submit active question and lock contest
  const terminateAndAutoSubmit = async (reason = 'Test ended — you exited fullscreen') => {
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
          setLastAutoSubmitted(true);
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

  // Fullscreen change & Escape key listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!document.fullscreenElement;
      if (!isFullscreenNow && hasEnteredFullscreenRef.current && !testEndedRef.current) {
        terminateAndAutoSubmit('Test ended — you exited fullscreen');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hasEnteredFullscreenRef.current && !testEndedRef.current) {
        terminateAndAutoSubmit('Test ended — you exited fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [authToken]);

  const handleEnterFullscreen = async () => {
    try {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setHasEnteredFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request failed or was rejected:', err);
      setHasEnteredFullscreen(true);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    if (!activeQuestion || testEnded) return;

    const q = activeQuestion;
    const currentCode = codeMap[q.id] || '';
    const oldLang = languageMap[q.id] || 'python';
    const oldStarter = getStarterCode(q, oldLang);
    const newStarter = getStarterCode(q, newLang);

    // If code is empty or matches old starter code (or any language's starter code), swap to new starter code
    const allStarters = LANGUAGE_OPTIONS.map((opt) => getStarterCode(q, opt.id));
    const isUnmodified = !currentCode.trim() || currentCode === oldStarter || allStarters.includes(currentCode);

    if (isUnmodified) {
      setCodeMap((prev) => ({ ...prev, [q.id]: newStarter }));
    }

    setLanguageMap((prev) => ({ ...prev, [q.id]: newLang }));
  };

  const handleManualSubmit = async () => {
    if (!contest || testEnded || submitting || !authToken) return;
    const activeQ = contest.questions[activeQuestionIndex];
    if (!activeQ) return;

    const currentLang = languageMap[activeQ.id] || 'python';
    const currentCode = codeMap[activeQ.id] !== undefined 
      ? codeMap[activeQ.id] 
      : getStarterCode(activeQ, currentLang);

    setSubmitting(true);
    try {
      const res = await submitContestCodeApi(authToken, contest.id, {
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-slate-400 text-sm">Checking for active coding contests...</p>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mx-auto mb-6 text-slate-400">
          <Terminal className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">No active contest right now</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          There are no scheduled coding contests currently open for your institution. Check back later or notify your administrator.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-white/5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
          <span>Auto-polling every 5s</span>
        </div>
      </div>
    );
  }

  if (!hasEnteredFullscreen && !testEnded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-b from-[#161a29] to-[#0d101d] border border-indigo-500/20 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5 text-indigo-400 shadow-lg shadow-indigo-500/10">
            <Code2 className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            CONTEST LIVE NOW
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-3">Live Coding Assessment</h1>
          <p className="text-slate-300 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            You have {contest.questions.length} algorithmic challenge{contest.questions.length > 1 ? 's' : ''} to solve.
            Proctoring requires entering fullscreen mode.
          </p>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 text-left flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <strong className="font-semibold text-amber-300">Fullscreen Anti-Cheat Rule:</strong> Exiting fullscreen (pressing Esc, switching tabs, or un-maximizing) will immediately trigger auto-submission of your current code and end the test.
            </div>
          </div>

          <button
            id="enter-fullscreen-btn"
            onClick={handleEnterFullscreen}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Enter Fullscreen to Begin</span>
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = contest.questions[activeQuestionIndex];
  const activeLang = languageMap[activeQuestion?.id] || 'python';
  const activeCode = codeMap[activeQuestion?.id] !== undefined
    ? codeMap[activeQuestion?.id]
    : getStarterCode(activeQuestion, activeLang);
  const currentResult = resultsMap[activeQuestion?.id];
  const selectedLangObj = LANGUAGE_OPTIONS.find((l) => l.id === activeLang) || LANGUAGE_OPTIONS[0];

  return (
    <div
      ref={containerRef}
      id="contest-fullscreen-container"
      className="flex flex-col h-full min-h-screen bg-[#090b11] text-white p-4 lg:p-6 select-none overflow-auto"
    >
      {/* Test Ended Banner if exited fullscreen */}
      {testEnded && (
        <div id="test-ended-banner" className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h2 className="font-bold text-red-300 text-base">{testEndedReason || 'Test ended — you exited fullscreen'}</h2>
              <p className="text-xs text-red-200/80">
                {lastAutoSubmitted
                  ? 'Your active code was automatically submitted to the judge before the session locked.'
                  : 'Your contest session is locked.'}
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded bg-red-950/60 border border-red-800 text-red-300 font-mono">
            SESSION LOCKED
          </span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Coding Assessment</h1>
            <p className="text-xs text-slate-400">
              Question {activeQuestionIndex + 1} of {contest.questions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Question Selector Tabs */}
          <div className="flex items-center gap-2">
            {contest.questions.map((q, idx) => {
              const hasResult = resultsMap[q.id];
              const isPassed = hasResult?.passed === true;
              return (
                <button
                  key={q.id}
                  id={`question-tab-${idx}`}
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

          {/* Exit Fullscreen button */}
          {!testEnded && (
            <button
              id="exit-fullscreen-btn"
              onClick={async () => {
                if (document.fullscreenElement) {
                  try {
                    await document.exitFullscreen();
                  } catch (e) {
                    console.warn(e);
                  }
                }
                terminateAndAutoSubmit('Test ended — you exited fullscreen');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exit Fullscreen & End Test"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Exit Fullscreen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Question Details on Left / Monaco Editor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Question Details */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-[#0e111a] border border-white/10 rounded-xl p-5 overflow-y-auto max-h-[75vh]">
          {activeQuestion ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
                  {activeQuestion.difficulty || 'Easy'}
                </span>
                <span className="text-xs text-slate-400 font-mono">Piston Remote Execution</span>
              </div>

              <h2 className="text-lg font-semibold text-white">{activeQuestion.title}</h2>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {activeQuestion.description}
              </div>

              {/* Sample Test Cases */}
              {activeQuestion.test_cases && activeQuestion.test_cases.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Sample Test Inputs
                  </h3>
                  <div className="space-y-2">
                    {activeQuestion.test_cases.map((tc, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-slate-300">
                        <span className="text-slate-500">Input: </span>
                        {tc.input.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution Feedback Display */}
              {currentResult && (
                <div id="test-result-box" className="mt-4 pt-4 border-t border-white/10">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Judge Verdict
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
                        <div className="text-sm font-bold">
                          {currentResult.passed === true
                            ? 'All Test Cases Passed!'
                            : currentResult.passed === false
                            ? 'Wrong Answer / Test Failure'
                            : 'Execution Service Unavailable'}
                        </div>
                        <div className="text-xs opacity-80">
                          {currentResult.passed === true
                            ? 'Your solution produced the expected output on all test cases.'
                            : currentResult.passed === false
                            ? 'One or more test cases did not match expected output.'
                            : currentResult.error || 'Submission saved for manual review.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Test Cases breakdown */}
                  {currentResult.results && currentResult.results.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {currentResult.results.map((r, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg text-center font-mono text-xs border ${
                            r.passed
                              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                              : 'bg-red-950/40 border-red-800/40 text-red-300'
                          }`}
                        >
                          Case #{r.test_case_index + 1}: {r.passed ? 'PASS' : 'FAIL'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-400 text-sm">No question selected.</p>
          )}
        </div>

        {/* Right Column: Monaco Editor Component */}
        <div className="lg:col-span-7 flex flex-col bg-[#0e111a] border border-white/10 rounded-xl overflow-hidden shadow-xl">
          {/* Editor Header: File Name & Language Selector */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a0d14] border-b border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span className="font-mono">solution.{selectedLangObj.monacoId}</span>
            </div>

            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 hidden sm:inline">Language:</label>
              <select
                id="language-select"
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

              {testEnded && (
                <span className="text-[11px] font-semibold text-red-400 flex items-center gap-1 ml-2">
                  <AlertTriangle className="w-3 h-3" /> Input Locked
                </span>
              )}
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[400px] bg-[#1e1e1e]">
            <Editor
              height="400px"
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
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: 'always',
                suggestOnTriggerCharacters: true,
              }}
              onChange={(val) => {
                if (activeQuestion && val !== undefined) {
                  setCodeMap((prev) => ({ ...prev, [activeQuestion.id]: val }));
                }
              }}
            />
          </div>

          {/* Editor Footer Action Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a0d14] border-t border-white/10">
            <div className="text-xs text-slate-400">
              Piston Multi-Language Execution Engine • Standard I/O (stdin/stdout)
            </div>
            <button
              id="contest-submit-btn"
              onClick={handleManualSubmit}
              disabled={testEnded || submitting}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-xs text-white transition-all shadow-md ${
                testEnded
                  ? 'bg-slate-700/50 cursor-not-allowed text-slate-400'
                  : submitting
                  ? 'bg-indigo-700 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 cursor-pointer'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to Piston...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Run & Submit Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contest;
