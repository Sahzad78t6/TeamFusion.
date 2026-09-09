import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  IdentityTwin,
  LearningResource,
  Opportunity,
  TaskItem,
  ReflectionEntry,
  NotificationItem,
  AnalyticsSummary,
} from '../types';
import { emptyAnalytics, emptyIdentityTwin, emptyUser } from '../utils/emptyState';
import {
  AuthUserResponse,
  getMeApi,
  logoutApi,
  claimAuthTicketApi,
  submitOnboardingApi,
  getDashboardApi,
  getAnalyticsApi,
  toggleTaskApi,
  createReflectionApi,
  getReflectionsApi,
  markNotificationReadApi,
  getOpportunitiesApi,
  checkinApi,
  OnboardingPayload,
} from '../services/api';

export interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  setAuthSession: (accessToken: string, refreshToken: string, authUser: AuthUserResponse) => void;
  logout: () => Promise<void>;
  isExchangingTicket: boolean;
  identityTwin: IdentityTwin;
  setIdentityTwin: React.Dispatch<React.SetStateAction<IdentityTwin>>;
  learningResources: LearningResource[];
  curriculumPlan: string;
  phaseInfo: {
    current_phase: string;
    plan_label: string;
    phase_step: number;
    total_phases: number;
    display: string;
  };
  skippedTopics: { topic_code: string; label: string }[];
  setLearningResources: React.Dispatch<React.SetStateAction<LearningResource[]>>;
  opportunities: Opportunity[];
  setOpportunities: React.Dispatch<React.SetStateAction<Opportunity[]>>;
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  reflections: ReflectionEntry[];
  notifications: NotificationItem[];
  analytics: AnalyticsSummary;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toggleTask: (taskId: string) => void;
  toggleBookmarkResource: (resourceId: string) => void;
  toggleLikeResource: (resourceId: string) => void;
  toggleFavoriteOpportunity: (oppId: string) => void;
  markNotificationAsRead: (notifId: string) => void;
  addReflection: (entry: Omit<ReflectionEntry, 'id' | 'date'>) => void;
  submitOnboarding: (payload: OnboardingPayload) => Promise<any>;
  refreshDashboard: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(emptyUser);
  const [authToken, setAuthTokenState] = useState<string | null>(() => localStorage.getItem('growthos_access_token'));
  const [isExchangingTicket, setIsExchangingTicket] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('ticket'));
    }
    return false;
  });
  const [identityTwin, setIdentityTwin] = useState<IdentityTwin>(emptyIdentityTwin);
  const [learningResources, setLearningResources] = useState<LearningResource[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [curriculumPlan, setCurriculumPlan] = useState<string>('');
  const [phaseInfo, setPhaseInfo] = useState<{
    current_phase: string;
    plan_label: string;
    phase_step: number;
    total_phases: number;
    display: string;
  }>({
    current_phase: '',
    plan_label: '',
    phase_step: 1,
    total_phases: 4,
    display: '',
  });
  const [skippedTopics, setSkippedTopics] = useState<{ topic_code: string; label: string }[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const setAuthToken = (token: string | null) => {
    setAuthTokenState(token);
    if (token) {
      localStorage.setItem('growthos_access_token', token);
    } else {
      localStorage.removeItem('growthos_access_token');
      localStorage.removeItem('growthos_refresh_token');
    }
  };

  const setAuthSession = (accessToken: string, refreshToken: string, authUser: AuthUserResponse) => {
    setAuthTokenState(accessToken);
    localStorage.setItem('growthos_access_token', accessToken);
    localStorage.setItem('growthos_refresh_token', refreshToken);

    const instName = authUser.institution_name || authUser.college || '';
    setUser((prev) => ({
      ...prev,
      id: authUser.id,
      name: authUser.name || prev.name,
      email: authUser.email || prev.email,
      role: authUser.role || prev.role,
      institution_id: authUser.institution_id || prev.institution_id,
      institution_name: instName || prev.institution_name,
      title: instName || prev.title,
      location: instName || prev.location,
      year: authUser.year || prev.year,
      onboarding_completed: authUser.onboarding_completed ?? prev.onboarding_completed,
    }));
  };

  const logout = async () => {
    if (authToken) {
      try {
        await logoutApi(authToken);
      } catch (e) {
        // Suppress
      }
    }
    setAuthTokenState(null);
    localStorage.removeItem('growthos_access_token');
    localStorage.removeItem('growthos_refresh_token');
    setUser(emptyUser);
    setTasks([]);
    setLearningResources([]);
    setOpportunities([]);
    setSearchQuery('');
  };

  const refreshDashboard = async () => {
    if (!authToken) return;
    try {
      const data = await getDashboardApi(authToken);
      if (data.plan_label) setCurriculumPlan(data.plan_label);
      if (data.phase_info) setPhaseInfo(data.phase_info);
      if (data.skipped_topics) setSkippedTopics(data.skipped_topics);
      if (data.identity_twin) {
        setIdentityTwin((prev) => ({
          ...prev,
          dreamArchetype: data.identity_twin.target_role || data.identity_twin.goal || prev.dreamArchetype,
          alignmentPercentage: Math.round(data.identity_twin.identity_score || prev.alignmentPercentage),
          driftScore: Math.round(data.identity_twin.identity_drift_percentage || prev.driftScore),
        }));
      }
      if (data.analytics) {
        setAnalytics((prev) => ({
          ...prev,
          growthPredictionScore: Math.round(data.analytics.growth_score ?? prev.growthPredictionScore),
          learningHoursTotal: data.analytics.weekly_hours_logged ?? prev.learningHoursTotal,
          burnoutRiskPercentage: Math.round(data.analytics.burnout_risk_score ?? prev.burnoutRiskPercentage),
          consistencyRate: Math.min(98, Math.round(data.analytics.streak_days ? data.analytics.streak_days * 3.5 : prev.consistencyRate)),
          radarSkills: Array.isArray(data.analytics.radar_skills) && data.analytics.radar_skills.length > 0
            ? data.analytics.radar_skills.map((s: any) => ({
                subject: s.subject || s.skill || 'Skill',
                current: Number(s.current ?? s.score ?? 0),
                target: Number(s.target ?? 80),
                fullMark: Number(s.fullMark ?? s.full_mark ?? 100),
              }))
            : prev.radarSkills,
          weeklyHeatmap: Array.isArray(data.analytics.weekly_heatmap) && data.analytics.weekly_heatmap.length > 0
            ? data.analytics.weekly_heatmap.map((h: any) => ({
                day: h.day,
                hours: Number(h.hours ?? 0),
              }))
            : prev.weeklyHeatmap,
        }));
      }
      if (data.roadmap && data.roadmap.tasks) {
        setTasks(
          data.roadmap.tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            isCompleted: t.completed || false,
            estimatedMins: t.duration_mins || 30,
            category: t.category || 'Roadmap',
            priority: t.priority || 'medium',
            time: '09:00 AM',
            duration: `${t.duration_mins || 30} mins`,
            date: 'Today',
            type: 'learning',
          }))
        );
      }
      if (data.recommendations && data.recommendations.length > 0) {
        setLearningResources(
          data.recommendations.map((r: any) => ({
            id: r.id,
            title: r.title,
            type: r.type || 'course',
            author: r.provider || 'GrowthOS',
            platform: r.provider || 'GrowthOS',
            duration: '2 Hours',
            difficulty: 'Intermediate',
            category: 'AI Architecture',
            rating: 4.9,
            imageUrl: r.thumbnail || r.image_url || '',
            link: r.url || '#',
            tags: r.tags || ['AI'],
            isBookmarked: false,
            isLiked: false,
            progressPercentage: 0,
          }))
        );
      }
      if (data.notifications && data.notifications.length > 0) {
        setNotifications(
          data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            timeAgo: 'Just now',
            isRead: n.read || false,
            type: n.type || 'milestone',
          }))
        );
      }

      // Fetch analytics API
      try {
        const analyticsData = await getAnalyticsApi(authToken);
        if (analyticsData) {
          setAnalytics((prev) => ({
            ...prev,
            growthPredictionScore: Math.round(analyticsData.growth_score ?? prev.growthPredictionScore),
            burnoutRiskPercentage: Math.round(analyticsData.burnout_risk_score ?? prev.burnoutRiskPercentage),
            learningHoursTotal: analyticsData.weekly_hours_logged ?? prev.learningHoursTotal,
            radarSkills: Array.isArray(analyticsData.radar_skills) && analyticsData.radar_skills.length > 0
              ? analyticsData.radar_skills.map((s: any) => ({
                  subject: s.subject || s.skill || 'Skill',
                  current: Number(s.current ?? s.score ?? 0),
                  target: Number(s.target ?? 80),
                  fullMark: Number(s.fullMark ?? s.full_mark ?? 100),
                }))
              : prev.radarSkills,
            weeklyHeatmap: Array.isArray(analyticsData.weekly_heatmap) && analyticsData.weekly_heatmap.length > 0
              ? analyticsData.weekly_heatmap.map((h: any) => ({
                  day: h.day,
                  hours: Number(h.hours ?? 0),
                }))
              : prev.weeklyHeatmap,
          }));
        }
      } catch (err) {
        // Suppress
      }

      // Fetch opportunities API
      try {
        const oppData = await getOpportunitiesApi(authToken);
        const oppList = oppData?.opportunities || (Array.isArray(oppData) ? oppData : []);
        if (oppList.length > 0) {
          setOpportunities(
            oppList.map((o: any) => ({
              id: o.id || `opp-${Math.random()}`,
              title: o.title,
              type: o.type || 'hackathon',
              organization: o.organization || 'Global Tech',
              location: o.location || 'Remote',
              matchPercentage: Math.round(o.match_score || 88),
              skillsRequired: o.required_skills || ['Python', 'AI'],
              deadline: 'In 2 Weeks',
              description: o.description || '',
              link: o.url || '#',
              isFavorite: false,
            }))
          );
        }
      } catch (err) {
        // Suppress
      }

      // Fetch reflections API
      try {
        const refList = await getReflectionsApi(authToken);
        if (Array.isArray(refList) && refList.length > 0) {
          setReflections(
            refList.map((r: any) => ({
              id: r.id,
              date: r.created_at ? r.created_at.slice(0, 10) : 'Today',
              mood: r.mood_score <= 2 ? 'stressed' : r.mood_score >= 4 ? 'ecstatic' : 'thoughtful',
              emoji: r.mood_score <= 2 ? '💡' : r.mood_score >= 4 ? '🚀' : '🧠',
              prompt: 'Daily Reflection Entry',
              content: r.reflection || r.notes || r.ai_insight || '',
              sentimentScore: r.mood_score ? r.mood_score * 20 : 85,
              keyInsights: r.ai_insight ? [r.ai_insight] : ['Logged to Mem0'],
            }))
          );
        }
      } catch (err) {
        // Suppress
      }

    } catch (e) {
      console.warn('Dashboard refresh failed:', e);
    }
  };

  const submitOnboarding = async (payload: OnboardingPayload) => {
    setIdentityTwin((prev) => ({
      ...prev,
      dreamArchetype: payload.target_role || payload.goal,
    }));
    setUser((prev) => ({
      ...prev,
      dreamRole: payload.target_role || payload.goal,
    }));

    if (authToken) {
      const res = await submitOnboardingApi(authToken, payload);
      if (res) {
        const instName = res.institution_name || res.college || '';
        setUser((prev) => ({
          ...prev,
          institution_id: res.institution_id || prev.institution_id,
          institution_name: instName || prev.institution_name,
          title: instName || prev.title,
          location: instName || prev.location,
          year: res.year || prev.year,
          onboarding_completed: true,
        }));
      }
      await refreshDashboard();
      return res;
    }
  };

  useEffect(() => {
    // Check if returning from Google OAuth redirect with a single-use ticket
    const searchParams = new URLSearchParams(window.location.search);
    const ticket = searchParams.get('ticket');

    if (ticket) {
      setIsExchangingTicket(true);
      claimAuthTicketApi(ticket)
        .then((res) => {
          setAuthSession(res.access_token, res.refresh_token, res.user);
          // Strip ?ticket=... immediately so user never sees ticket in address bar
          const currentPath = window.location.pathname;
          window.history.replaceState({}, document.title, currentPath);

          // If the user arrived at /login or root, navigate them to dashboard or onboarding
          if (currentPath === '/login' || currentPath === '/') {
            const dest = res.user?.onboarding_completed === false ? '/onboarding' : '/dashboard';
            window.location.href = dest;
          }
        })
        .catch((err) => {
          console.error('GrowthOS ticket exchange failed:', err);
          const errorMsg = encodeURIComponent(err.message || 'Authentication ticket exchange failed');
          window.location.href = `/login?auth_error=${errorMsg}`;
        })
        .finally(() => {
          setIsExchangingTicket(false);
        });
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      getMeApi(authToken)
        .then((me) => {
          const instName = me.institution_name || me.college || '';
          setUser((prev) => ({
            ...prev,
            id: me.id,
            name: me.name || prev.name,
            email: me.email || prev.email,
            role: me.role || prev.role,
            institution_id: me.institution_id || prev.institution_id,
            institution_name: instName || prev.institution_name,
            title: instName || prev.title,
            location: instName || prev.location,
            year: me.year || prev.year,
            onboarding_completed: me.onboarding_completed ?? prev.onboarding_completed,
            streak: me.current_streak ?? me.streak ?? prev.streak ?? 0,
            current_streak: me.current_streak ?? me.streak ?? prev.current_streak ?? 0,
            longest_streak: me.longest_streak ?? prev.longest_streak ?? 0,
          }));

          // Trigger daily check-in once per session load
          checkinApi(authToken)
            .then((chk) => {
              setUser((prev) => ({
                ...prev,
                streak: chk.current_streak,
                current_streak: chk.current_streak,
                longest_streak: chk.longest_streak,
              }));
            })
            .catch(() => {});

          // Role-based post-login redirect
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath === '/login' || currentPath === '/signup' || currentPath === '/';
          if (isAuthPage) {
            if (me.role === 'INSTITUTION_ADMIN' || me.role === 'PLATFORM_ADMIN') {
              window.location.href = '/institution/overview';
              return;
            } else if (!me.onboarding_completed) {
              window.location.href = '/onboarding';
              return;
            } else {
              window.location.href = '/dashboard';
              return;
            }
          }

          refreshDashboard();
        })
        .catch(() => {
          // Do not retain an expired or malformed session token.
          setAuthToken(null);
        });
    }
  }, [authToken]);


  const toggleTask = (taskId: string) => {
    let nextCompleted = false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          nextCompleted = !t.isCompleted;
          return { ...t, isCompleted: nextCompleted };
        }
        return t;
      })
    );

    if (authToken) {
      toggleTaskApi(authToken, taskId, nextCompleted).catch((err) => {
        console.warn('Failed to persist task completion:', err);
      });
    }
  };

  const toggleBookmarkResource = (resourceId: string) => {
    setLearningResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, isBookmarked: !r.isBookmarked } : r))
    );
  };

  const toggleLikeResource = (resourceId: string) => {
    setLearningResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, isLiked: !r.isLiked } : r))
    );
  };

  const toggleFavoriteOpportunity = (oppId: string) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, isFavorite: !o.isFavorite } : o))
    );
  };

  const markNotificationAsRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    if (authToken) {
      markNotificationReadApi(authToken, notifId).catch((err) => {
        console.warn('Failed to mark notification as read:', err);
      });
    }
  };

  const addReflection = async (newRef: Omit<ReflectionEntry, 'id' | 'date'>) => {
    const entry: ReflectionEntry = {
      ...newRef,
      id: `ref-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
    };
    setReflections((prev) => [entry, ...prev]);

    if (authToken) {
      try {
        await createReflectionApi(authToken, {
          reflection: newRef.content,
          mood_score: newRef.mood === 'ecstatic' || newRef.mood === 'happy' ? 5 : newRef.mood === 'stressed' ? 1 : 3,
          energy_level: 4,
          wins: newRef.prompt || '',
          challenges: '',
          completed_tasks: [],
          study_hours: 1.5,
        });
        await refreshDashboard();
      } catch (err) {
        console.warn('Failed to persist reflection entry:', err);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        authToken,
        setAuthToken,
        setAuthSession,
        logout,
        isExchangingTicket,
        identityTwin,
        setIdentityTwin,
        learningResources,
        curriculumPlan,
        phaseInfo,
        skippedTopics,
        setLearningResources,
        opportunities,
        setOpportunities,
        tasks,
        setTasks,
        reflections,
        notifications,
        analytics,
        isCopilotOpen,
        setIsCopilotOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        toggleTask,
        toggleBookmarkResource,
        toggleLikeResource,
        toggleFavoriteOpportunity,
        markNotificationAsRead,
        addReflection,
        submitOnboarding,
        refreshDashboard,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
