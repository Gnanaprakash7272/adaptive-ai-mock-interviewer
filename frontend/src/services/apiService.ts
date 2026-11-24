import type {
  User,
  Resume,
  Role,
  RecommendedRole,
  HistoryItem,
  Question,
  CandidateProfile,
  PerQuestionFeedback,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  StartInterviewRequest,
  StartInterviewResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  BackendFinalReport,
  LeaderboardEntry,
  AdminStats,
  AdminUserItem,
} from '../types';
import type {
  PivotPlan,
  IntakeRequest,
  PlanAdjustment,
  JobApplication,
  ApplicationTrends,
} from '../types/coach';


const TOKEN_KEY = 'ai_mockora_access_token';
const API_BASE_URL_KEY = 'ai_mockora_api_url';
export const AUTH_INVALIDATED_EVENT = 'ai_mockora_auth_invalidated';

export const getApiBaseUrl = (): string => {
  // Production (Vercel): frontend and backend share the same origin.
  // Use relative URLs so no CORS or URL config is needed.
  if (import.meta.env.PROD) return '';

  // Development: allow a localStorage override (useful for switching between
  // local and remote backend without rebuilding).
  const stored = localStorage.getItem(API_BASE_URL_KEY);
  if (stored) return stored;

  // Require VITE_API_BASE_URL to be explicitly set in .env.local.
  // Fail loudly rather than silently hitting localhost, which breaks CI/staging.
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    throw new Error(
      '[Mockora] VITE_API_BASE_URL is not set.\n' +
      'Copy frontend/.env.example to frontend/.env.local and fill in the backend URL.'
    );
  }
  return envUrl;
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  cacheManager.clearAll();
};

