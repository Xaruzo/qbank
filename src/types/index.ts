/**
 * Domain Type Definitions for Civil Service Exam (CSE) Reviewer
 */

export type TopicId = "numerical" | "verbal" | "general" | "analytical" | "clerical" | "strategy" | "all";

export interface TopicDef {
  id: TopicId;
  label: string;
  short?: string;
  color: string;
  desc?: string;
}

export interface QuestionChoice {
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  topic: TopicId;
  label?: string;
  question: string;
  choices: string[];
  correct: number;
  solution?: string;
  solutionDraw?: string | null;
  solution_draw?: string | null;
  dateAdded?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
  favorite?: boolean;
}

export interface ExamPreset {
  id: "professional" | "subprofessional";
  name: string;
  shortName: string;
  totalItems: number;
  durationMs: number;
  durationLabel: string;
  targetTopics: TopicId[];
  excludedTopics?: TopicId[];
  badge: string;
  targetAudience: string;
  description: string;
  subjects: { id: TopicId; name: string; desc: string }[];
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  topic: TopicId;
  tags: string[];
  pinned: boolean;
  color?: "default" | "amber" | "purple" | "blue" | "emerald" | "rose";
  createdAt: string;
  updatedAt: string;
}

export interface MockExamAttempt {
  id: string;
  sessionId?: string | null;
  mode: "professional" | "subprofessional";
  startedAt: number;
  completedAt: string;
  durationMs: number;
  timeSpentMs: number;
  timeLeftMs: number;
  totalCount: number;
  answeredCount: number;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  scorePercent: number;
  topicStats: { topic: TopicId; total: number; correct: number; percent: number }[];
  strongestTopic?: { topic: TopicId; percent: number } | null;
  weakestTopic?: { topic: TopicId; percent: number } | null;
  questions?: any[];
}

export interface AppSettings {
  liteMode: boolean;
  animationsEnabled: boolean;
  performanceTier?: "auto" | "high" | "lite";
  examTarget: "professional" | "subprofessional";
  targetExamDate?: string;
  dailyStudyGoal: number;
  soundEffects: boolean;
  hapticFeedback: boolean;
}

export type UserRole = "superadmin" | "admin" | "moderator" | "reviewer";

export interface UserRoleRecord {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedAt: string;
  assignedBy?: string;
  notes?: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  initials: string;
  avatarColor?: string;
  avatarShape?: "circle" | "badge";
  avatarPreset?: string;
  examTarget?: "professional" | "subprofessional";
  targetExamDate?: string;
  dailyStudyGoal?: number;
  userRole?: UserRole;
}

export interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onHome: () => void;
  onLanding?: () => void;
  currentView?: string;
  showNavToggle?: boolean;
  navOpen?: boolean;
  onToggleNav?: () => void;
  authAvailable?: boolean;
  isAuthLoading?: boolean;
  isAuthenticated?: boolean;
  profile?: UserProfile | null;
  onSignIn?: () => void;
  onSignInWithEmail?: (email: string, password?: string) => Promise<{ error: any; mode?: string; message?: string }>;
  onSignInWithGoogle?: () => Promise<{ error: any }>;
  onSignOut?: () => Promise<void> | void;
  onOpenHelp?: () => void;
  onOpenSettings?: (tab?: string) => void;
  onMockExam?: () => void;
  onTips?: () => void;
  onNotes?: () => void;
  settings?: AppSettings;
  onUpdateSettings?: (partial: Partial<AppSettings>) => void;
  isQuestionAdmin?: boolean;
  isSuperAdmin?: boolean;
  userRole?: UserRole;
}

export interface SideNavProps {
  variant?: "rail" | "overlay";
  open?: boolean;
  active?: string;
  onHome?: () => void;
  onLanding?: () => void;
  onMockExam?: () => void;
  onTips?: () => void;
  onNotes?: () => void;
  onSettings?: (tab?: string) => void;
  onClose?: () => void;
  totalQuestions?: number;
  starredCount?: number;
  isDark?: boolean;
  onToggleTheme?: () => void;
  themeMode?: "dark" | "light" | "system";
  onSetThemeMode?: (mode: "dark" | "light" | "system") => void;
  onOpenHelp?: () => void;
  onOpenSettings?: (tab?: string) => void;
  isAuthenticated?: boolean;
  profile?: UserProfile | null;
  onSignIn?: () => void;
  onSignInWithEmail?: (email: string, password?: string) => Promise<{ error: any; mode?: string; message?: string }>;
  onSignOut?: () => Promise<void> | void;
  onToggleNav?: () => void;
  activeTopic?: TopicId | "all";
  onSelectTopic?: (topicId: TopicId | "all") => void;
  topicCounts?: Record<string, number>;
  settings?: AppSettings;
  isQuestionAdmin?: boolean;
  isSuperAdmin?: boolean;
  userRole?: UserRole;
}

export interface SettingsPageProps {
  initialTab?: string;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onResetSettings?: () => void;
  profile: UserProfile | null;
  onUpdateProfile?: (partial: Partial<UserProfile>) => Promise<{ success: boolean }>;
  isDark: boolean;
  onToggleTheme: () => void;
  isAuthenticated: boolean;
  isQuestionAdmin?: boolean;
  isSuperAdmin?: boolean;
  userRole?: UserRole;
  totalQuestions?: number;
  mockAttemptsCount?: number;
  favoritesCount?: number;
  notesCount?: number;
  onBackToMain: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export interface StatsProps {
  total: number;
  counts: Record<string, number>;
  topicFilter?: string;
  onSelectTopic?: (topicId: TopicId | "all") => void;
}

export interface LabelOption {
  value: string;
  label: string;
  count: number;
}

export interface SearchAndFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  topicFilter: string;
  onTopicChange: (topicId: TopicId | "all") => void;
  labelFilter: string;
  onLabelChange: (label: string) => void;
  labelOptions: LabelOption[];
  total: number;
  counts: Record<string, number>;
  filteredCount: number;
  favoriteCount: number;
  favoriteOnly?: boolean;
  onFavoriteOnlyChange?: (val: boolean) => void;
  onResetFilters?: () => void;
}

export interface QuestionListProps {
  questions: Question[];
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  totalInProject: number;
  sortBy: string;
  onSortChange: (sortVal: string) => void;
  canManageQuestions?: boolean;
  authAvailable?: boolean;
  isAuthenticated?: boolean;
  onAddQuestion?: () => void;
  onNavigateToTips?: () => void;
  resetKey?: any;
}

export interface SelectOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  leadIcon?: React.ReactNode;
  showCheckmark?: boolean;
}

export interface LandingPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onStartReview: () => void;
  onSignIn: () => void;
  onExploreGuest: () => void;
  onStartMock?: (presetId?: "professional" | "subprofessional") => void;
  onNavigateToTips?: () => void;
  totalQuestions?: number;
  isAuthenticated?: boolean;
  profile?: UserProfile | null;
}

export interface SignInPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onBackToLanding: () => void;
  onSuccessLogin: () => void;
  onContinueAsGuest: () => void;
  onSignInWithEmail: (
    email: string,
    password?: string,
    options?: { mode?: "signin" | "signup" }
  ) => Promise<{ error: any; mode?: string; message?: string }>;
  onSignInWithGoogle?: () => Promise<{ error: any }>;
  onGoHome?: () => void;
  onGoMockExam?: () => void;
  onGoTips?: () => void;
  onGoNotes?: () => void;
}

