import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Target, Brain, ShieldAlert, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { IdentityHologram } from '../../components/identity/IdentityHologram';
import { TiltCard } from '../../components/common/TiltCard';

export const IdentityTwin: React.FC = () => {
  const { identityTwin, setIsCopilotOpen } = useApp();

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="purple" icon={<Sparkles className="w-3.5 h-3.5" />}>
              Mem0 Memory Sync Active
            </Badge>
            <Badge variant="cyan">Identity Drift: {identityTwin.driftScore}%</Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">Identity Twin Engine</h1>
          <p className="text-xs text-slate-400">Real-time model comparing your current self vs your target archetype.</p>
        </div>

        <Button
          variant="glow"
          size="sm"
          onClick={() => setIsCopilotOpen(true)}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Recalibrate Alignment Model
        </Button>
      </div>

      {/* 3D Holographic Identity Visualizer */}
      <IdentityHologram
        alignmentScore={identityTwin.alignmentPercentage}
        driftScore={identityTwin.driftScore}
        currentArchetype={identityTwin.currentArchetype}
        dreamArchetype={identityTwin.dreamArchetype}
        dimensionMastery={identityTwin.dimensionMastery}
        activeFocus={identityTwin.activeFocus}
      />

      {/* Identity Twin Comparison (Current vs Dream Identity with 3D TiltCards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Identity Box */}
        <TiltCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-purple-400 tracking-wider">Current Self Baseline</span>
            <Badge variant="glass">Active State</Badge>
          </div>
          <h2 className="text-xl font-extrabold text-white">{identityTwin.currentArchetype}</h2>

          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-slate-400 block">Target Role Focus</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="purple">{identityTwin.dreamArchetype || 'Software Engineering'}</Badge>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-400 block mb-2">Key Skill Strengths (Completed Topics)</span>
            <div className="space-y-2">
              {identityTwin.keySkillStrengths && identityTwin.keySkillStrengths.length > 0 ? (
                identityTwin.keySkillStrengths.map((label, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-200">
                    <span className="font-semibold">{label}</span>
                    <Badge variant="purple">Mastered (100%)</Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No completed topics yet. Complete topics in your Planner to build skill strengths.</p>
              )}
            </div>
          </div>
        </TiltCard>

        {/* Dream Identity Box */}
        <TiltCard className="p-6 space-y-4 border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider">Dream Archetype Target</span>
            <Badge variant="purple">{identityTwin.alignmentPercentage}% Aligned</Badge>
          </div>
          <h2 className="text-xl font-extrabold text-white">{identityTwin.dreamArchetype}</h2>

          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-slate-400 block">Target Role</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="blue">{identityTwin.dreamArchetype || 'Software Engineering'}</Badge>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-400 block mb-2">Required Target Mastery (Critical P0 Topics)</span>
            <div className="space-y-2">
              {identityTwin.requiredTargetMastery && identityTwin.requiredTargetMastery.length > 0 ? (
                identityTwin.requiredTargetMastery.slice(0, 5).map((label, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-200">
                    <span className="font-semibold">{label}</span>
                    <Badge variant="blue">Required P0</Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">All P0 critical topics completed!</p>
              )}
            </div>
          </div>
        </TiltCard>
      </div>

      {/* Gap Analysis & AI Insights */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Autonomous Gap Analysis & Insights
            </h3>
            <p className="text-xs text-slate-400">Generated by GrowthOS Multi-Agent LangGraph Swarm</p>
          </div>
          <Badge variant="cyan">3 Active Recommendations</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {identityTwin.insights.map((ins) => (
            <div key={ins.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  ins.type === 'positive' ? 'text-emerald-400' : ins.type === 'warning' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {ins.type}
                </span>
                {ins.type === 'positive' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <h4 className="text-xs font-bold text-white">{ins.title}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">{ins.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Evolution Timeline */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Identity Evolution Timeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          {identityTwin.timeline.map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-center relative hover:bg-white/10 transition-colors">
              <span className="text-[10px] font-bold text-purple-400 block">{item.date}</span>
              <p className="text-2xl font-extrabold text-white">{item.alignment}%</p>
              <p className="text-xs text-slate-300 leading-snug">{item.milestone}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
