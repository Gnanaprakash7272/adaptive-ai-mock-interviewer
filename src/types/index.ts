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
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  targetRole: UserRoleTarget;
  experienceYears: number;
  totalInterviewsTaken: number;
  avgScore: number;
  readinessPercentage: number;
  resumesCount: number;
  createdAt: string;
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
  department: string;
  difficulty: RoleDifficulty;
  matchScore: number; // percentage based on uploaded resume
  description: string;
  requiredSkills: string[];
  estimatedTimeMinutes: number;
  questionCount: number;
  iconName: string;
  featured?: boolean;
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
  techStack: string[];
  link?: string;
}

export interface ExperienceItem {
  role: string;
  company: string;
  duration: string;
  highlights: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
  grade?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  targetRole: string;
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  experience: ExperienceItem[];
  certifications: string[];
  expertise: string[];
  potentialInterviewTopics: string[];
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

