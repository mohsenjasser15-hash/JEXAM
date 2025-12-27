export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  student_code?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface ClassModel {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  created_at: string;
  isLive: boolean;
  join_code?: string;
}

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface Video {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  storage_url: string;
  duration: number; // seconds
  uploaded_at: string;
  mime_type?: string;
}

export interface Question {
  id: string;
  kind: 'mcq' | 'text' | 'boolean';
  body: string;
  image_url?: string;
  choices?: string[]; 
  correct_answer?: string; 
  points: number;
}

export interface Exam {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  questions: Question[];
  created_at: string;
  active: boolean;
}

export interface ExamSubmission {
  id: string;
  exam_id: string;
  student_id: string;
  answers: Record<string, string>; // question_id -> answer
  score: number;
  submitted_at: string;
}

export interface ForumPost {
  id: string;
  class_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  created_at: string;
  replies?: number;
}

// Analytics Types
export interface StudentAnalytics {
  id: string;
  name: string;
  score: number;
  attendance: number;
  submissions_count: number;
}

// Live Stream & Whiteboard Types
export enum StreamMode {
  CAMERA = 'camera',
  SCREEN = 'screen',
  WHITEBOARD = 'whiteboard'
}

export interface LiveSessionState {
  classId: string;
  isLive: boolean;
  mode: StreamMode;
  raisedHands: string[]; // List of User IDs
  activeSpeakers: string[]; // List of User IDs
  started_at: number;
}

export interface WhiteboardPath {
  id: string;
  userId: string;
  color: string;
  lineWidth: number;
  points: {x: number, y: number}[]; // Flattened for storage
  timestamp: number;
  type: 'draw' | 'erase';
}
