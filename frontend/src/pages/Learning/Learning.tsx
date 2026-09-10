import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Bookmark, Heart, Star, Search, ExternalLink, Loader2, Sparkles, Target, Zap, Clock, Compass } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { getRecommendationsApi, refreshRecommendationsApi, getLearningVideosApi, getLiveResourcesApi } from '../../services/api';
import { VideoResult, LiveResourcesResponse, ArticleResult, BookResult, PaperResult } from '../../types';
import { VideoPlayerModal } from '../../components/VideoPlayerModal';
import { Play, Youtube, AlertTriangle, FileText, Library, GraduationCap, Globe, Calendar, UserCheck } from 'lucide-react';

export const Learning: React.FC = () => {
  const { learningResources, setLearningResources, toggleBookmarkResource, toggleLikeResource, authToken, identityTwin } = useApp();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Personalization signals
  const [targetRole, setTargetRole] = useState<string>('');
  const [primaryGap, setPrimaryGap] = useState<string>('');
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [lastCuratedAt, setLastCuratedAt] = useState<string>('');
  const [currentTopicCode, setCurrentTopicCode] = useState<string>('');

  // Curriculum Roadmap Metadata Signals
  const [priority, setPriority] = useState<string>('');
  const [dimension, setDimension] = useState<string>('');
  const [phase, setPhase] = useState<string>('');
  const [planLabel, setPlanLabel] = useState<string>('');

  // Live YouTube Videos State
  const [liveVideos, setLiveVideos] = useState<VideoResult[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<{ videoId: string; title: string } | null>(null);

  // Live Resources State (Articles, Books, Papers)
  const [liveResources, setLiveResources] = useState<LiveResourcesResponse>({ articles: [], books: [], papers: [] });
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [activeTabRead, setActiveTabRead] = useState<'all' | 'articles' | 'books' | 'papers'>('all');

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const mapResource = (r: any) => ({
    id: r.id || `rec-${Math.random()}`,
    title: r.title,
    type: (r.type || 'course').toLowerCase(),
    author: r.author || r.provider || r.channel || 'GrowthOS AI Curator',
    platform: r.platform || r.provider || r.channel || r.source || 'YouTube',
    duration: r.duration || '20 Mins',
    difficulty: r.difficulty || 'Intermediate',
    category: r.category || 'Architecture',
    rating: r.rating || 4.9,
    matchScore: r.matchScore || r.match_score || 92,
    whyRecommended: r.whyRecommended || r.why_recommended || r.reason || 'Personalized match based on your skill gap.',
    imageUrl: r.imageUrl || r.thumbnail || r.image_url || 'https://images.unsplash.com/photo-1516116211223-48a122638e59?auto=format&fit=crop&w=800&q=80',
    link: r.link || r.url || '#',
    tags: r.tags || ['AI'],
    isBookmarked: false,
    isLiked: false,
    progressPercentage: r.progressPercentage ?? r.progress_percentage ?? 0,
  });

  // Fetch recommendations from backend API on mount
  useEffect(() => {
    if (authToken) {
      setIsLoading(true);
      getRecommendationsApi(authToken)
        .then((data) => {
          if (data) {
            if (data.target_role) setTargetRole(data.target_role);
            if (data.primary_gap) setPrimaryGap(data.primary_gap);
            if (data.learning_style) setLearningStyle(data.learning_style);
            if (data.generated_at) setLastCuratedAt(data.generated_at);
            if (data.priority) setPriority(data.priority);
            if (data.dimension) setDimension(data.dimension);
            if (data.phase) setPhase(data.phase);
            if (data.plan_label) setPlanLabel(data.plan_label);
            if (data.topic_code) setCurrentTopicCode(data.topic_code);

            const recs = data.recommendations || data.resources || [];
            if (recs.length > 0) {
              setLearningResources(recs.map(mapResource));
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to load backend recommendations:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [authToken, setLearningResources]);

  // Fetch live YouTube videos and live reading resources when topic changes
  useEffect(() => {
    if (authToken) {
      const activeTopicCode = currentTopicCode || primaryGap || 'os_networking';

      setIsLoadingVideos(true);
      setVideosError(null);
      getLearningVideosApi(authToken, activeTopicCode)
        .then((res) => {
          if (res && Array.isArray(res.videos)) {
            setLiveVideos(res.videos);
          } else {
            setLiveVideos([]);
          }
        })
        .catch((err) => {
          console.warn('Live YouTube search failed/degraded:', err);
          setLiveVideos([]);
          setVideosError("Couldn't load live video recommendations right now.");
        })
        .finally(() => {
          setIsLoadingVideos(false);
        });

      setIsLoadingLive(true);
      setLiveError(null);
      getLiveResourcesApi(authToken, activeTopicCode)
        .then((res) => {
          if (res) {
            setLiveResources({
              articles: res.articles || [],
              books: res.books || [],
              papers: res.papers || [],
            });
          }
        })
        .catch((err) => {
          console.warn('Live reading resources search failed:', err);
          setLiveResources({ articles: [], books: [], papers: [] });
          setLiveError("Couldn't load live reading resources right now.");
        })
        .finally(() => {
          setIsLoadingLive(false);
        });
    }
  }, [authToken, currentTopicCode, primaryGap]);

  const handleTriggerCuratorAgent = async () => {
    if (!authToken || isLoading) return;
    setIsLoading(true);
    setStatusMsg('Analyzing your current skill gaps...');

    const step1Timer = setTimeout(() => {
      setStatusMsg('Searching personalized resources from YouTube & Web...');
    }, 1000);

    const step2Timer = setTimeout(() => {
      setStatusMsg('Ranking the best matches for your target role...');
    }, 2200);

    try {
      const data = await refreshRecommendationsApi(authToken);
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);

      if (data) {
        if (data.target_role) setTargetRole(data.target_role);
        if (data.primary_gap) setPrimaryGap(data.primary_gap);
        if (data.learning_style) setLearningStyle(data.learning_style);
        if (data.generated_at) setLastCuratedAt(data.generated_at);
        if (data.priority) setPriority(data.priority);
        if (data.dimension) setDimension(data.dimension);
        if (data.phase) setPhase(data.phase);
        if (data.plan_label) setPlanLabel(data.plan_label);
        if (data.topic_code) setCurrentTopicCode(data.topic_code);

        const recs = data.recommendations || data.resources || [];
        if (recs.length > 0) {
          setLearningResources(recs.map(mapResource));
          setStatusMsg(`✓ Agent completed! Curated ${recs.length} personalized resources ready.`);
          setTimeout(() => setStatusMsg(''), 5000);
        } else {
          setStatusMsg('No matching learning resources found for your current skill gap.');
        }
      }
    } catch (err: any) {
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
      console.error('Learning curator execution error:', err);
      setStatusMsg(err.message || 'Failed to trigger agent.');
    } finally {
      setIsLoading(false);
    }
  };

  const types = [
    { label: 'All Media', value: 'all' },
    { label: 'Courses', value: 'course' },
    { label: 'Books', value: 'book' },
    { label: 'Papers', value: 'paper' },
    { label: 'Videos', value: 'video' },
    { label: 'Articles', value: 'article' },
    { label: 'Podcasts', value: 'podcast' },
  ];

  const filtered = learningResources.filter((r) => {
    const matchesType = selectedType === 'all' || r.type === selectedType;
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.author.toLowerCase().includes(search.toLowerCase()) ||
      r.platform.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const activeRole = targetRole || identityTwin.dreamArchetype || 'AI & Systems Engineer';
  const activeGap = primaryGap || 'System Architecture';
  const activeStyle = learningStyle || 'Practical & Visual';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {lastCuratedAt ? (
              <>
                <Badge variant="purple">Curator Run: {formatTimeAgo(lastCuratedAt)}</Badge>
                <Badge variant="cyan">{learningResources.length} Resources Generated</Badge>
                <Badge variant="blue">Skill Focus: {activeGap}</Badge>

              </>
            ) : (
              <>
                <Badge variant="outline">AI Curator Ready</Badge>
                <Badge variant="cyan">{learningResources.length} Resources</Badge>

              </>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2">Learning Curation</h1>

        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="glow"
            size="sm"
            disabled={isLoading}
            onClick={handleTriggerCuratorAgent}
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          >
            {isLoading ? 'AI Curator is searching and personalizing resources...' : 'Run Learning Curator Agent'}
          </Button>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources, topics..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>
      </div>

      {/* Personalized Signals Card */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400">Target Role:</span>
            <span className="text-white font-semibold">{activeRole}</span>
          </div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Priority Gap:</span>
            <span className="text-white font-semibold">{activeGap}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Learning Style:</span>
            <span className="text-white font-semibold capitalize">{activeStyle}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Last curated: {formatTimeAgo(lastCuratedAt)}</span>
        </div>
      </div>

      {/* Strategic Focus & Priority Badge Row */}
      {(priority || dimension || phase) && (
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-indigo-950/30">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Priority Badge */}
            {priority === 'P0' && (
              <span className="px-3 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/15 animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                P0 · Critical Focus
              </span>
            )}
            {priority === 'P1' && (
              <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                P1 · High Priority
              </span>
            )}
            {priority === 'P2' && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                P2 · Medium Focus
              </span>
            )}
            {priority === 'P3' && (
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                P3 · Postponable
              </span>
            )}

            {/* Dimension Badge */}
            {dimension && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 capitalize">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                {dimension.replace('_', ' ')}
              </span>
            )}

            {/* Phase Badge */}
            {phase && (
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                {phase}
              </span>
            )}
          </div>

          {planLabel && (
            <span className="text-[11px] font-medium text-slate-400 italic">
              {planLabel}
            </span>
          )}
        </div>
      )}

      {/* Watch Now — Live YouTube Video Tutorials Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Youtube className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Watch Now — Live Video Tutorials
                {liveVideos.length > 0 && (
                  <Badge variant="cyan">{liveVideos.length} Live Results</Badge>
                )}
              </h2>

            </div>
          </div>
        </div>

        {isLoadingVideos ? (
          <div className="flex items-center justify-center p-8 glass-panel rounded-2xl border border-white/10 text-slate-400 text-xs gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>Fetching live YouTube tutorials for {dimension || primaryGap || 'topic'}...</span>
          </div>
        ) : videosError ? (
          <div className="flex items-center gap-2 p-4 glass-panel rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{videosError} Static curriculum resources are ready below.</span>
          </div>
        ) : liveVideos.length === 0 ? (
          <div className="p-4 glass-panel rounded-2xl border border-white/10 text-slate-400 text-xs text-center">
            No live videos returned for this topic right now. Explore static curated resources below.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveVideos.map((v) => (
              <motion.div
                key={v.video_id}
                whileHover={{ y: -3 }}
                onClick={() => setActiveVideoModal({ videoId: v.video_id, title: v.title })}
                className="group glass-panel rounded-2xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-red-500/40 transition-all duration-300 cursor-pointer bg-[#0c0e17]/80"
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border border-white/20">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-black/80 text-white border border-white/10 backdrop-blur-md">
                    {v.duration_formatted}
                  </span>
                </div>

                {/* Video Details */}
                <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                    {v.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="truncate">{v.channel}</span>
                    <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0">
                      Play Inline
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Read Now — Live Articles, Books & Papers Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Read Now — Live Articles, Books & Papers
                {(liveResources.articles.length > 0 || liveResources.books.length > 0 || liveResources.papers.length > 0) && (
                  <Badge variant="cyan">
                    {liveResources.articles.length + liveResources.books.length + liveResources.papers.length} Live Results
                  </Badge>
                )}
              </h2>

            </div>
          </div>

          {/* Sub-tabs for reading section */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            {(
              [
                { id: 'all', label: 'All', count: liveResources.articles.length + liveResources.books.length + liveResources.papers.length },
                { id: 'articles', label: 'Articles', count: liveResources.articles.length },
                { id: 'books', label: 'Books', count: liveResources.books.length },
                { id: 'papers', label: 'Papers', count: liveResources.papers.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTabRead(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${activeTabRead === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-slate-400 border border-white/5">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLoadingLive ? (
          <div className="flex items-center justify-center p-8 glass-panel rounded-2xl border border-white/10 text-slate-400 text-xs gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Fetching live articles, books & arXiv papers for {dimension || primaryGap || 'topic'}...</span>
          </div>
        ) : liveError ? (
          <div className="flex items-center gap-2 p-4 glass-panel rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{liveError} Static curriculum resources are ready below.</span>
          </div>
        ) : liveResources.articles.length === 0 && liveResources.books.length === 0 && liveResources.papers.length === 0 ? (
          <div className="p-4 glass-panel rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Couldn't load live articles, books, or papers right now. Static curriculum resources are ready below.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ARTICLES GROUP */}
            {(activeTabRead === 'all' || activeTabRead === 'articles') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Articles & Tutorials ({liveResources.articles.length})</span>
                </div>
                {liveResources.articles.length === 0 ? (
                  <div className="p-3 glass-panel rounded-xl border border-white/5 text-slate-400 text-xs italic">
                    Couldn't load live articles right now. Static curriculum resources are ready below.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveResources.articles.map((art, idx) => (
                      <motion.a
                        key={`art-${idx}`}
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -3 }}
                        className="group glass-panel rounded-2xl p-4 border border-white/10 flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300 bg-[#0c0e17]/80 cursor-pointer"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-medium truncate max-w-[180px]">
                              <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                              {art.source || 'Web Resource'}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                          </div>
                          <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                            {art.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                            {art.snippet}
                          </p>
                        </div>
                        <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-cyan-400 font-semibold">
                          <span>Read Full Article</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </motion.a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BOOKS GROUP */}
            {(activeTabRead === 'all' || activeTabRead === 'books') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Library className="w-3.5 h-3.5 text-amber-400" />
                  <span>Books & Publications ({liveResources.books.length})</span>
                </div>
                {liveResources.books.length === 0 ? (
                  <div className="p-3 glass-panel rounded-xl border border-white/5 text-slate-400 text-xs italic">
                    Couldn't load live books right now. Static curriculum resources are ready below.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveResources.books.map((book, idx) => (
                      <motion.a
                        key={`book-${idx}`}
                        href={book.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -3 }}
                        className="group glass-panel rounded-2xl p-4 border border-white/10 flex gap-3.5 items-start hover:border-amber-500/40 transition-all duration-300 bg-[#0c0e17]/80 cursor-pointer"
                      >
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-16 h-22 object-cover rounded-lg border border-white/10 shrink-0 shadow-md group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-16 h-22 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-amber-400 shrink-0 p-2 text-center ${book.cover_url ? 'hidden' : ''
                            }`}
                        >
                          <BookOpen className="w-6 h-6 mb-1" />
                          <span className="text-[9px] font-bold line-clamp-2 text-amber-300">Open Library</span>
                        </div>

                        <div className="flex-1 flex flex-col justify-between self-stretch space-y-1.5 min-w-0">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                Book
                              </span>
                              {book.year && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  {book.year}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug mt-1.5">
                              {book.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 truncate mt-1">
                              by {book.author || 'Unknown Author'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-amber-400 font-semibold pt-2 border-t border-white/5">
                            <span>Open Library</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PAPERS GROUP */}
            {(activeTabRead === 'all' || activeTabRead === 'papers') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Research Papers (arXiv) ({liveResources.papers.length})</span>
                </div>
                {liveResources.papers.length === 0 ? (
                  <div className="p-3 glass-panel rounded-xl border border-white/5 text-slate-400 text-xs italic">
                    Couldn't load live research papers right now. Static curriculum resources are ready below.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveResources.papers.map((paper, idx) => {
                      const displayAuthors =
                        paper.authors && paper.authors.length > 0
                          ? paper.authors.slice(0, 2).join(', ') + (paper.authors.length > 2 ? ` +${paper.authors.length - 2} more` : '')
                          : 'arXiv Research';
                      const pubDate = paper.published ? paper.published.split('T')[0] : null;

                      return (
                        <motion.a
                          key={`paper-${idx}`}
                          href={paper.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ y: -3 }}
                          className="group glass-panel rounded-2xl p-4 border border-white/10 flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 bg-[#0c0e17]/80 cursor-pointer"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-medium">
                                <GraduationCap className="w-3 h-3 text-purple-400" />
                                arXiv Paper
                              </span>
                              {pubDate && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {pubDate}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                              {paper.title}
                            </h3>
                            <p className="text-[10px] text-purple-300/80 font-medium truncate">
                              Authors: {displayAuthors}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                              {paper.summary}
                            </p>
                          </div>
                          <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-purple-400 font-semibold">
                            <span>Read arXiv Paper</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </motion.a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => setSelectedType(t.value)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${selectedType === t.value
              ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Resource Grid / Empty State */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-3xl border border-white/10 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-500" />
          <h3 className="text-sm font-bold text-white">No Resources Found</h3>
          <p className="text-xs text-slate-400 max-w-md">
            No matching learning resources found for your current skill gap.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTriggerCuratorAgent}
            disabled={isLoading}
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-400" />}
          >
            {isLoading ? 'AI Curator is searching...' : 'Run Learning Curator Agent'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((res) => (
            <motion.div
              key={res.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col justify-between hover:border-purple-500/40 transition-all duration-300 group cursor-pointer"
              onClick={() => {
                if (res.link && res.link !== '#') {
                  window.open(res.link, '_blank');
                }
              }}
            >
              {/* Image Banner */}
              <div className="relative h-44 w-full overflow-hidden">
                <img
                  src={res.imageUrl}
                  alt={res.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12141d] via-transparent to-black/30" />

                <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-black/70 text-white backdrop-blur-md uppercase tracking-wider border border-white/10">
                  {res.type}
                </span>

                {/* Bookmark & Heart Buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleLikeResource(res.id)}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-colors ${res.isLiked ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                      }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${res.isLiked ? 'fill-rose-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => toggleBookmarkResource(res.id)}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-colors ${res.isBookmarked ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                      }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${res.isBookmarked ? 'fill-purple-300' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                        {res.matchScore ? `${res.matchScore}% Match` : '92% Match'}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span>{res.platform}</span>
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" /> {res.rating}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 flex items-center justify-between gap-1 mt-1">
                    <span>{res.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{res.author} • {res.duration}</p>

                  {res.whyRecommended && (
                    <p className="text-[11px] text-purple-300/90 italic bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 mt-2.5 line-clamp-2">
                      "{res.whyRecommended}"
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                      <span>Completion</span>
                      <span className="text-purple-400">{res.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full" style={{ width: `${res.progressPercentage}%` }} />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {res.tags.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 text-[9px] font-mono rounded-md bg-white/5 text-slate-400 border border-white/5">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideoModal && (
        <VideoPlayerModal
          videoId={activeVideoModal.videoId}
          title={activeVideoModal.title}
          onClose={() => setActiveVideoModal(null)}
        />
      )}
    </div>
  );
};
