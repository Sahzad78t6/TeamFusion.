import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Circle, Clock, Plus, Flame, Sparkles, ChevronDown, ChevronRight, BookCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TopicCheckModal } from '../../components/TopicCheckModal';

export const Planner: React.FC = () => {
  const { tasks, toggleTask, skippedTopics, refreshDashboard } = useApp();
  const [activeTab, setActiveTab] = useState<'timeline' | 'kanban'>('timeline');
  const [isSkippedOpen, setIsSkippedOpen] = useState(false);
  const [activeCheckTask, setActiveCheckTask] = useState<{ id: string; title: string } | null>(null);

  const completedCount = tasks.filter((t) => t.isCompleted).length;

  const handleTaskClick = (task: { id: string; title: string; isCompleted: boolean }) => {
    if (task.isCompleted) {
      toggleTask(task.id);
    } else {
      setActiveCheckTask({ id: task.id, title: task.title });
    }
  };

  const handleCheckPassed = () => {
    setActiveCheckTask(null);
    refreshDashboard();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Topic Check Anti-Cheat Modal */}
      {activeCheckTask && (
        <TopicCheckModal
          topicCode={activeCheckTask.id}
          topicLabel={activeCheckTask.title}
          onPassed={handleCheckPassed}
          onClose={() => setActiveCheckTask(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="purple" icon={<Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}>
              Daily Focus Engine
            </Badge>
            <Badge variant="cyan">{completedCount} of {tasks.length} Completed</Badge>
            {skippedTopics && skippedTopics.length > 0 && (
              <Badge variant="green" icon={<BookCheck className="w-3.5 h-3.5 text-emerald-400" />}>
                {skippedTopics.length} Pre-known Skipped
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">Daily Planner & Timeline</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'timeline' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'kanban' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              Priority Board
            </button>
          </div>

          <Button variant="glow" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Add Focus Task
          </Button>
        </div>
      </div>

      {/* Timeline View */}
      {activeTab === 'timeline' && (
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Today's Scheduled Micro-Blocks
          </h3>

          <div className="relative pl-6 border-l-2 border-purple-500/30 space-y-6">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                className="relative group"
              >
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all ${task.isCompleted
                    ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/50'
                    : 'bg-[#12141d] border-purple-400'
                    }`}
                />

                <div
                  onClick={() => handleTaskClick(task)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${task.isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-400'
                    : 'bg-white/5 border-white/10 hover:border-purple-500/40 text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-bold ${task.isCompleted ? 'line-through' : ''}`}>
                          {task.title}
                        </h4>
                        <Badge
                          variant={
                            task.priority === 'high' ? 'rose' : task.priority === 'medium' ? 'amber' : 'blue'
                          }
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400">{task.time} • {task.duration} • {task.category}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Skipped Topics Section */}
          {skippedTopics && skippedTopics.length > 0 && (
            <div className="pt-6 border-t border-white/10 space-y-4">
              <button
                type="button"
                onClick={() => setIsSkippedOpen(!isSkippedOpen)}
                className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white py-1 transition-colors"
              >
                <span className="flex items-center gap-2 font-bold text-emerald-400">
                  <BookCheck className="w-4 h-4" />
                  Already know — Skipped Topics ({skippedTopics.length})
                </span>
                {isSkippedOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {isSkippedOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {skippedTopics.map((item) => (
                    <div key={item.topic_code} className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs text-slate-200 font-semibold">{item.label}</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Skipped
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Priority Kanban Board */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['high', 'medium', 'low'] as const).map((prio) => {
            const prioTasks = tasks.filter((t) => t.priority === prio);
            return (
              <div key={prio} className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                    {prio} Priority
                  </span>
                  <Badge variant={prio === 'high' ? 'rose' : prio === 'medium' ? 'amber' : 'blue'}>
                    {prioTasks.length} Tasks
                  </Badge>
                </div>

                <div className="space-y-3">
                  {prioTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleTaskClick(t)}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 cursor-pointer space-y-2"
                    >
                      <h4 className={`text-xs font-bold text-white ${t.isCompleted ? 'line-through opacity-50' : ''}`}>
                        {t.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">{t.time} • {t.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
