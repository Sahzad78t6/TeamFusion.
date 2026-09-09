const IS_PROD = (import.meta as any).env?.PROD;
const VITE_API_URL = (import.meta as any).env?.VITE_API_URL;
const IS_DEV = typeof window !== 'undefined' && (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'));

// Clean and resolve base API URL. If not provided via environment, default based on runtime environment.
export const API_BASE_URL = VITE_API_URL
  ? VITE_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '')
  : IS_DEV
  ? 'http://localhost:8000'
  : 'https://teamfusion-1.onrender.com';

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  role?: 'STUDENT' | 'INSTITUTION_ADMIN' | 'PLATFORM_ADMIN';
  institution_id?: string | null;
  cohort_id?: string | null;
  onboarding_completed?: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUserResponse;
}

export interface OnboardingPayload {
  goal: string;
  target_role: string;
  current_role?: string;
  skills: string[];
  interests: string[];
  experience?: string;
  learning_style?: string;
  career_stage?: string;
  available_time?: string;
  preferred_content?: string[];
  language?: string;
  known_topics?: string[];
}

export class ApiError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function safeFetch(url: string, options: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes('fetch')) {
      throw new ApiError(
        `Unable to connect to GrowthOS backend server at ${url}. Please verify backend server is running and online.`,
        'NETWORK_ERROR'
      );
    }
    throw err;
  }

  return response;
}

/**
 * Safely parses an HTTP response.
 * Inspects content-type, status, and raw text body before JSON parsing to avoid
 * "Unexpected end of JSON input" errors on 204 No Content, empty bodies, or HTML error pages.
 * Classifies HTTP statuses into distinct error types (AUTH_ERROR, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, SERVER_ERROR, SERVICE_UNAVAILABLE).
 */
