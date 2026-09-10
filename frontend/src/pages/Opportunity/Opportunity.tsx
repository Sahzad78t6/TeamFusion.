import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, ArrowUpRight, Sparkles, Loader2, Globe, ExternalLink, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { getRecommendationsApi, getLiveOpportunitiesApi } from '../../services/api';
import { LiveOpportunity } from '../../types';

export const Opportunity: React.FC = () => {
  const { authToken } = useApp();
  const [selectedType, setSelectedType] = useState('all');
  const [liveOpportunities, setLiveOpportunities] = useState<LiveOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTopicCode, setCurrentTopicCode] = useState<string>('dsa');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const types = [
    { label: 'All Opportunities', value: 'all' },
    { label: 'Hackathons', value: 'hackathons' },
    { label: 'Internships / Roles', value: 'internships_roles' },
    { label: 'Communities', value: 'communities' },
    { label: 'Mentorship', value: 'mentorship' },
    { label: 'Conferences', value: 'conferences' },
  ];

  // Fetch current topic recommendation on mount
  useEffect(() => {
    if (authToken) {
      getRecommendationsApi(authToken)
        .then((rec) => {
          if (rec && rec.topic_code) {
            setCurrentTopicCode(rec.topic_code);
          }
        })
        .catch((err) => {
          console.warn('Failed to load topic for opportunities:', err);
        });
    }
  }, [authToken]);

  // Fetch live opportunities when topic changes
  useEffect(() => {
    if (authToken) {
      setIsLoading(true);
      setErrorMsg(null);
      getLiveOpportunitiesApi(authToken, currentTopicCode)
        .then((res) => {
          if (res && Array.isArray(res.opportunities)) {
            setLiveOpportunities(res.opportunities);
          } else {
            setLiveOpportunities([]);
          }
        })
        .catch((err) => {
          console.warn('Failed to load live opportunities:', err);
          setErrorMsg('Failed to load live opportunities right now.');
          setLiveOpportunities([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [authToken, currentTopicCode]);

  const filtered = liveOpportunities.filter(
    (o) => selectedType === 'all' || o.category === selectedType
  );

  const activeTabObj = types.find((t) => t.value === selectedType);
  const activeTabName = activeTabObj ? activeTabObj.label : 'Opportunities';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan" icon={<Sparkles className="w-3.5 h-3.5" />}>
              Opportunity Radar Active
            </Badge>
            <Badge variant="purple">98% Highest Match</Badge>
            {liveOpportunities.length > 0 && (
              <Badge variant="amber">{liveOpportunities.length} Live Opportunities</Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">Growth Opportunities</h1>
          <p className="text-xs text-slate-400">Scanned globally to match your Identity Twin skill gaps.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {types.map((t) => {
          const count = t.value === 'all'
            ? liveOpportunities.length
            : liveOpportunities.filter((o) => o.category === t.value).length;

          return (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                selectedType === t.value
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{t.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-slate-300 border border-white/5">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Opportunities List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 glass-panel rounded-3xl border border-white/10 text-slate-400 text-xs gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Scanning global live opportunities for {currentTopicCode}...</span>
        </div>
      ) : errorMsg ? (
        <div className="p-4 glass-panel rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{errorMsg} Check back soon.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-3xl border border-white/10 text-center space-y-3">
          <Compass className="w-10 h-10 text-slate-500" />
          <h3 className="text-sm font-bold text-white">No Live Opportunities</h3>
          <p className="text-xs text-slate-400 max-w-md">
            No live {activeTabName} found right now for this topic — check back soon
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((opp, idx) => (
            <motion.div
              key={`opp-${idx}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -3 }}
              onClick={() => window.open(opp.url, '_blank')}
              className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 hover:border-cyan-500/40 transition-all flex flex-col justify-between group cursor-pointer bg-[#0c0e17]/80"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 uppercase tracking-wider">
                    {opp.category ? opp.category.replace('_', ' ') : 'Opportunity'}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mt-1">
                  {opp.title}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{opp.org_or_repo}</span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex flex-wrap gap-1.5">
                  {opp.tags &&
                    opp.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/5 text-slate-300 border border-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                </div>

                <Button
                  variant="glow"
                  size="sm"
                  className="w-full text-xs"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  View Opportunity
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
