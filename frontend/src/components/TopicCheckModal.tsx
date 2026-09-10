import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, BookOpen, Lock, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTopicCheckApi, submitTopicCheckApi } from '../services/api';
import { Badge } from './common/Badge';
import { Button } from './common/Button';
import { useNavigate } from 'react-router-dom';

interface TopicQuestion {
  id: string;
  prompt: string;
  options: string[];
}

interface TopicCheckModalProps {
  topicCode: string;
  topicLabel: string;
  onPassed: () => void;
  onClose: () => void;
}

export const TopicCheckModal: React.FC<TopicCheckModalProps> = ({
  topicCode,
  topicLabel,
  onPassed,
  onClose,
}) => {
  const { authToken } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<TopicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; score: number; message: string } | null>(null);

  const hasSubmittedRef = useRef(false);
  const answersRef = useRef<Record<string, number>>({});
  answersRef.current = answers;

  const exitFullscreenSafely = () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const loadCheck = async () => {
    if (!authToken) {
      onPassed();
      onClose();
      return;
    }
    setLoading(true);
    setResult(null);
    setAnswers({});
    hasSubmittedRef.current = false;

    try {
      const data = await getTopicCheckApi(authToken, topicCode);
      if (!data || data.available === false || !Array.isArray(data.questions) || data.questions.length === 0) {
        console.log(`No topic check configured for '${topicCode}'. Falling back to direct completion.`);
        onPassed();
        onClose();
        return;
      }
      setQuestions(data.questions);

      // Enter fullscreen for anti-cheat
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request deferred or blocked:', err);
        });
      }
    } catch (err) {
      console.warn('Failed to load topic check, falling back:', err);
      onPassed();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheck();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !hasSubmittedRef.current) {
        console.warn('User exited fullscreen mid-quiz. Auto-submitting current answers...');
        handleSubmitAnswers();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      exitFullscreenSafely();
    };
  }, [topicCode]);

  const handleSubmitAnswers = async () => {
    if (hasSubmittedRef.current || !authToken) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);

    try {
      const res = await submitTopicCheckApi(authToken, topicCode, answersRef.current);
      setResult({
        passed: res.passed,
        score: res.score,
        message: res.message || (res.passed ? `Scored ${res.score}%!` : `Scored ${res.score}%. Need 80% to pass.`),
      });

      if (res.passed) {
        setTimeout(() => {
          exitFullscreenSafely();
          onPassed();
          onClose();
        }, 1500);
      } else {
        exitFullscreenSafely();
      }
    } catch (err: any) {
      setResult({
        passed: false,
        score: 0,
        message: err.message || 'Submission failed. Please try again.',
      });
      exitFullscreenSafely();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const isAllAnswered = totalQuestions > 0 && answeredCount >= totalQuestions;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0c0e17] flex flex-col items-center justify-center space-y-4 p-6">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-spin">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Loading Topic Mastery Check for &quot;{topicLabel}&quot;...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0e17] text-white flex flex-col overflow-y-auto p-4 md:p-8 select-none">
      {/* Header Banner */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="purple" icon={<Lock className="w-3 h-3 text-amber-400" />}>
              Locked Fullscreen View • Anti-Cheat Active
            </Badge>
            <Badge variant="cyan">
              {answeredCount} / {totalQuestions} Answered
            </Badge>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">
            Topic Mastery Check: {topicLabel}
          </h2>
        </div>

        <button
          onClick={() => {
            exitFullscreenSafely();
            onClose();
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Cancel Check"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Result Card overlay */}
      {result ? (
        <div className="max-w-2xl mx-auto w-full my-auto p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6 text-center shadow-2xl backdrop-blur-2xl">
          {result.passed ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Mastery Check Passed! 🎉</h3>
              <p className="text-lg font-bold text-emerald-400">Score: {result.score}%</p>
              <p className="text-sm text-slate-300">{result.message}</p>
              <p className="text-xs text-slate-400 italic">Advancing topic pointer and updating your learning progress...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Mastery Check Not Passed</h3>
              <p className="text-lg font-bold text-rose-400">Score: {result.score}% (80% Required)</p>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">{result.message}</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    exitFullscreenSafely();
                    onClose();
                    navigate('/learning');
                  }}
                  leftIcon={<BookOpen className="w-4 h-4 text-cyan-400" />}
                >
                  Review Topic Resources
                </Button>
                <Button
                  variant="glow"
                  size="md"
                  onClick={loadCheck}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Retry Quiz
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Questions Scrollable Container */
        <div className="max-w-4xl mx-auto w-full space-y-6 pb-24">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              You must score at least <strong>80%</strong> to complete this topic. Exiting fullscreen before submitting will automatically submit your current answers.
            </span>
          </div>

          {questions.map((q, qIndex) => {
            const selectedOpt = answers[q.id];
            return (
              <div key={q.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                    Question {qIndex + 1} of {totalQuestions}
                  </span>
                  {selectedOpt !== undefined && (
                    <Badge variant="cyan">Selected</Badge>
                  )}
                </div>

                <h3 className="text-base font-bold text-white leading-relaxed">{q.prompt}</h3>

                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-600/30 border-purple-400 text-white shadow-md shadow-purple-500/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-purple-500 text-white' : 'bg-white/10 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0c0e17]/95 border-t border-white/10 backdrop-blur-xl flex items-center justify-between max-w-4xl mx-auto z-50">
            <span className="text-xs text-slate-400 font-medium">
              {answeredCount} of {totalQuestions} questions completed
            </span>

            <Button
              variant="glow"
              size="md"
              disabled={!isAllAnswered || submitting}
              onClick={handleSubmitAnswers}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {submitting ? 'Evaluating Submission...' : 'Submit Topic Mastery Check'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
