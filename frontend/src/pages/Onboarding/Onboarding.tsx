import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight, ArrowLeft, Check, Target, GraduationCap, Building2, Loader2, BookCheck, FastForward } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { getCurriculumTopicsApi, CurriculumTopicItem } from '../../services/api';

const GOAL_OPTIONS: [string, string][] = [
  ['software_engineering', 'Software Engineering'],
  ['aiml_engineering', 'AI/ML Engineering'],
  ['data_engineering', 'Data Engineering'],
  ['cybersecurity', 'Cybersecurity'],
  ['cloud_devops_sre', 'Cloud/DevOps/SRE Engineering'],
  ['data_science', 'Data Science'],
  ['data_analytics_bi', 'Data Analytics & BI'],
  ['embedded_systems', 'Embedded & Systems Engineering'],
  ['qa_automation', 'QA Automation / Software Test Engineering'],
  ['frontend_fullstack', 'Frontend & Full-Stack Application Engineering'],
];

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { submitOnboarding } = useApp();

  // 4-step wizard state
  const [goalCode, setGoalCode] = useState<string>('software_engineering');
  const [yearLabel, setYearLabel] = useState<string>('1st Year');
  const [knownTopics, setKnownTopics] = useState<string[]>([]);
  const [college, setCollege] = useState<string>('');

  // Curriculum topics for Step 3
  const [topics, setTopics] = useState<CurriculumTopicItem[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState<boolean>(false);

  const totalSteps = 4;

  // Fetch topics whenever goal, year, or entering step 3
  useEffect(() => {
    if (step === 3) {
      setIsLoadingTopics(true);
      getCurriculumTopicsApi(goalCode, yearLabel)
        .then((data) => {
          setTopics(data || []);
        })
        .catch((err) => {
          console.warn('Failed to fetch topics for onboarding:', err);
          setTopics([]);
        })
        .finally(() => {
          setIsLoadingTopics(false);
        });
    }
  }, [step, goalCode, yearLabel]);

  const toggleTopic = (topicCode: string) => {
    setKnownTopics((prev) =>
      prev.includes(topicCode) ? prev.filter((t) => t !== topicCode) : [...prev, topicCode]
    );
  };

  const handleSkipStep3 = () => {
    setKnownTopics([]);
    setStep(4);
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      setErrorMsg('');
      try {
        await submitOnboarding({
          goal: goalCode,
          target_role: goalCode,
          current_role: yearLabel,
          skills: [college],
          interests: [],
          experience: yearLabel,
          learning_style: '',
          available_time: '',
          preferred_content: [],
          language: 'English',
          known_topics: knownTopics,
        });
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Onboarding submission error:', err);
        setErrorMsg(err.message || 'Failed to calibrate identity twin. Proceeding to dashboard.');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#090a0f] flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white relative overflow-hidden">
      <div className="absolute -top-40 left-1/3 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-[#12141d]/90 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-2xl space-y-8 relative">
        {/* Wizard Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">GrowthOS Identity Calibration</h2>
              <p className="text-[11px] text-slate-400">Step {step} of {totalSteps}</p>
            </div>
          </div>

          {/* Progress Indicator Bar */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-gradient-to-r from-purple-500 to-indigo-500'
                    : s < step
                    ? 'w-3 bg-purple-500/40'
                    : 'w-3 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Step Contents */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="px-2.5 py-1 text-[10px] font-extrabold bg-purple-500/20 text-purple-300 rounded-full uppercase border border-purple-500/30">
                  Step 1 — Career Goal
                </span>
                <h3 className="text-xl font-bold text-white">What's your goal?</h3>
                <p className="text-xs text-slate-400">Select your primary target track to calibrate your personalized curriculum.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GOAL_OPTIONS.map(([code, label]) => {
                  const isSelected = goalCode === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setGoalCode(code)}
                      className={`flex items-center justify-between p-4 rounded-xl text-xs font-semibold text-left transition-all border ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-500'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Target className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`} />
                        <span>{label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="px-2.5 py-1 text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 rounded-full uppercase border border-indigo-500/30">
                  Step 2 — Academic Stage
                </span>
                <h3 className="text-xl font-bold text-white">Which year are you in?</h3>
                <p className="text-xs text-slate-400">Calibrates pacing, milestones, and graduation readiness.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {YEAR_OPTIONS.map((year) => {
                  const isSelected = yearLabel === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setYearLabel(year)}
                      className={`p-5 rounded-xl text-sm font-semibold text-center border transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <GraduationCap className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span>{year}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 rounded-full uppercase border border-emerald-500/30">
                    Step 3 — Prior Knowledge
                  </span>
                  {knownTopics.length > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <FastForward className="w-3.5 h-3.5" />
                      {knownTopics.length} topic{knownTopics.length > 1 ? 's' : ''} skipped
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white">What do you already know?</h3>
                <p className="text-xs text-slate-400">
                  Select topics you've already mastered. Your roadmap engine will skip these so you start at the right level.
                </p>
              </div>

              {isLoadingTopics ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-xs font-semibold">Loading track topics...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {topics.map((t) => {
                      const isSelected = knownTopics.includes(t.topic_code);
                      return (
                        <div
                          key={t.topic_code}
                          onClick={() => toggleTopic(t.topic_code)}
                          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                              isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-slate-500'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{t.label}</p>
                              {t.phase && (
                                <span className="text-[10px] text-slate-400">{t.phase}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                              Known
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Clear Skip Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleSkipStep3}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 underline underline-offset-4 transition-colors"
                    >
                      <BookCheck className="w-4 h-4 text-purple-400" />
                      I'm completely new to this — skip this step
                    </button>

                    <span className="text-[11px] text-slate-500">
                      {knownTopics.length === 0 ? 'Zero selections' : `${knownTopics.length} selected`}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <span className="px-2.5 py-1 text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 rounded-full uppercase border border-cyan-500/30">
                  Step 4 — Institution
                </span>
                <h3 className="text-xl font-bold text-white">Which college?</h3>
                <p className="text-xs text-slate-400">Unlock peer cohorts, campus leaderboards, and institutional resources.</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. Stanford University, IIT Bombay, MIT..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-white placeholder-slate-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Your college helps us match you with alumni networks and local engineering events.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Bottom Controls */}
        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          {step > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setStep(step - 1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : <div />}

          <Button
            variant="glow"
            size="md"
            disabled={isSubmitting}
            onClick={handleNext}
            rightIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          >
            {isSubmitting
              ? 'Calibrating Twin...'
              : step === totalSteps
              ? 'Calibrate & Launch Dashboard'
              : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};
