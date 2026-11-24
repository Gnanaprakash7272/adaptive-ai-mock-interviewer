export interface SkillGapMap {
  target_role: string;
  seniority_level: string;
  market_readiness_score: number;
  summary: string;
  transferable_strengths: string[];
  missing_core_skills: string[];
  critical_blindspots: string[];
  suggested_focus_areas: string[];
}

export interface LearningTask {
  id: string;
  title: string;
  category: 'theory' | 'coding_lab' | 'project' | 'mock_prep';
  estimated_hours: number;
  completed: boolean;
  resources?: string[];
}

export interface WeeklyMilestone {
  week_number: number;
  title: string;
  theme: string;
  goals: string[];
  tasks: LearningTask[];
  checkpoint_mock_topic: string;
  checkpoint_score?: number | null;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface PortfolioProject {
  id: string;
  title: string;
  difficulty: 'Intermediate' | 'Advanced' | 'Staff';
  description: string;
  tech_stack: string[];
  target_gaps_addressed: string[];
  architecture_summary: string;
  key_deliverables: string[];
  github_blueprint: string[];
}

export interface JobApplication {
  id: string;
  company: string;
  role_title: string;
  job_url?: string | null;
  applied_date: string;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';
  match_score: number;
  notes?: string | null;
  response_received: boolean;
}

export interface PivotPlan {
  plan_id: string;
  user_id: number | string;
  current_role: string;
  target_role: string;
  experience_years: number;
  weekly_hours: number;
  gap_map: SkillGapMap;
  roadmap: WeeklyMilestone[];
  portfolio_projects: PortfolioProject[];
  created_at: string;
  updated_at: string;
}

export interface PlanAdjustment {
  interview_id?: string | null;
  topic: string;
  score: number;
  action: 'remediate' | 'advance' | 'reinforce';
  reason: string;
  affected_weeks: number[];
  added_tasks: LearningTask[];
}

export interface IntakeRequest {
  current_role: string;
  target_role: string;
  experience_years: number;
  weekly_hours: number;
  job_description?: string;
  resume_text?: string;
}

// ---------------------------------------------------------------------------
// Career Villain Agent Types
// ---------------------------------------------------------------------------

export interface VillainChatMessage {
  role: 'user' | 'agent';
  content: string;
}

export interface VillainProjectCard extends PortfolioProject {
  villain_pitch?: string;
  interview_trap_question?: string;
  staff_defense_answer?: string;
  architecture_diagram?: string;
}

export interface VillainChatResponse {
  success: boolean;
  stage?: string;
  villain_message: string;
  verdict?: 'Weak Clone' | 'Needs Scale' | 'Promising' | 'Elite Blueprint' | string | null;
  projects?: VillainProjectCard[];
  brutal_truth?: string;
  suggested_prompts?: string[];
  follow_up_question?: string;
  ready_for_next?: boolean;
}

export interface VillainChatRequest {
  message: string;
  conversation_history: VillainChatMessage[];
  resume_context?: any;
  target_role?: string;
}

export interface ApplicationTrends {
  total_applications: number;
  response_rate: number;
  funnel: {
    applied: number;
    screening: number;
    interview: number;
    offer: number;
    rejected: number;
  };
  top_converting_keywords: string[];
  insights: string[];
  recommendations: string[];
  target_role: string;
}
