import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Calendar, Clock, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { createContestApi } from '../../services/api';

export const ScheduleContest: React.FC = () => {
  const { authToken } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [questionCount, setQuestionCount] = useState(2);

  // Window & Duration state
  const getNowISO = () => new Date().toISOString().slice(0, 16);
  const getTwoHoursLaterISO = () => new Date(Date.now() + 7200000).toISOString().slice(0, 16);

  const [startTime, setStartTime] = useState(getNowISO());
  const [endTime, setEndTime] = useState(getTwoHoursLaterISO());
  const [durationMinutes, setDurationMinutes] = useState(45);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (new Date(endTime) <= new Date(startTime)) {
      setFeedback({ type: 'error', message: 'End time must be after start time.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        question_count: Number(questionCount),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_minutes: Number(durationMinutes),
      };

      await createContestApi(authToken!, payload);
      setFeedback({ type: 'success', message: 'Coding Contest session created & scheduled successfully!' });
    } catch (err: any) {
      console.error('Schedule contest error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to schedule coding contest.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          Institution Admin
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Schedule Coding Contest</h1>
        <p className="text-slate-400 text-sm">
          Launch live competitive programming challenges for your institution with AST sandbox execution and automated test case evaluation.
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
        {/* Section 1: Configuration */}
        <div className="bg-[#12141d]/80 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Contest Setup
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Questions Count (Coding Bank)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-400">Randomly sampled from coding_bank problems.</p>
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
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Window End Time *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Per-Student Duration (Minutes)
              </label>
              <input
                type="number"
                min="10"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <Button type="submit" variant="glow" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Scheduling Contest...' : 'Confirm & Schedule Coding Contest'}
          </Button>
        </div>
      </form>
    </div>
  );
};
