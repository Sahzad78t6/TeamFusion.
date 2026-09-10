import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Zap, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';

interface IdentityHologramProps {
  alignmentScore: number;
  driftScore: number;
  currentArchetype: string;
  dreamArchetype: string;
  dimensionMastery?: { dimension: string; mastery_pct: number; completed?: number; total?: number }[];
  activeFocus?: { dimension: string; label: string; target_mastery: number };
}

export const IdentityHologram: React.FC<IdentityHologramProps> = ({
  alignmentScore,
  driftScore,
  currentArchetype,
  dreamArchetype,
  dimensionMastery,
  activeFocus,
}) => {
  const colors = ['#8b5cf6', '#38bdf8', '#ec4899', '#6366f1', '#10b981', '#f59e0b'];

  const nodes = (dimensionMastery && dimensionMastery.length > 0)
    ? dimensionMastery.map((item, idx) => ({
        label: item.dimension,
        score: item.mastery_pct,
        angle: (idx * 360) / dimensionMastery.length,
        color: colors[idx % colors.length],
      }))
    : [
        { label: 'Curriculum', score: alignmentScore, angle: 0, color: '#8b5cf6' },
      ];

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const activeNodeLabel = selectedNode || nodes[0]?.label || 'Curriculum Focus';

  return (
    <div className="relative w-full h-[420px] rounded-3xl bg-gradient-to-br from-purple-950/40 via-[#0c0e17] to-black border border-purple-500/30 p-6 flex flex-col justify-between overflow-hidden shadow-2xl shadow-purple-950/50 backdrop-blur-2xl group">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-purple-glow opacity-60 pointer-events-none group-hover:opacity-80 transition-opacity" />
      <div className="absolute inset-0 bg-blue-glow opacity-40 pointer-events-none" />

      {/* Header Info Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Holographic Identity Matrix</h3>
            <p className="text-[10px] text-slate-400">Live Mem0 Neural Vector Visualization</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple">{alignmentScore}% Aligned</Badge>
          <Badge variant="cyan">Drift: {driftScore}%</Badge>
        </div>
      </div>

      {/* 3D Visualizer Center Ring */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-4">
        {/* Orbital Ring 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute w-64 h-64 rounded-full border border-purple-500/30 border-dashed"
        />

        {/* Orbital Ring 2 (Reverse) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute w-80 h-80 rounded-full border border-cyan-500/20 border-dotted"
        />

        {/* Central Glowing Core */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 25px rgba(139,92,246,0.4)', '0 0 45px rgba(139,92,246,0.7)', '0 0 25px rgba(139,92,246,0.4)'] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-28 h-28 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex flex-col items-center justify-center text-center border-2 border-purple-300/40 shadow-2xl relative cursor-pointer"
        >
          <Brain className="w-8 h-8 text-white mb-0.5 animate-pulse" />
          <span className="text-[10px] font-extrabold text-white tracking-wider uppercase">Identity Twin</span>
          <span className="text-[9px] font-bold text-purple-200">{alignmentScore}% Match</span>
        </motion.div>

        {/* Orbital Nodes */}
        {nodes.map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const radius = 135;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;

          const isSelected = activeNodeLabel === node.label;

          return (
            <motion.button
              key={i}
              onClick={() => setSelectedNode(node.label)}
              whileHover={{ scale: 1.2 }}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              title={`${node.label}: ${node.score}% Mastery`}
              className={`absolute px-2 py-1 rounded-xl flex items-center justify-center text-xs font-bold border transition-all shadow-lg backdrop-blur-md cursor-pointer ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-300 shadow-purple-500/50 z-20 scale-110'
                  : 'bg-[#12141d]/80 text-slate-300 border-white/10 hover:border-purple-400'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full mr-1 shrink-0"
                style={{ backgroundColor: node.color }}
              />
              <span className="text-[9px]">{node.score}%</span>
            </motion.button>
          );
        })}
      </div>

      {/* Bottom Live Selected Readout Bar */}
      <div className="relative z-10 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-slate-300 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            Active Focus Dimension:{' '}
            <strong className="text-white">
              {activeFocus?.dimension
                ? `${activeFocus.dimension} (${activeFocus.label})`
                : activeNodeLabel}
            </strong>
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          Target: {activeFocus?.target_mastery ?? 80}% Mastery
        </span>
      </div>
    </div>
  );
};