async function safeParseResponse<T = any>(response: Response, defaultErrorMessage = 'Request failed'): Promise<T> {
  const text = await response.text();
  const trimmed = text ? text.trim() : '';

  let code = 'UNKNOWN_ERROR';
  let defaultStatusMessage = defaultErrorMessage;

  if (response.status === 401) {
    code = 'AUTH_ERROR';
    defaultStatusMessage = 'Your session has expired. Please sign in again.';
  } else if (response.status === 403) {
    code = 'FORBIDDEN';
    defaultStatusMessage = 'You are not authorized to perform this action.';
  } else if (response.status === 404) {
    code = 'NOT_FOUND';
    defaultStatusMessage = 'Learning Curator endpoint was not found.';
  } else if (response.status === 422) {
    code = 'VALIDATION_ERROR';
    defaultStatusMessage = 'Invalid Learning Curator request.';
  } else if (response.status === 500) {
    code = 'SERVER_ERROR';
    defaultStatusMessage = 'Learning Curator encountered a server error.';
  } else if (response.status === 503) {
    code = 'SERVICE_UNAVAILABLE';
    defaultStatusMessage = 'Learning services are temporarily unavailable.';
  }

  if (!trimmed) {
    if (!response.ok) {
      throw new ApiError(`${defaultStatusMessage} (HTTP ${response.status})`, code, response.status);
    }
    return {} as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[');

  if (isJson) {
    try {
      const data = JSON.parse(trimmed);
      if (!response.ok) {
        let msg = '';
        if (data?.error) {
          msg = data.detail ? `${data.error}: ${data.detail}` : data.error;
        } else if (data?.detail) {
          msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else {
          msg = `${defaultStatusMessage} (HTTP ${response.status})`;
        }
        throw new ApiError(msg, data?.error || code, response.status);
      }
      return data as T;
    } catch (parseErr: any) {
      if (parseErr instanceof ApiError) throw parseErr;
      if (!response.ok) {
        throw new ApiError(trimmed || `${defaultStatusMessage} (HTTP ${response.status})`, code, response.status);
      }
      throw new ApiError(`Failed to parse response: ${parseErr.message}`, 'PARSE_ERROR', response.status);
    }
  }

  if (!response.ok) {
    throw new ApiError(trimmed || `${defaultStatusMessage} (HTTP ${response.status})`, code, response.status);
  }

  return trimmed as unknown as T;
}

export async function signupApi(name: string, email: string, password: string): Promise<AuthTokenResponse> {
  const response = await safeFetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  return await safeParseResponse<AuthTokenResponse>(response, 'Signup failed. Please try again.');
}

export async function loginApi(email: string, password: string): Promise<AuthTokenResponse> {
  const response = await safeFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return await safeParseResponse<AuthTokenResponse>(response, 'Login failed. Invalid email or password.');
}

export async function loginWithGoogleApi(payload: { credential?: string; code?: string; redirect_uri?: string }): Promise<AuthTokenResponse> {
  const response = await safeFetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return await safeParseResponse<AuthTokenResponse>(response, 'Google sign-in failed.');
}

export async function claimAuthTicketApi(ticket: string): Promise<AuthTokenResponse> {
  const response = await safeFetch(`${API_BASE_URL}/auth/claim-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticket }),
  });

  return await safeParseResponse<AuthTokenResponse>(response, 'Authentication ticket exchange failed.');
}

export async function getMeApi(token: string): Promise<AuthUserResponse> {
  const response = await safeFetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse<AuthUserResponse>(response, 'Failed to fetch current user.');
}

export async function logoutApi(token: string): Promise<void> {
  await safeFetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Onboarding & Identity APIs
export async function submitOnboardingApi(token: string, payload: OnboardingPayload): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/onboarding`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return await safeParseResponse(response, 'Failed to save onboarding data.');
}

export async function getIdentityApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/onboarding/identity`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch user identity.');
}

// Dashboard Summary API
export async function getDashboardApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/dashboard`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch dashboard summary.');
}

// Planner APIs
export async function createPlanApi(token: string, goals: string[]): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/planner`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), goals }),
  });

  return await safeParseResponse(response, 'Failed to create learning plan.');
}

// Reflection APIs
export async function createReflectionApi(token: string, reflectionData: any): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/reflection`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reflectionData),
  });

  return await safeParseResponse(response, 'Failed to submit reflection.');
}

// Recommendations API
export async function getRecommendationsApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/recommendation`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch recommendations.');
}

export async function refreshRecommendationsApi(token: string, topic?: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/recommendation/refresh`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(topic ? { topic } : {}),
  });

  return await safeParseResponse(response, 'Failed to trigger Learning Curator Agent.');
}

// Agent Observability APIs
export async function getLatestAgentRunApi(token: string, agentName = 'learning_curator'): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/agents/runs/latest/${agentName}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch agent execution status.');
}

export async function getAgentRunByIdApi(token: string, runId: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/agents/runs/${runId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch agent execution run.');
}

// Opportunities API
export async function getOpportunitiesApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/opportunity`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch opportunities.');
}

// Notifications API
export async function getNotificationsApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/notification`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch notifications.');
}

export async function markNotificationReadApi(token: string, notificationId: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/notification/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to mark notification as read.');
}

export async function markAllNotificationsReadApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/notification/read-all`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to mark all notifications as read.');
}

// Analytics API
export async function getAnalyticsApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/analytics`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const res = await safeParseResponse(response, 'Failed to fetch analytics.');
  return res?.data || res;
}

// Task Toggle API
export async function toggleTaskApi(token: string, taskId: string, completed: boolean): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/planner/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ completed }),
  });

  return await safeParseResponse(response, 'Failed to update task completion state.');
}

export async function getPlansApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/planner`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch planner entries.');
}

export async function getReflectionsApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/reflection`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return await safeParseResponse(response, 'Failed to fetch reflections.');
}

export interface CopilotResponse {
  agent: string;
  message: string;
  data?: unknown;
}

