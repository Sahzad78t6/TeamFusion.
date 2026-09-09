import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Calendar, Clock, Check, AlertCircle, Plus, Trash2, Loader2, Sparkles, Layers } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { getCohortsApi, createAssessmentApi } from '../../services/api';

interface CohortItem {
  id: string;
  name: string;
  year: string;
  branch: string;
  section?: string;
}

interface ManualQuestion {
  prompt: string;
  options: string[];
  correct_option: number;
}

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const ScheduleAssessment: React.FC = () => {
  const { authToken } = useApp();
  const [cohorts, setCohorts] = useState<CohortItem[]>([]);
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [skill, setSkill] = useState('');

  // Mode state: 'B' (bank sample) vs 'A' (manual)
  const [mode, setMode] = useState<'B' | 'A'>('B');

  // Mode B state
  const [year, setYear] = useState('1st Year');
  const [topicCode, setTopicCode] = useState('python_basics');
  const [questionCount, setQuestionCount] = useState(5);

  // Mode A state
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([
    { prompt: '', options: ['', '', '', ''], correct_option: 0 },
  ]);

  // Window & Duration state
  const getNowISO = () => new Date().toISOString().slice(0, 16);
  const getOneHourLaterISO = () => new Date(Date.now() + 3600000).toISOString().slice(0, 16);

  const [startTime, setStartTime] = useState(getNowISO());
  const [endTime, setEndTime] = useState(getOneHourLaterISO());
  const [durationMinutes, setDurationMinutes] = useState(30);

  useEffect(() => {
    if (authToken) {
      setIsLoadingCohorts(true);
      getCohortsApi(authToken)
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setCohorts(list);
          if (list.length > 0) {
            setSelectedCohortId(list[0].id);
          }
        })
        .catch((err) => {
          console.warn('Failed to load cohorts:', err);
        })
        .finally(() => setIsLoadingCohorts(false));
    }
  }, [authToken]);

  const handleAddQuestion = () => {
    setManualQuestions([...manualQuestions, { prompt: '', options: ['', '', '', ''], correct_option: 0 }]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setManualQuestions(manualQuestions.filter((_, i) => i !== idx));
  };

  const handleManualQuestionChange = (qIdx: number, field: string, val: any) => {
    const updated = [...manualQuestions];
    if (field === 'prompt') updated[qIdx].prompt = val;
    else if (field === 'correct_option') updated[qIdx].correct_option = Number(val);
    setManualQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, val: string) => {
    const updated = [...manualQuestions];
    updated[qIdx].options[oIdx] = val;
    setManualQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Assessment title is required.' });
      return;
    }
    if (!selectedCohortId) {
      setFeedback({ type: 'error', message: 'Please select a target cohort.' });
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setFeedback({ type: 'error', message: 'End time must be after start time.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        cohort_id: selectedCohortId,
        skill: skill.trim() || topicCode || 'General',
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_minutes: Number(durationMinutes),
      };

      if (mode === 'B') {
        payload.year = year;
        payload.topic_code = topicCode.trim();
        payload.question_count = Number(questionCount);
      } else {
        payload.questions = manualQuestions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correct_option: q.correct_option,
        }));
      }

      await createAssessmentApi(authToken!, payload);
      setFeedback({ type: 'success', message: `Assessment "${title}" scheduled successfully!` });
      setTitle('');
      setDescription('');
    } catch (err: any) {
      console.error('Schedule assessment error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to schedule assessment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
          <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
          Institution Admin
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Schedule Assessment</h1>
        <p className="text-slate-400 text-sm">
          Define time-bounded skill evaluations for cohorts with random bank sampling or custom questions.
        </p>
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{feedback.message}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Info */}
        <div className="bg-[#12141d]/80 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Basic Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Assessment Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm Python Syntax Evaluation"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Target Cohort *</label>
              {isLoadingCohorts ? (
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Loading cohorts...
                </div>
              ) : (
                <select
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#181b28] border border-white/15 text-white text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#12141d]">
                      {c.name} ({c.year} - {c.branch})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Skill / Domain Tag</label>
              <input
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="e.g. Data Structures, Python, Web Dev"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions or notes for students..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Window & Duration Pickers */}
        <div className="bg-[#12141d]/80 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Time Window & Duration Limits
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Window Start Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Window End Time *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400">Caps elapsed time once student clicks Start.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Question Source Mode */}
        <div className="bg-[#12141d]/80 border border-white/10 rounded-2xl p-6 space-y-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Question Source
            </h2>

            {/* Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setMode('B')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'B' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode B: Quiz Bank Sampling
              </button>
              <button
                type="button"
                onClick={() => setMode('A')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'A' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode A: Manual Entry
              </button>
            </div>
          </div>

          {mode === 'B' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Target Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#181b28] border border-white/15 text-white text-sm"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y} className="bg-[#12141d]">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Topic Code</label>
                <input
                  type="text"
                  value={topicCode}
                  onChange={(e) => setTopicCode(e.target.value)}
                  placeholder="e.g. python_basics"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Number of Questions</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {manualQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">Question #{qIdx + 1}</span>
                    {manualQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.prompt}
                    onChange={(e) => handleManualQuestionChange(qIdx, 'prompt', e.target.value)}
                    placeholder="Enter question prompt..."
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <input
                        key={oIdx}
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                        placeholder={`Option ${oIdx + 1}`}
                        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Correct Option:</span>
                    <select
                      value={q.correct_option}
                      onChange={(e) => handleManualQuestionChange(qIdx, 'correct_option', e.target.value)}
                      className="px-2 py-1 rounded bg-[#181b28] border border-white/15 text-white"
                    >
                      {q.options.map((_, oIdx) => (
                        <option key={oIdx} value={oIdx}>
                          Option {oIdx + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion} leftIcon={<Plus className="w-4 h-4" />}>
                Add Another Question
              </Button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <Button type="submit" variant="glow" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Scheduling...' : 'Confirm & Schedule Assessment'}
          </Button>
        </div>
      </form>
    </div>
  );
};
