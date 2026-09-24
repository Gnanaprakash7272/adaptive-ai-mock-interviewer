import type {
  User,
  Resume,
  Role,
  InterviewConfig,
  PerformanceReport,
  HistoryItem,
  Question,
  CandidateProfile,
  PerQuestionFeedback,
} from '../types';
import {
  mockUser,
  mockResume,
  mockRoles,
  mockQuestions,
  mockSampleReport,
  mockHistory,
  mockCandidateProfile,
} from '../mock/mockData';

// Helper function to simulate realistic network latency
const simulateNetworkDelay = async (ms: number = 300): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getApiBaseUrl = (): string => {
  return localStorage.getItem('ai_mockora_api_url') || 'http://localhost:8000';
};

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
   * Fetch current authenticated user profile
   */
  async getUser(): Promise<User> {
    await simulateNetworkDelay(200);
    return { ...mockUser };
  },

  /**
   * Update user target role or details
   */
  async updateUser(updatedFields: Partial<User>): Promise<User> {
    await simulateNetworkDelay(250);
    Object.assign(mockUser, updatedFields);
    return { ...mockUser };
  },

  /**
   * Step 3: POST /resume/analyze
   * Upload PDF to backend extraction & Gemini pipeline
   */
  async analyzeResume(file: File): Promise<CandidateProfile> {
    const baseUrl = getApiBaseUrl();
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${baseUrl}/resume/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data as CandidateProfile;
      }
    } catch {
      // Graceful fallback to rich local candidate profile if backend is not yet started
    }

    // Realistic processing fallback simulation
    await simulateNetworkDelay(600);
    return {
      ...mockCandidateProfile,
      name: mockUser.name,
      email: mockUser.email,
    };
  },

  /**
   * Legacy upload for resume card state
   */
  async uploadResume(file: File): Promise<Resume> {
    await simulateNetworkDelay(600);
    const newResume: Resume = {
      ...mockResume,
      id: `res_${Date.now().toString().slice(-4)}`,
      filename: file.name || 'Uploaded_Resume.pdf',
      uploadDate: new Date().toISOString().split('T')[0],
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    };
    return newResume;
  },

  /**
   * Fetch Candidate Profile (from Supabase / FastAPI)
   */
  async getCandidateProfile(): Promise<CandidateProfile> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/candidate/profile`);
      if (response.ok) {
        return (await response.json()) as CandidateProfile;
      }
    } catch {
      // Fallback
    }

    await simulateNetworkDelay(200);
    return { ...mockCandidateProfile };
  },

  /**
   * Update Candidate Profile
   */
  async updateCandidateProfile(profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/candidate/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      if (response.ok) {
        return (await response.json()) as CandidateProfile;
      }
    } catch {
      // Fallback
    }

    await simulateNetworkDelay(250);
    Object.assign(mockCandidateProfile, profileData);
    return { ...mockCandidateProfile };
  },

  /**
   * Fetch list of technical engineering roles with optional search & filters
   */
  async getRoles(searchQuery?: string, difficultyFilter?: string): Promise<Role[]> {
    await simulateNetworkDelay(150);
    let roles = [...mockRoles];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      roles = roles.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.requiredSkills.some((s) => s.toLowerCase().includes(query))
      );
    }
    if (difficultyFilter && difficultyFilter !== 'All') {
      roles = roles.filter((r) => r.difficulty === difficultyFilter);
    }
    return roles;
  },

  /**
   * Fetch specific role by ID
   */
  async getRoleById(roleId: string): Promise<Role | undefined> {
    await simulateNetworkDelay(100);
    return mockRoles.find((r) => r.id === roleId) || mockRoles[0];
  },

  /**
   * Fetch questions for an interview session setup
   */
  async getQuestionsForRole(_roleId: string, count: number = 5): Promise<Question[]> {
    await simulateNetworkDelay(200);
    return mockQuestions.slice(0, count);
  },

  /**
   * Step 6: POST /interviews
   * Start a new mock interview session with LangGraph backend
   */
  async createInterviewSession(config: InterviewConfig): Promise<{ sessionId: string }> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }

    await simulateNetworkDelay(300);
    const sessionId = `sess_${Date.now().toString().slice(-6)}`;
    return { sessionId };
  },

  /**
   * Step 7 & 8 & 9: POST /interviews/{id}/answers
   * Submits candidate answer, receives evaluation feedback and adaptive next question
   */
  async submitAnswer(
    sessionId: string,
    questionId: string,
    answerText: string,
    currentQuestionIndex: number = 0,
    totalQuestions: number = 5
  ): Promise<AnswerSubmissionResult> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/interviews/${sessionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answerText }),
      });
      if (response.ok) {
        return (await response.json()) as AnswerSubmissionResult;
      }
    } catch {
      // Fallback
    }

    await simulateNetworkDelay(600); // Simulate AI evaluation
    const isFinished = currentQuestionIndex >= totalQuestions - 1;
    const nextQuestion = !isFinished ? mockQuestions[currentQuestionIndex + 1] : undefined;

    // Realistic evaluation metrics matching user prompt Section 8
    return {
      success: true,
      scoreOutOf10: 8,
      correctness: 8,
      completeness: 7,
      technicalDepth: 8,
      missingConcepts: currentQuestionIndex === 0 
        ? ['Bias-variance tradeoff nuance', 'Clustering loss functions'] 
        : ['Mathematical formulation of L1/L2 penalty'],
      feedback: 'Your answer correctly explained the foundational concepts with strong technical intuition and clarity.',
      is_finished: isFinished,
      next_action: isFinished ? 'complete' : 'next_question',
      next_question: nextQuestion,
    };
  },

  /**
   * Step 11: GET /interviews/{id}/report
   * Fetch comprehensive performance report for completed interview
   */
  async getReport(sessionId: string): Promise<PerformanceReport> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/interviews/${sessionId}/report`);
      if (response.ok) {
        return (await response.json()) as PerformanceReport;
      }
    } catch {
      // Fallback
    }

    await simulateNetworkDelay(300);
    return {
      ...mockSampleReport,
      sessionId,
    };
  },

  /**
   * Step 12: GET /interviews
   * Fetch past interview history with filtering
   */
  async getHistory(searchQuery?: string): Promise<HistoryItem[]> {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/interviews`);
      if (response.ok) {
        return (await response.json()) as HistoryItem[];
      }
    } catch {
      // Fallback
    }

    await simulateNetworkDelay(200);
    let items = [...mockHistory];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.roleTitle.toLowerCase().includes(q));
    }
    return items;
  },
};
