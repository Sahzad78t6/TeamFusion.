import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Mic, Sparkles, Send, Flame, Smile, Heart, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { MoodType } from '../../types';

export const Reflection: React.FC = () => {
  const { reflections, addReflection, refreshDashboard } = useApp();
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType>('ecstatic');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');

  React.useEffect(() => {
    refreshDashboard();
  }, []);

  const moods: { type: MoodType; emoji: string; label: string }[] = [
    { type: 'ecstatic', emoji: '🚀', label: 'Ecstatic' },
    { type: 'happy', emoji: '⚡', label: 'Energized' },
    { type: 'thoughtful', emoji: '🧠', label: 'Thoughtful' },
    { type: 'neutral', emoji: '🌿', label: 'Balanced' },
    { type: 'stressed', emoji: '💡', label: 'Challenged' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    addReflection({
      mood: selectedMood,
      emoji: selectedEmoji,
      prompt: 'What was your biggest breakthrough or technical insight today?',
      content,
      sentimentScore: 92,
      keyInsights: ['Reflection logged successfully', 'Mem0 vector updated'],
    });

    setContent('');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">

            <Badge variant="cyan">{reflections.length} Journal Entries Logged</Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">Reflection Journal</h1>
        </div>
      </div>

      {/* Main Journal Editor */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Prompt of the Day</span>
          <h3 className="text-lg font-bold text-white">"What was your biggest technical or mindset breakthrough today?"</h3>
        </div>

        {/* Mood Selector Chips */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 block">Select Current Mindset State</span>
          <div className="flex flex-wrap gap-3">
            {moods.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => {
                  setSelectedMood(m.type);
                  setSelectedEmoji(m.emoji);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${selectedMood === m.type
                  ? 'bg-purple-600/30 border-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form & Audio UI */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="relative">
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your daily reflection, key insights, or mind shifts..."
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed"
            />


          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">AI sentiment analyzer will process this entry.</span>
            <Button variant="glow" size="md" type="submit" rightIcon={<Send className="w-4 h-4" />}>
              Save Entry & Sync Vector
            </Button>
          </div>
        </form>
      </div>

      {/* Historical Reflections Feed */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <PenTool className="w-4 h-4 text-purple-400" />
          Past Reflection Entries
        </h3>

        <div className="space-y-4">
          {reflections.map((ref) => (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ref.emoji}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{ref.date}</h4>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Mood: {ref.mood}</span>
                  </div>
                </div>

                <Badge variant="purple">Sentiment: {ref.sentimentScore}%</Badge>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic bg-white/5 p-3 rounded-xl border border-white/5">
                "{ref.content}"
              </p>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Extracted Insights</span>
                <div className="flex flex-wrap gap-2">
                  {ref.keyInsights.map((insight, i) => (
                    <span key={i} className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      ✓ {insight}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
