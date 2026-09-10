export type ContentType = 'course' | 'book' | 'video' | 'podcast' | 'project' | 'article' | 'paper';

export type OpportunityType = 'hackathon' | 'internship' | 'community' | 'mentor' | 'conference' | 'competition' | 'opensource';

export type PriorityLevel = 'high' | 'medium' | 'low';

export type MoodType = 'ecstatic' | 'happy' | 'neutral' | 'thoughtful' | 'stressed';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  title: string;
  bio: string;
  dreamRole: string;
  level: number;
  experienceLevel: string;
  location: string;
  streak: number;
  current_streak?: number;
  longest_streak?: number;
  growthScore: number;
  identityScore: number;
  joinedDate: string;
  achievements: Achievement[];
  certificates: Certificate[];
  role?: 'STUDENT' | 'INSTITUTION_ADMIN' | 'PLATFORM_ADMIN';
  institution_id?: string;
  institution_name?: string;
  year?: string;
  onboarding_completed?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  category: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
  credentialUrl: string;
  skills: string[];
}

export interface SkillRating {
  skill: string;
  currentLevel: number; // 0 to 100
  targetLevel: number; // 0 to 100
  category: string;
}

export interface IdentityTwin {
  currentArchetype: string;
  dreamArchetype: string;
  alignmentPercentage: number;
  driftScore: number; // 0 to 100
  coreValues: string[];
  dreamValues: string[];
  skills: SkillRating[];
  insights: {
    id: string;
    type: 'positive' | 'warning' | 'suggestion';
    title: string;
    description: string;
  }[];
  timeline: {
    date: string;
    milestone: string;
    alignment: number;
  }[];
  dimensionMastery?: { dimension: string; mastery_pct: number; completed?: number; total?: number }[];
  activeFocus?: { dimension: string; label: string; target_mastery: number };
  keySkillStrengths?: string[];
  requiredTargetMastery?: string[];
}

export interface LearningResource {
  id: string;
  title: string;
  type: ContentType;
  author: string;
  platform: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  rating: number;
  tags: string[];
  imageUrl: string;
  link: string;
  isBookmarked: boolean;
  isLiked: boolean;
  progressPercentage: number;
  matchScore?: number;
  whyRecommended?: string;
}


export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: OpportunityType;
  matchScore: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  deadline: string;
  location: string;
  skillsRequired: string[];
  reward: string;
  isFavorite: boolean;
  description: string;
  applyUrl: string;
}

export interface TaskItem {
  id: string;
  title: string;
  category: string;
  priority: PriorityLevel;
  time: string;
  duration: string;
  isCompleted: boolean;
  date: string;
  type: 'learning' | 'habit' | 'opportunity' | 'reflection';
}

export interface ReflectionEntry {
  id: string;
  date: string;
  mood: MoodType;
  emoji: string;
  prompt: string;
  content: string;
  sentimentScore: number; // 0 to 100
  keyInsights: string[];
  audioNoteDuration?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'opportunity' | 'milestone' | 'reflection' | 'ai_insight';
  timeAgo: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface AnalyticsSummary {
  growthPredictionScore: number;
  burnoutRiskPercentage: number;
  consistencyRate: number;
  learningHoursTotal: number;
  weeklyHeatmap: { day: string; hours: number }[];
  monthlyProgress: { month: string; score: number; burnout: number }[];
  radarSkills: { subject: string; current: number; target: number; fullMark: number }[];
}

export interface VideoResult {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration_formatted: string;
  url: string;
}

export interface ArticleResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface BookResult {
  title: string;
  author: string;
  cover_url: string | null;
  link: string;
  year?: number | null;
}

export interface PaperResult {
  title: string;
  authors: string[];
  summary: string;
  link: string;
  published: string;
}

export interface LiveResourcesResponse {
  articles: ArticleResult[];
  books: BookResult[];
  papers: PaperResult[];
}

export interface LiveOpportunity {
  title: string;
  org_or_repo: string;
  url: string;
  tags: string[];
  category: 'hackathons' | 'internships_roles' | 'communities' | 'mentorship' | 'conferences';
}

export interface LiveOpportunityResponse {
  opportunities: LiveOpportunity[];
}