/**
 * Lightweight in-memory + sessionStorage cache manager with TTL.
 * Provides resilient caching so UI never blinks or shows blank screens on temporary network drops.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const cacheManager = {
  get<T>(key: string): T | null {
    const now = Date.now();
    // 1. Memory check
    const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (mem && now - mem.timestamp < mem.ttlMs) {
      return mem.data;
    }
    // 2. Storage fallback
    try {
      const raw = sessionStorage.getItem(`mockora_cache_${key}`);
      if (raw) {
        const item: CacheEntry<T> = JSON.parse(raw);
        if (now - item.timestamp < item.ttlMs) {
          memoryCache.set(key, item as CacheEntry<unknown>);
          return item.data;
        }
      }
    } catch {
      // storage unavailable
    }
    return null;
  },

  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttlMs };
    memoryCache.set(key, entry as CacheEntry<unknown>);
    try {
      sessionStorage.setItem(`mockora_cache_${key}`, JSON.stringify(entry));
    } catch {
      // ignore quota limits
    }
  },

  invalidate(key: string): void {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`mockora_cache_${key}`);
    } catch {
      // ignore
    }
  },

  clearAll(): void {
    memoryCache.clear();
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('mockora_cache_')) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {
      // ignore
    }
  },
};

/**
 * Fetch wrapper that adds Authorization, timeout enforcement, diagnostic network errors,
 * and robust try-catch exception handling.
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 25-second request timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: options.credentials || 'include',
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (netErr: any) {
    clearTimeout(timeoutId);
    if (netErr.name === 'AbortError') {
      const err: any = new Error('Server request timed out after 25s. The backend may be busy or offline.');
      err.status = 504;
      err.code = 'TIMEOUT';
      throw err;
    }
    // Clean diagnostic network error instead of cryptic TypeError: Failed to fetch
    const backendUrl = getApiBaseUrl() || 'http://localhost:8000';
    const err: any = new Error(
      `Cannot connect to backend server. Please verify the backend is running at ${backendUrl}.`
    );
    err.status = 0;
    err.code = 'NETWORK_ERROR';
    err.cause = netErr;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    clearAccessToken();
    window.dispatchEvent(new Event(AUTH_INVALIDATED_EVENT));
  }
  
  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorDetail = errorData.error.message;
      } else if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorDetail = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorDetail = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        } else {
          errorDetail = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        errorDetail = errorData.message;
      }
    } catch {
      // Ignored
    }
    const err: any = new Error(errorDetail || `Request failed with status ${response.status}`);
    err.status = response.status;
    throw err;
  }
  
  return response;
}

export interface AnswerSubmissionResult extends PerQuestionFeedback {
  success: boolean;
  is_finished: boolean;
  next_action: 'next_question' | 'complete' | 'follow_up';
  next_question?: Question;
}

export const apiService = {
  getBaseUrl(): string {
    return getApiBaseUrl();
  },

  /**
   * Signup
   */
  async signup(data: SignupRequest): Promise<SignupResponse> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Login
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = (await response.json()) as LoginResponse;
    setAccessToken(result.access_token);
    return result;
  },

  /**
   * Logout - clears httpOnly cookie on server and local access token
   */
  async logout(): Promise<void> {
    const baseUrl = getApiBaseUrl();
    try {
      await fetchWithAuth(`${baseUrl}/auth/logout`, {
        method: 'POST',
      });
    } catch {
      // ignore
    } finally {
      clearAccessToken();
    }
  },

  /**
   * Get current authenticated user details from cookie / token session
   */
  async getMe(): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/auth/me`);
    return response.json();
  },

  async forgotPassword(email: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      let errorDetail = 'Could not send verification code';
      try {
        const errorData = await response.json();
        if (errorData.detail) errorDetail = errorData.detail;
      } catch {}
      throw new Error(errorDetail);
    }
    return response.json();
  },

  async verifyOTP(email: string, otp: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/verify-reset-otp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });
    if (!response.ok) {
      let errorDetail = 'Invalid or expired OTP';
      try {
        const errorData = await response.json();
        if (errorData.detail) errorDetail = errorData.detail;
      } catch {}
      throw new Error(errorDetail);
    }
    return response.json();
  },

  async resetPassword(email: string, reset_token: string, new_password: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, reset_token, new_password }),
    });
    if (!response.ok) {
      let errorDetail = 'Could not reset password';
      try {
        const errorData = await response.json();
        if (errorData.detail) errorDetail = errorData.detail;
      } catch {}
      throw new Error(errorDetail);
    }
    return response.json();
  },

  /**
   * @deprecated Frontend reads user from JWT in AuthContext.
   */
  async getUser(): Promise<User | null> {
    return null;
  },

  /**
   * @deprecated Not implemented.
   */
  async updateUser(_updatedFields: Partial<User>): Promise<null> {
    return null;
  },

  /**
   * Step 3: POST /resume/analyze
   * Upload PDF to backend extraction & Gemini pipeline
   */
  async analyzeResume(file: File): Promise<CandidateProfile> {
    const baseUrl = getApiBaseUrl();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetchWithAuth(`${baseUrl}/resume/analyze`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    const profile = data.candidate_profile as CandidateProfile;
    
    // Use the backend-assigned resume_id as the canonical identifier.
    // Set frontend-only display fields.
    profile.resume_id = data.resume_id ?? profile.resume_id;
    profile.id = profile.resume_id ? `resume_${profile.resume_id}` : `cand_${Date.now()}`;
    profile.avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';
    profile.targetRole = profile.candidate?.name ? `${profile.candidate.name}'s Target Role` : 'Target Role';
    
    return profile;
  },

  /**
   * Legacy upload — not used in production path; resume is analyzed via analyzeResume().
   * @deprecated Use analyzeResume() instead.
   */
  async uploadResume(file: File): Promise<Partial<Resume>> {
    return {
      filename: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    };
  },

  /**
   * Fetch Candidate Profile (from Supabase / FastAPI)
   * Uses instant stale-while-revalidate caching so pages render immediately.
   */
  async getCandidateProfile(forceRefresh = false): Promise<CandidateProfile> {
    const cached = cacheManager.get<CandidateProfile>('candidate_profile');
    if (cached && !forceRefresh) {
      // Trigger background revalidation quietly
      this.refreshCandidateProfile().catch(() => {});
      return cached;
    }
    return this.refreshCandidateProfile();
  },

  async refreshCandidateProfile(): Promise<CandidateProfile> {
    const cached = cacheManager.get<CandidateProfile>('candidate_profile');
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetchWithAuth(`${baseUrl}/candidate/profile`);
      const data = (await response.json()) as CandidateProfile;
      cacheManager.set('candidate_profile', data, 10 * 60 * 1000);
      return data;
    } catch (err: any) {
      if (cached && (err.status === 0 || err.code === 'NETWORK_ERROR' || err.status >= 500)) {
        return cached;
      }
      throw err;
    }
  },

  /**
   * Update Candidate Profile
   */
  async updateCandidateProfile(profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/candidate/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
    });
    if (response.ok) {
        const updated = (await response.json()) as CandidateProfile;
        cacheManager.set('candidate_profile', updated, 5 * 60 * 1000);
        return updated;
    }
    throw new Error('Failed to update candidate profile');
  },

  /**
   * Fetch list of technical engineering roles with optional search & filters
   * Calls GET /roles on the backend (the role catalogue is the source of truth).
   */
  async getRoles(searchQuery?: string, difficultyFilter?: string, signal?: AbortSignal): Promise<Role[]> {
    const cacheKey = `roles_${searchQuery || 'all'}_${difficultyFilter || 'all'}`;
    const cached = cacheManager.get<Role[]>(cacheKey);
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (difficultyFilter && difficultyFilter !== 'All') params.set('difficulty', difficultyFilter);
    const url = `${baseUrl}/roles${params.toString() ? '?' + params.toString() : ''}`;
    try {
      const response = await fetchWithAuth(url, { signal });
      const data = (await response.json()) as Role[];
      cacheManager.set(cacheKey, data, 10 * 60 * 1000);
      return data;
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      if (cached) return cached;
    }
    return cached || [];
  },

  /**
   * Fetch AI-personalised role recommendations for the authenticated user.
   * Calls GET /roles/recommend which uses a deterministic skill-alignment score.
   */
  async getRecommendedRoles(): Promise<RecommendedRole[]> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetchWithAuth(`${baseUrl}/roles/recommend`);
      const data = await response.json();
      // Map flat backend response to RecommendedRole shape
      return data.map((item: any) => ({
        role: {
          id: item.id,
          title: item.title,
          category: item.category,
          department: item.department,
          difficulty: item.difficulty,
          matchScore: item.matchScore,
          description: item.description,
          requiredSkills: item.requiredSkills || [],
          preferredSkills: item.preferredSkills || [],
          relatedSkills: item.relatedSkills || [],
          estimatedTimeMinutes: item.estimatedTimeMinutes,
          questionCount: item.questionCount,
          iconName: item.iconName,
          featured: item.featured,
        },
        reason: item.reason,
        matchedSkills: item.matchedSkills || [],
        skillGaps: item.skillGaps || [],
        matchScore: item.matchScore,
        requiredSkillMatch: item.requiredSkillMatch,
        preferredSkillMatch: item.preferredSkillMatch,
        projectEvidence: item.projectEvidence || [],
        experienceEvidence: item.experienceEvidence || [],
      }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch specific role by ID — searches backend catalogue
   */
  async getRoleById(roleId: string): Promise<Role | undefined> {
    const roles = await this.getRoles();
    return roles.find((r) => r.id === roleId) || roles[0];
  },

  /**
   * @deprecated Backend generates questions dynamically during the interview.
   */
  async getQuestionsForRole(_roleId: string, _count: number = 5): Promise<Question[]> {
    return [];
  },

  /**
   * Step 5.4: POST /interview/start
   * Start a real interview session with LangGraph backend
   */
  async startInterview(request: StartInterviewRequest): Promise<StartInterviewResponse> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    cacheManager.invalidate('interviews_history');
    return (await response.json()) as StartInterviewResponse;
  },

  /**
   * Step 5.5: POST /interview/{interview_id}/answer
   * Submits candidate answer and receives continuing or completed state
   */
  async submitAnswer(
    interviewId: string,
    request: SubmitAnswerRequest
  ): Promise<SubmitAnswerResponse> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/interview/${interviewId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const result = (await response.json()) as SubmitAnswerResponse;
    if (result.status === 'completed') {
      cacheManager.invalidate('interviews_history');
    }
    return result;
  },

  /**
   * Fetch active interview state by ID
   */
  async getInterview(interviewId: string): Promise<any> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/interview/${interviewId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to get interview: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Fetch final report for a completed interview
   */
  async getInterviewReport(interviewId: string): Promise<BackendFinalReport> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/interview/${interviewId}/report`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to get interview report: ${response.statusText}`);
    }
    return response.json();
  },
  /**
   * Step 12: GET /interviews
   * Fetch past interview history with filtering & instant stale-while-revalidate caching
   */
  async getHistory(searchQuery?: string, forceRefresh = false): Promise<HistoryItem[]> {
    const cacheKey = 'interviews_history';
    const cached = cacheManager.get<HistoryItem[]>(cacheKey);
    if (cached && !forceRefresh && !searchQuery) {
      // Return cached immediately and refresh in background
      this.refreshHistory().catch(() => {});
      return cached;
    }
    const items = await this.refreshHistory();
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return items.filter((i) => i.roleTitle.toLowerCase().includes(q));
    }
    return items;
  },

  async refreshHistory(): Promise<HistoryItem[]> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetchWithAuth(`${baseUrl}/interviews`);
      if (response.ok) {
        const items = (await response.json()) as HistoryItem[];
        cacheManager.set('interviews_history', items, 3 * 60 * 1000);
        return items;
      }
    } catch {
      // Backend unavailable — return cached or empty list rather than fake data
    }
    return cacheManager.get<HistoryItem[]>('interviews_history') || [];
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const cached = cacheManager.get<LeaderboardEntry[]>('leaderboard');
    if (cached) return cached;
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetchWithAuth(`${baseUrl}/leaderboard`);
      const data = (await response.json()) as LeaderboardEntry[];
      cacheManager.set('leaderboard', data, 60 * 1000);
      return data;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  },

  /**
   * Admin Endpoints
   */
  async getAdminStats(): Promise<AdminStats> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/admin/stats`);
    if (!response.ok) {
      throw new Error(`Failed to load admin stats: ${response.statusText}`);
    }
    return response.json();
  },

  async getAdminUsers(): Promise<AdminUserItem[]> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/admin/users`);
    if (!response.ok) {
      throw new Error(`Failed to load users: ${response.statusText}`);
    }
    return response.json();
  },

  async clearPlatformCache(): Promise<{ status: string; message: string }> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/admin/cache/clear`, {
      method: 'POST',
    });
    cacheManager.clearAll();
    return response.json();
  },

  async deleteUser(userId: number): Promise<{ status: string; message: string }> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/admin/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to remove user');
    }
    return response.json();
  },
};

export const coachApi = {
  async getPlan(): Promise<PivotPlan> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/plan`);
    if (!response.ok) {
      throw new Error(`Failed to load pivot plan: ${response.statusText}`);
    }
    return response.json();
  },

  async runIntake(payload: IntakeRequest): Promise<PivotPlan> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to execute career intake: ${response.statusText}`);
    }
    return response.json();
  },

  async toggleTask(weekNumber: number, taskId: string): Promise<PivotPlan> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(
      `${baseUrl}/coach/milestone/${weekNumber}/task/${taskId}/toggle`,
      { method: 'POST' }
    );
    if (!response.ok) {
      throw new Error(`Failed to toggle task: ${response.statusText}`);
    }
    return response.json();
  },

  async adaptPlan(payload: {
    mock_topic: string;
    score: number;
    weak_concepts?: string[];
    interview_id?: string;
  }): Promise<PlanAdjustment> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/adapt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to adapt plan: ${response.statusText}`);
    }
    return response.json();
  },

  async getApplications(): Promise<JobApplication[]> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/applications`);
    if (!response.ok) {
      throw new Error(`Failed to load applications: ${response.statusText}`);
    }
    return response.json();
  },

  async addApplication(payload: {
    company: string;
    role_title: string;
    job_url?: string;
    status?: string;
    match_score?: number;
    notes?: string;
  }): Promise<JobApplication> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to create application: ${response.statusText}`);
    }
    return response.json();
  },

  async updateApplication(
    appId: string,
    updates: Partial<JobApplication>
  ): Promise<JobApplication> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(`Failed to update application: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteApplication(appId: string): Promise<{ success: boolean }> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/applications/${appId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete application: ${response.statusText}`);
    }
    return response.json();
  },

  async getAnalytics(): Promise<ApplicationTrends> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/analytics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch application analytics: ${response.statusText}`);
    }
    return response.json();
  },

  async addPortfolioProject(project: any): Promise<PivotPlan> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/portfolio/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) {
      throw new Error(`Failed to add portfolio project: ${response.statusText}`);
    }
    return response.json();
  },

  async villainChat(payload: {
    message: string;
    conversation_history: Array<{ role: string; content: string }>;
    resume_context?: any;
    target_role?: string;
  }): Promise<import('../types/coach').VillainChatResponse> {
    const baseUrl = getApiBaseUrl();
    const response = await fetchWithAuth(`${baseUrl}/coach/villain/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Career Villain agent error: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * SSE-streamed villain chat.
   * Calls onChunk(word) for each partial token.
   * Calls onDone(fullResponse) with the final structured payload.
   */
  async villainChatStream(
    payload: {
      message: string;
      conversation_history: Array<{ role: string; content: string }>;
      resume_context?: any;
      target_role?: string;
    },
    onChunk: (chunk: string) => void,
    onDone: (result: import('../types/coach').VillainChatResponse) => void,
    onError?: (err: Error) => void,
  ): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${baseUrl}/coach/villain/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.done) {
                onDone({
                  villain_message: parsed.villain_message ?? '',
                  verdict: parsed.verdict ?? null,
                  projects: parsed.projects ?? [],
                  brutal_truth: parsed.brutal_truth ?? '',
                  suggested_prompts: parsed.suggested_prompts ?? [],
                  success: true,
                });
              } else if (parsed.chunk) {
                onChunk(parsed.chunk);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
    } catch (err) {
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      else throw err;
    }
  },
};
