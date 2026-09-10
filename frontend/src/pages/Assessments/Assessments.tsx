import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle2, ClipboardList, Loader2, Clock, AlertTriangle, ArrowLeft, Trophy } from 'lucide-react';
import { getAssessmentsApi, submitAssessmentApi, startAssessmentAttemptApi, StudentAssessmentItem } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const Assessments: React.FC = () => {
  const { authToken, setIsFocusMode } = useApp();
  const [assessments, setAssessments] = useState<StudentAssessmentItem[]>([]);
  const [selected, setSelected] = useState<StudentAssessmentItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Timer states
  const [attemptStartIso, setAttemptStartIso] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAssessments = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const items = await getAssessmentsApi(authToken);
      setAssessments(items);
    } catch (e: any) {
      setMessage(e.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

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

  const enterFocusMode = async () => {
    setIsFocusMode(true);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      // Browser full-screen request warning suppress
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

  const handleStartAssessment = async (a: StudentAssessmentItem) => {
    if (!authToken) return;
    try {
      const startRes = await startAssessmentAttemptApi(authToken, a.id);
      const startIso = startRes.start_time || new Date().toISOString();
      setAttemptStartIso(startIso);
      setSelected(a);
      setAnswers({});
      setMessage('');
      await enterFocusMode();
    } catch (e: any) {
      setMessage(e.message || 'Failed to start assessment');
    }
  };

  const submit = useCallback(async () => {
    if (!authToken || !selected) return;
    try {
      const result = await submitAssessmentApi(authToken, selected.id, answers);
      setMessage(`Submitted successfully! Score: ${result.score}%`);
      exitFocusMode();
      setSelected(null);
      setAnswers({});
      fetchAssessments();
    } catch (e: any) {
      setMessage(e.message || 'Failed to submit assessment');
    }
  }, [authToken, selected, answers, fetchAssessments]);

  // Live Countdown Timer ticking every second
  useEffect(() => {
    if (!selected || !attemptStartIso) return;

    const computeTime = () => {
      const nowMs = Date.now();
      const startMs = new Date(attemptStartIso.replace('Z', '+00:00')).getTime();
      const durationMins = selected.duration_minutes || 60;
      const attemptEndMs = startMs + durationMins * 60 * 1000;

      let windowEndMs = attemptEndMs;
      if (selected.end_time) {
        const etMs = new Date(selected.end_time.replace('Z', '+00:00')).getTime();
        windowEndMs = Math.min(attemptEndMs, etMs);
      }

      const diffSec = Math.max(0, Math.floor((windowEndMs - nowMs) / 1000));
      setRemainingSec(diffSec);

      if (diffSec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setMessage('Time limit expired! Auto-submitting assessment...');
        submit();
      }
    };

    computeTime();
    timerRef.current = setInterval(computeTime, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selected, attemptStartIso, submit]);

  const formatTimer = (sec: number | null): string => {
    if (sec === null) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-300 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        <span>Loading assessments...</span>
      </div>
    );
  }

  const liveAssessments = assessments.filter((a) => a.status === 'live');
  const upcomingAssessments = assessments.filter((a) => a.status === 'upcoming');
  const pastAssessments = assessments.filter((a) => a.status === 'past');

  // TAKING ASSESSMENT VIEW (FULLSCREEN TAKEOVER)
  if (selected) {
    const isWarning = remainingSec !== null && remainingSec < 120;

    return (
      <div className="min-h-screen w-full bg-[#0c0e17] text-white p-6 md:p-10 flex flex-col space-y-6 select-none overflow-y-auto">
        {/* Anti-Cheat Header with Timer */}
        <div className="sticky top-0 z-50 glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between bg-[#0c0e17]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exitFocusMode();
                setSelected(null);
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Exit Test
            </Button>
            <div>
              <h2 className="text-base font-extrabold text-white">{selected.title}</h2>
              <span className="text-xs text-slate-400">{selected.skill} · Anti-Cheat Locked Mode</span>
            </div>
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm transition-all ${
              isWarning
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Time Remaining: {formatTimer(remainingSec)}</span>
          </div>
        </div>

        {/* Questions Body */}
        <div className="max-w-4xl mx-auto w-full space-y-8 py-4">
          {selected.questions && selected.questions.length > 0 ? (
            selected.questions.map((q, index) => (
              <div key={q.id} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-slate-200">
                  <span className="text-indigo-400 font-extrabold mr-2">Q{index + 1}.</span>
                  {q.prompt}
                </h3>

                <div className="space-y-2 pt-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelectedOption = answers[q.id] === optIdx;
                    return (
                      <label
                        key={optIdx}
                        onClick={() => setAnswers({ ...answers, [q.id]: optIdx })}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelectedOption
                            ? 'bg-purple-600/20 border-purple-500 text-white font-semibold shadow-md'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={isSelectedOption}
                          onChange={() => {}}
                          className="text-purple-600 focus:ring-0"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 italic">No questions found for this assessment.</p>
          )}

          {/* Submit Action Bar */}
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-slate-400">
              Answered {Object.keys(answers).length} of {selected.questions?.length || 0} questions
            </span>
            <Button
              variant="glow"
              size="lg"
              onClick={submit}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              Submit Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="purple">Cohort Assessments</Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-white mt-2">Assessments & Quizzes</h1>
        <p className="text-xs text-slate-400 mt-1">
          Official skill assessments assigned to your cohort by institution administration.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* 1. LIVE ASSESSMENTS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          Live Assessments
        </h2>

        {liveAssessments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {liveAssessments.map((a) => (
              <div
                key={a.id}
                className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-900/10 to-indigo-900/10 space-y-4 shadow-xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="cyan">LIVE NOW</Badge>
                    <h3 className="text-lg font-bold text-white mt-2">{a.title}</h3>
                    <p className="text-xs text-slate-300 mt-1">{a.skill}</p>
                  </div>
                  {a.my_score !== null && a.my_score !== undefined && (
                    <Badge variant="purple">Completed: {a.my_score}%</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    {a.duration_minutes || 60} mins
                  </span>
                  <span>{a.questions?.length || 0} Questions</span>
                </div>

                <Button
                  variant="glow"
                  className="w-full"
                  onClick={() => handleStartAssessment(a)}
                  leftIcon={<ClipboardList className="w-4 h-4" />}
                >
                  {a.my_score !== null && a.my_score !== undefined ? 'Retake / Practice' : 'Start Assessment'}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-slate-400 text-xs italic">
            No live assessments open right now.
          </div>
        )}
      </div>

      {/* 2. UPCOMING ASSESSMENTS */}
      {upcomingAssessments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Upcoming Assessments
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {upcomingAssessments.map((a) => (
              <div key={a.id} className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3 opacity-80">
                <div className="flex items-center justify-between">
                  <Badge variant="amber">UPCOMING</Badge>
                  <span className="text-[10px] text-slate-400">Starts: {a.start_time?.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <h3 className="text-base font-bold text-white">{a.title}</h3>
                <p className="text-xs text-slate-400">{a.skill} · {a.duration_minutes || 60} mins</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PAST ASSESSMENTS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-indigo-400" />
          Past Test History
        </h2>

        {pastAssessments.length > 0 ? (
          <div className="space-y-3">
            {pastAssessments.map((a) => (
              <div key={a.id} className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{a.title}</h3>
                  <span className="text-[11px] text-slate-400">{a.skill} · Ended: {a.end_time?.slice(0, 10)}</span>
                </div>

                <div>
                  {a.my_score !== null && a.my_score !== undefined ? (
                    <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                      Score: {a.my_score}%
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
            No past assessment history recorded.
          </div>
        )}
      </div>
    </div>
  );
};
