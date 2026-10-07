export type ThemeMode = 'light' | 'dark';

export type UserRoleTarget = 
  | 'Senior Frontend Architect'
  | 'Distributed Systems Lead'
  | 'Full Stack Lead'
  | 'ML Platform Engineer'
  | 'DevOps / SRE Lead'
  | 'Mobile Software Architect'
  | 'Data Platform Engineer'
  | 'Cybersecurity Systems Engineer';

export interface User {
  user_id: number;
  id: string;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string;
  targetRole?: UserRoleTarget;
  experienceYears?: number;
  totalInterviewsTaken?: number;
  avgScore?: number;
  readinessPercentage?: number;
  resumesCount?: number;
  createdAt?: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  user_id: number;
  email: string;
  username: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  user_id: number;
  email: string;
  username: string;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export interface SkillItem {
  name: string;
  category: 'Languages' | 'Frameworks' | 'System Architecture' | 'Cloud/DevOps' | 'Databases' | 'Tools';
  proficiency: number; // 0 - 100
  isMatched: boolean;
}

export interface Resume {
  id: string;
  filename: string;
  uploadDate: string;
  fileSize: string;
  extractedSkills: SkillItem[];
  extractedExperience: string[];
  techStackSummary: string[];
  matchRate: number; // Percentage
  parsedOverview: string;
  keyStrengths: string[];
  recommendedImprovements: string[];
}

export type RoleDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Junior' | 'Mid-Level' | 'Senior' | 'Staff/Architect';

export interface Role {
  id: string;
  title: string;
  category?: string;
  department: string;
  difficulty: RoleDifficulty;
  matchScore: number; // percentage based on uploaded resume
  description: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  relatedSkills?: string[];
  estimatedTimeMinutes: number;
  questionCount: number;
  iconName: string;
  featured?: boolean;
}

export interface SkillEvidence {
  skill: string;
  project?: string;
  company?: string;
}

export interface SkillGroupMatch {
  matched: number;
  total: number;
}

export interface RecommendedRole {
  role: Role;
  reason: string;
  matchedSkills: string[];
  skillGaps: string[];
  matchScore: number;
  requiredSkillMatch?: SkillGroupMatch;
  preferredSkillMatch?: SkillGroupMatch;
  projectEvidence?: SkillEvidence[];
  experienceEvidence?: SkillEvidence[];
}


export type AIPersonaType = 'Supportive' | 'Strict' | 'Deep-Dive Technical' | 'FAANG Recruiter';

export interface InterviewConfig {
  roleId: string;
  roleTitle: string;
  questionCount: number;
  durationMinutes: number;
  difficulty: RoleDifficulty;
  aiPersona: AIPersonaType;
  topicFocus: string[];
  includeSystemDesign: boolean;
  includeLiveCodingSim: boolean;
}

export interface StartInterviewRequest {
  role: string;
  role_id?: string;
  max_questions: number;
  topic?: string;
  difficulty?: string;
}

export interface BackendQuestion {
  question: string;
  topic: string;
  difficulty: string;
  question_type: string;
}

export interface StartInterviewResponse {
  success: boolean;
  interview_id: string;
  question: BackendQuestion;
  question_number: number;
  max_questions: number;
  status: string;
}

export interface SubmitAnswerRequest {
  answer: string;
}

export interface BackendReportQuestion {
  question: string;
  answer: string;
  score?: number;
  missing_concepts?: string[];
}

export interface BackendFinalReport {
  created_at?: string;
  role?: string;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
  topics_covered: string[];
  profile_strengths?: string[];
  interview_demonstrated_strengths?: string[];
  interview_knowledge_gaps?: string[];
  questions?: BackendReportQuestion[];
}

export interface SubmitAnswerResponse {
  success: boolean;
  status: 'waiting_for_answer' | 'completed';
  interview_id: string;
  question?: BackendQuestion;
  question_number?: number;
  max_questions?: number;
  interviewer_feedback?: string;
  final_report?: BackendFinalReport;
}

export interface Question {
  id: string;
  number: number;
  title: string;
  category: 'Technical Knowledge' | 'System Architecture' | 'Problem Solving' | 'Communication & Leadership';
  prompt: string;
  expectedKeywords: string[];
  hints: string[];
  timeLimitSeconds: number;
}

export interface UserAnswer {
  questionId: string;
  answerText: string;
  durationSeconds: number;
  transcriptionConfidence: number;
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies: string[];
  domain: string;
  role: string;
  duration: string;
  key_contributions: string[];
}

export interface ExperienceItem {
  company: string;
  role: string;
  location: string;
  start_date: string;
  end_date: string;
  responsibilities: string[];
  technologies: string[];
}

export interface EducationItem {
  degree: string;
  field: string;
  institution: string;
  start_year: string;
  end_year: string;
  cgpa: string;
  details: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  year: string;
}

export interface CandidateProfile {
  // --- UI/Frontend Only Fields ---
  id: string;
  resume_id?: number;
  avatarUrl?: string;
  targetRole: string;
  
  // --- Backend Parsed Fields ---
  candidate: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  education: EducationItem[];
  skills: {
    programming_languages: string[];
    frameworks: string[];
    libraries: string[];
    databases: string[];
    ai_ml: string[];
    cloud_devops: string[];
    tools: string[];
    other: string[];
  };
  projects: ProjectItem[];
  experience: ExperienceItem[];
  certifications: CertificationItem[];
  achievements: string[];
  publications: string[];
  competitive_programming: {
    platforms: string[];
    problems_solved: string;
    ratings: string;
  };
  languages: string[];
  interests: string[];
  expertise_areas: string[];
  potential_interview_topics: string[];
}

export interface PerQuestionFeedback {
  scoreOutOf10: number; // e.g. 8
  correctness: number;   // 0 - 10
  completeness: number;  // 0 - 10
  technicalDepth: number; // 0 - 10
  missingConcepts: string[];
  feedback: string;
}

export interface QuestionEvaluation {
  questionId: string;
  score: number; // 0 - 100
  clarityScore: number;
  technicalAccuracyScore: number;
  relevanceScore: number;
  aiFeedback: string;
  keyStrengths: string[];
  missingKeywords: string[];
  idealSampleAnswer: string;
  userAnswerText: string;
  detailedFeedback?: PerQuestionFeedback;
}

export interface TopicScore {
  topic: string;
  score: number;
  maxScore: number;
}

export interface PerformanceReport {
  sessionId: string;
  roleTitle: string;
  date: string;
  overallScore: number; // 0 - 100 or 0 - 10
  technicalScore?: number;
  completeness?: number;
  technicalDepth?: number;
  percentileRank: number;
  timeSpentMinutes: number;
  categoryScores: {
    technicalAccuracy: number;
    systemDesign: number;
    communication: number;
    problemSolving: number;
  };
  radarMetrics: {
    subject: string;
    score: number;
    benchmark: number;
  }[];
  topicPerformance?: TopicScore[];
  strengths?: string[];
  knowledgeGaps?: string[];
  interviewSummary?: string;
  recommendations?: string[];
  questionEvaluations: QuestionEvaluation[];
  topStrengths: string[];
  criticalAreasToImprove: string[];
  actionPlan: string[];
}

export interface HistoryItem {
  id: string;
  roleTitle: string;
  date: string;
  difficulty: RoleDifficulty;
  overallScore: number;
  durationMinutes: number;
  status: 'Completed' | 'In Progress' | 'Abandoned';
}

