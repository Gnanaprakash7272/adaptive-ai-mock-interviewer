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
} from '../types';


const TOKEN_KEY = 'ai_mockora_access_token';
const API_BASE_URL_KEY = 'ai_mockora_api_url';
export const AUTH_INVALIDATED_EVENT = 'ai_mockora_auth_invalidated';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.PROD) return '';

  return localStorage.getItem(API_BASE_URL_KEY) || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Fetch wrapper that adds the Authorization header and throws on HTTP errors.
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

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearAccessToken();
    window.dispatchEvent(new Event(AUTH_INVALIDATED_EVENT));
  }
  
  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // Ignored
    }
    throw new Error(errorDetail);
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
   */
  async getCandidateProfile(): Promise<CandidateProfile> {
    const baseUrl = getApiBaseUrl();
    // fetchWithAuth throws on non-OK responses (4xx/5xx) with the backend's error detail
    const response = await fetchWithAuth(`${baseUrl}/candidate/profile`);
    return (await response.json()) as CandidateProfile;
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
        return (await response.json()) as CandidateProfile;
    }
    throw new Error('Failed to update candidate profile');
  },

  /**
   * Fetch list of technical engineering roles with optional search & filters
   * Calls GET /roles on the backend (the role catalogue is the source of truth).
   */
  async getRoles(searchQuery?: string, difficultyFilter?: string): Promise<Role[]> {
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (difficultyFilter && difficultyFilter !== 'All') params.set('difficulty', difficultyFilter);
    const url = `${baseUrl}/roles${params.toString() ? '?' + params.toString() : ''}`;
    try {
      const response = await fetchWithAuth(url);
      return (await response.json()) as Role[];
    } catch {
      // Backend unreachable — fall through to empty list
    }
    return [];
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

    return (await response.json()) as SubmitAnswerResponse;
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
   * Fetch past interview history with filtering
   */
  async getHistory(searchQuery?: string): Promise<HistoryItem[]> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetchWithAuth(`${baseUrl}/interviews`);
      if (response.ok) {
        const items = (await response.json()) as HistoryItem[];
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return items.filter((i) => i.roleTitle.toLowerCase().includes(q));
        }
        return items;
      }
    } catch {
      // Backend unavailable — return empty list rather than fake data
    }
    return [];
  },
};