export async function chatWithCopilotApi(token: string, message: string): Promise<CopilotResponse> {
  const response = await safeFetch(`${API_BASE_URL}/copilot/chat`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  return await safeParseResponse<CopilotResponse>(response, 'The AI Copilot could not complete that request.');
}

async function institutionRequest(token: string, path: string, method = 'GET', body?: unknown): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/institutions${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return await safeParseResponse(response, 'Institution request failed.');
}

export const getInstitutionAnalyticsApi = (token: string) => institutionRequest(token, '/analytics');
export const getCohortsApi = (token: string) => institutionRequest(token, '/cohorts');
export const createCohortApi = (token: string, payload: { name: string; year: string; branch: string; section?: string }) => institutionRequest(token, '/cohorts', 'POST', payload);
export const createAssessmentApi = (token: string, payload: unknown) => institutionRequest(token, '/assessments', 'POST', payload);
export const getAssessmentsApi = (token: string) => institutionRequest(token, '/assessments');
export const submitAssessmentApi = (token: string, assessmentId: string, answers: Record<string, number>) => institutionRequest(token, `/assessments/${assessmentId}/submissions`, 'POST', { answers });
export const joinCohortApi = (token: string, payload: { cohort_id?: string; code?: string }) => institutionRequest(token, '/cohorts/join', 'POST', payload);

// Knowledge Base Admin APIs
export async function getKnowledgeBaseStatusApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/knowledge-base/status`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return await safeParseResponse(response, 'Failed to fetch Knowledge Base status.');
}

export async function syncKnowledgeBaseApi(token: string, forceReindex = false): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/knowledge-base/sync?force_reindex=${forceReindex}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return await safeParseResponse(response, 'Knowledge Base sync failed.');
}

export async function rebuildKBIndexApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/knowledge-base/rebuild-index`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return await safeParseResponse(response, 'Failed to rebuild search index.');
}

export async function getFailedFilesApi(token: string): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/knowledge-base/failed-files`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return await safeParseResponse(response, 'Failed to fetch failed document list.');
}

// Coding Contest APIs
export interface CodingContestQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter_code: string;
  test_cases?: { input: string }[];
}

export interface ActiveContestResponse {
  id: string;
  cohort_id: string;
  start_time: string;
  end_time: string;
  question_ids: string[];
  questions: CodingContestQuestion[];
}

export interface ContestSubmitResponse {
  passed: boolean | null;
  results: { test_case_index: number; passed: boolean }[];
}

export async function getActiveContestApi(token: string): Promise<ActiveContestResponse | null> {
  const response = await safeFetch(`${API_BASE_URL}/contests/active`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return await safeParseResponse<ActiveContestResponse | null>(response, 'Failed to retrieve active contest.');
}

export async function submitContestCodeApi(
  token: string,
  contestId: string,
  payload: { question_id: string; code: string }
): Promise<ContestSubmitResponse> {
  const response = await safeFetch(`${API_BASE_URL}/contests/${contestId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await safeParseResponse<ContestSubmitResponse>(response, 'Failed to submit code.');
}

export interface CurriculumTopicItem {
  topic_code: string;
  label: string;
  dimension?: string;
  priority?: string;
  phase?: string;
}

export async function getCurriculumTopicsApi(goal: string, year: string): Promise<CurriculumTopicItem[]> {
  const response = await safeFetch(`${API_BASE_URL}/curriculum/topics?goal=${encodeURIComponent(goal)}&year=${encodeURIComponent(year)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return await safeParseResponse<CurriculumTopicItem[]>(response, 'Failed to fetch curriculum topics.');
}export async function createContestApi(
  token: string,
  payload: { cohort_id: string; question_count: number; start_time: string; end_time: string }
): Promise<any> {
  const response = await safeFetch(`${API_BASE_URL}/institutions/contests`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await safeParseResponse(response, 'Failed to create contest session.');
}

