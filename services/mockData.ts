import { User, UserRole, ClassModel, Video, Exam, Question, ForumPost, Enrollment, StudentAnalytics, LiveSessionState, StreamMode } from '../types';

// Initial Mock Data
const MOCK_TEACHER_ID = 'teacher-1';

const INITIAL_USERS: User[] = [
  { id: MOCK_TEACHER_ID, role: UserRole.TEACHER, name: 'Mr. Anderson' },
];

const INITIAL_CLASSES: ClassModel[] = [
  { id: 'class-1', teacher_id: MOCK_TEACHER_ID, title: 'Advanced Mathematics', description: 'Calculus and Linear Algebra', created_at: new Date().toISOString(), isLive: false },
  { id: 'class-2', teacher_id: MOCK_TEACHER_ID, title: 'Physics 101', description: 'Mechanics and Thermodynamics', created_at: new Date().toISOString(), isLive: false },
];

const INITIAL_ENROLLMENTS: Enrollment[] = [];

const INITIAL_VIDEOS: Video[] = [
  { id: 'vid-1', class_id: 'class-1', teacher_id: MOCK_TEACHER_ID, title: 'Intro to Derivatives', storage_url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 300, uploaded_at: new Date().toISOString() },
];

const INITIAL_EXAMS: Exam[] = [
  { id: 'exam-1', class_id: 'class-1', teacher_id: MOCK_TEACHER_ID, title: 'Midterm Calculus', description: 'Covering limits and derivatives', time_limit_minutes: 60, questions: [] },
];

const INITIAL_POSTS: ForumPost[] = [];

// Live Session State Storage (In-memory for mock)
const LIVE_SESSIONS: Record<string, LiveSessionState> = {};

