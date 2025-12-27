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
}

export interface ClassModel {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  created_at: string;
  isLive?: boolean;
}

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
}

export interface Video {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  storage_url: string;
  duration: number; // seconds
  uploaded_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  kind: 'mcq' | 'text' | 'boolean';
  body: string;
  image_url?: string;
  choices?: string[]; // JSON stringified in DB, array here
  correct_answer?: string; // Simplified for demo
  points: number;
}

export interface Exam {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  questions?: Question[];
}

export interface ForumPost {
  id: string;
  class_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  created_at: string;
}

// Analytics Types
export interface StudentAnalytics {
  id: string;
  name: string;
  score: number;
  attendance: number;
}

// Live Stream Types
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
  activeSpeakers: string[]; // List of User IDs allowed to speak
}