// Helper to simulate DB delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockBackendService {
  private users: User[] = INITIAL_USERS;
  private classes: ClassModel[] = INITIAL_CLASSES;
  private enrollments: Enrollment[] = INITIAL_ENROLLMENTS;
  private videos: Video[] = INITIAL_VIDEOS;
  private exams: Exam[] = INITIAL_EXAMS;
  private posts: ForumPost[] = INITIAL_POSTS;

  // AUTH
  async loginStudent(code: string): Promise<User | null> {
    await delay(500);
    return this.users.find(u => u.role === UserRole.STUDENT && u.student_code === code) || null;
  }

  // Generate a code for a new student
  async generateStudentCode(name: string): Promise<{user: User, code: string}> {
    await delay(300);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newUser: User = {
      id: `student-${Date.now()}`,
      role: UserRole.STUDENT,
      name,
      student_code: code
    };
    this.users.push(newUser);
    return { user: newUser, code };
  }

  // Create student and immediately enroll in class
  async createStudentAndEnroll(classId: string, name: string): Promise<{user: User, code: string}> {
    await delay(300);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newUser: User = {
      id: `student-${Date.now()}`,
      role: UserRole.STUDENT,
      name,
      student_code: code
    };
    this.users.push(newUser);
    this.enrollments.push({
      id: `enroll-${Date.now()}`,
      class_id: classId,
      student_id: newUser.id
    });
    return { user: newUser, code };
  }

  // CLASSES
  async getClasses(userId: string, role: UserRole): Promise<ClassModel[]> {
    await delay(300);
    if (role === UserRole.TEACHER) {
      // Teachers see classes they created
      return this.classes.filter(c => c.teacher_id === userId);
    } else {
      // Students see classes they are enrolled in
      const enrolledIds = this.enrollments.filter(e => e.student_id === userId).map(e => e.class_id);
      return this.classes.filter(c => enrolledIds.includes(c.id));
    }
  }

  async getClass(classId: string): Promise<ClassModel | undefined> {
     return this.classes.find(c => c.id === classId);
  }

  async createClass(teacherId: string, title: string, description: string): Promise<ClassModel> {
    await delay(300);
    const newClass: ClassModel = {
      id: `class-${Date.now()}`,
      teacher_id: teacherId,
      title,
      description,
      created_at: new Date().toISOString(),
      isLive: false
    };
    this.classes.push(newClass);
    return newClass;
  }

  // LIVE STREAMING & INTERACTION
  async setClassLiveStatus(classId: string, isLive: boolean): Promise<void> {
    const cls = this.classes.find(c => c.id === classId);
    if (cls) {
      cls.isLive = isLive;
      // Initialize or clear session state
      if (isLive) {
        LIVE_SESSIONS[classId] = {
          classId,
          isLive: true,
          mode: StreamMode.CAMERA,
          raisedHands: [],
          activeSpeakers: []
        };
      } else {
        delete LIVE_SESSIONS[classId];
      }
    }
  }

  async getLiveSessionState(classId: string): Promise<LiveSessionState | null> {
    // No delay here for faster polling
    return LIVE_SESSIONS[classId] || null;
  }

  async updateStreamMode(classId: string, mode: StreamMode): Promise<void> {
    if (LIVE_SESSIONS[classId]) {
      LIVE_SESSIONS[classId].mode = mode;
    }
  }

  async raiseHand(classId: string, studentId: string): Promise<void> {
    if (LIVE_SESSIONS[classId] && !LIVE_SESSIONS[classId].raisedHands.includes(studentId)) {
      LIVE_SESSIONS[classId].raisedHands.push(studentId);
    }
  }

  async lowerHand(classId: string, studentId: string): Promise<void> {
    if (LIVE_SESSIONS[classId]) {
      LIVE_SESSIONS[classId].raisedHands = LIVE_SESSIONS[classId].raisedHands.filter(id => id !== studentId);
    }
  }

  async allowSpeaker(classId: string, studentId: string): Promise<void> {
    if (LIVE_SESSIONS[classId]) {
      if (!LIVE_SESSIONS[classId].activeSpeakers.includes(studentId)) {
        LIVE_SESSIONS[classId].activeSpeakers.push(studentId);
      }
      // Auto lower hand when accepted
      await this.lowerHand(classId, studentId);
    }
  }

  async muteSpeaker(classId: string, studentId: string): Promise<void> {
    if (LIVE_SESSIONS[classId]) {
      LIVE_SESSIONS[classId].activeSpeakers = LIVE_SESSIONS[classId].activeSpeakers.filter(id => id !== studentId);
    }
  }

  // Get user details by ID (for displaying who raised hand)
  async getUserById(userId: string): Promise<User | undefined> {
    return this.users.find(u => u.id === userId);
  }

  async enrollStudent(classId: string, studentId: string): Promise<void> {
    this.enrollments.push({
        id: `enroll-${Date.now()}`,
        class_id: classId,
        student_id: studentId
    });
  }

  // VIDEOS
  async getVideos(classId: string): Promise<Video[]> {
    await delay(200);
    return this.videos.filter(v => v.class_id === classId);
  }

  async uploadVideo(classId: string, teacherId: string, title: string, file: File): Promise<Video> {
    await delay(1500); // Simulate upload
    const newVideo: Video = {
      id: `vid-${Date.now()}`,
      class_id: classId,
      teacher_id: teacherId,
      title,
      storage_url: URL.createObjectURL(file), // Local URL for demo
      duration: 0,
      uploaded_at: new Date().toISOString()
    };
    this.videos.push(newVideo);
    return newVideo;
  }

  // EXAMS
  async getExams(classId: string): Promise<Exam[]> {
    await delay(200);
    return this.exams.filter(e => e.class_id === classId);
  }

  async createExam(exam: Exam): Promise<Exam> {
    await delay(500);
    const newExam = { ...exam, id: `exam-${Date.now()}` };
    this.exams.push(newExam);
    return newExam;
  }

  // FORUM
  async getPosts(classId: string): Promise<ForumPost[]> {
    await delay(200);
    return this.posts.filter(p => p.class_id === classId).sort((a,b) => b.created_at.localeCompare(a.created_at));
  }

  async createPost(post: Omit<ForumPost, 'id' | 'created_at'>): Promise<ForumPost> {
    await delay(300);
    const newPost: ForumPost = {
      ...post,
      id: `post-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.posts.unshift(newPost);
    return newPost;
  }

  // ANALYTICS
  async getClassAnalytics(classId: string): Promise<StudentAnalytics[]> {
    await delay(300);
    const classEnrollments = this.enrollments.filter(e => e.class_id === classId);
    
    // Get students
    const students = classEnrollments
      .map(e => this.users.find(u => u.id === e.student_id))
      .filter((u): u is User => !!u);
      
    // Return mock stats for real students
    return students.map(student => {
      // Create a deterministic pseudo-random seed from the ID
      let seed = 0;
      for (let i = 0; i < student.id.length; i++) {
        seed += student.id.charCodeAt(i);
      }
      
      return {
        id: student.id,
        name: student.name,
        score: 70 + (seed % 30), // Random score between 70-99 based on ID
        attendance: 80 + (seed % 20) // Random attendance between 80-99
      };
    });
  }
}

export const api = new MockBackendService();
