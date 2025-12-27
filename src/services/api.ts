import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, 
  query, where, orderBy, onSnapshot, deleteDoc, Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, uploadBytesResumable, getDownloadURL 
} from 'firebase/storage';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile 
} from 'firebase/auth';
import { db, auth, storage } from '../lib/firebase';
import { User, UserRole, ClassModel, Video, Exam, ForumPost, Enrollment, StudentAnalytics, LiveSessionState, StreamMode, WhiteboardPath } from '../types';
import { v4 as uuidv4 } from 'uuid';

class FirebaseService {
  
  // --- AUTHENTICATION ---
  
  async login(email: string, code: string, role: UserRole): Promise<User> {
    // For students, the "email" might be derived from the code or specific logic
    // For production, we assume email/password. 
    // If using code-only for students, we'd map code -> email via a cloud function or Admin SDK.
    // Here we strictly use email/pass for simplicity in this "production" example, 
    // or map code to a dummy email for students: code@student.jexam.com
    
    let loginEmail = email;
    if (role === UserRole.STUDENT && !email.includes('@')) {
      loginEmail = `${code}@student.jexam.com`;
    }

    const cred = await signInWithEmailAndPassword(auth, loginEmail, code); // password is code
    
    // Fetch user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (!userDoc.exists()) {
       throw new Error("User profile not found");
    }
    
    return userDoc.data() as User;
  }

  async logout() {
    await signOut(auth);
  }

  // --- CLASSES ---

  async getClasses(userId: string, role: UserRole): Promise<ClassModel[]> {
    const classesRef = collection(db, 'classes');
    let q;

    if (role === UserRole.TEACHER) {
      q = query(classesRef, where('teacher_id', '==', userId), orderBy('created_at', 'desc'));
    } else {
      // Get enrollments first
      const enrollRef = collection(db, 'enrollments');
      const enrollQuery = query(enrollRef, where('student_id', '==', userId));
      const enrollSnap = await getDocs(enrollQuery);
      const classIds = enrollSnap.docs.map(d => d.data().class_id);
      
      if (classIds.length === 0) return [];
      
      // Firestore 'in' query supports max 10 items. For production, execute parallel queries or chunk.
      // We'll limit to 10 for safety in this snippet.
      q = query(classesRef, where('id', 'in', classIds.slice(0, 10)));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ClassModel);
  }

  async createClass(teacherId: string, title: string, description: string): Promise<ClassModel> {
    const id = uuidv4();
    const newClass: ClassModel = {
      id,
      teacher_id: teacherId,
      title,
      description,
      created_at: new Date().toISOString(),
      isLive: false,
      join_code: Math.random().toString(36).substring(2, 8).toUpperCase()
    };

    await setDoc(doc(db, 'classes', id), newClass);
    return newClass;
  }

  // --- LIVE SESSION & REALTIME ---

  async setClassLiveStatus(classId: string, isLive: boolean): Promise<void> {
    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, { isLive });

    const sessionRef = doc(db, 'sessions', classId);
    if (isLive) {
      const session: LiveSessionState = {
        classId,
        isLive: true,
        mode: StreamMode.CAMERA,
        raisedHands: [],
        activeSpeakers: [],
        started_at: Date.now()
      };
      await setDoc(sessionRef, session);
    } else {
      await deleteDoc(sessionRef);
    }
  }

  // Real-time listener
  subscribeToSession(classId: string, callback: (session: LiveSessionState | null) => void) {
    return onSnapshot(doc(db, 'sessions', classId), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as LiveSessionState);
      } else {
        callback(null);
      }
    });
  }

  async updateStreamMode(classId: string, mode: StreamMode): Promise<void> {
    await updateDoc(doc(db, 'sessions', classId), { mode });
  }

  async raiseHand(classId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'sessions', classId);
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const data = snap.data() as LiveSessionState;
      if (!data.raisedHands.includes(userId)) {
        const newHands = [...data.raisedHands, userId];
        await updateDoc(sessionRef, { raisedHands: newHands });
      }
    }
  }

  async lowerHand(classId: string, userId: string): Promise<void> {
    const sessionRef = doc(db, 'sessions', classId);
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const data = snap.data() as LiveSessionState;
      const newHands = data.raisedHands.filter(id => id !== userId);
      await updateDoc(sessionRef, { raisedHands: newHands });
    }
  }

  async allowSpeaker(classId: string, userId: string): Promise<void> {
     const sessionRef = doc(db, 'sessions', classId);
     const snap = await getDoc(sessionRef);
     if (snap.exists()) {
       const data = snap.data() as LiveSessionState;
       const newSpeakers = [...data.activeSpeakers, userId];
       const newHands = data.raisedHands.filter(id => id !== userId);
       await updateDoc(sessionRef, { activeSpeakers: newSpeakers, raisedHands: newHands });
     }
  }

  // --- WHITEBOARD REALTIME ---
  
  async sendWhiteboardPath(classId: string, path: WhiteboardPath): Promise<void> {
    // Add to a subcollection for high frequency updates
    await setDoc(doc(db, `classes/${classId}/whiteboard`, path.id), path);
  }

  subscribeToWhiteboard(classId: string, callback: (paths: WhiteboardPath[]) => void) {
    const q = query(collection(db, `classes/${classId}/whiteboard`), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const paths = snapshot.docs.map(d => d.data() as WhiteboardPath);
      callback(paths);
    });
  }

  async clearWhiteboard(classId: string): Promise<void> {
    const q = query(collection(db, `classes/${classId}/whiteboard`));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  }

  // --- VIDEOS & STORAGE ---

  async uploadVideo(classId: string, teacherId: string, title: string, file: File): Promise<Video> {
    const fileRef = ref(storage, `classes/${classId}/videos/${uuidv4()}_${file.name}`);
    const uploadTask = await uploadBytesResumable(fileRef, file);
    const downloadURL = await getDownloadURL(uploadTask.ref);

    const videoId = uuidv4();
    const newVideo: Video = {
      id: videoId,
      class_id: classId,
      teacher_id: teacherId,
      title,
      storage_url: downloadURL,
      duration: 0, // In production, use a Cloud Function to extract metadata
      uploaded_at: new Date().toISOString(),
      mime_type: file.type
    };

    await setDoc(doc(db, 'videos', videoId), newVideo);
    return newVideo;
  }

  async getVideos(classId: string): Promise<Video[]> {
    const q = query(collection(db, 'videos'), where('class_id', '==', classId), orderBy('uploaded_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Video);
  }

  // --- EXAMS & FORUMS ---
  
  async getExams(classId: string): Promise<Exam[]> {
    const q = query(collection(db, 'exams'), where('class_id', '==', classId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Exam);
  }

  async createExam(exam: Exam): Promise<Exam> {
    const id = uuidv4();
    const newExam = { ...exam, id, created_at: new Date().toISOString(), active: true };
    await setDoc(doc(db, 'exams', id), newExam);
    return newExam;
  }

  async getPosts(classId: string): Promise<ForumPost[]> {
    const q = query(collection(db, 'posts'), where('class_id', '==', classId), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ForumPost);
  }

  async createPost(post: Omit<ForumPost, 'id' | 'created_at'>): Promise<ForumPost> {
    const id = uuidv4();
    const newPost = { ...post, id, created_at: new Date().toISOString() };
    await setDoc(doc(db, 'posts', id), newPost);
    return newPost;
  }

  // --- STUDENT MANAGEMENT ---
  
  async createStudentAndEnroll(classId: string, name: string): Promise<{user: User, code: string}> {
    // 1. Generate Access Code (Password)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const email = `${code}@student.jexam.com`;

    // 2. Create Auth User
    const userCred = await createUserWithEmailAndPassword(auth, email, code);
    
    // 3. Create User Profile
    const newUser: User = {
      id: userCred.user.uid,
      role: UserRole.STUDENT,
      name,
      student_code: code,
      email
    };
    await setDoc(doc(db, 'users', newUser.id), newUser);

    // 4. Enroll
    await this.enrollStudent(classId, newUser.id);

    return { user: newUser, code };
  }

  async enrollStudent(classId: string, studentId: string): Promise<void> {
    const id = uuidv4();
    const enrollment: Enrollment = {
      id,
      class_id: classId,
      student_id: studentId,
      enrolled_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'enrollments', id), enrollment);
  }

  async getClassAnalytics(classId: string): Promise<StudentAnalytics[]> {
    // Real implementation would aggregreate data from 'submissions' and 'attendance' collections
    // For this deliverable, we mock the calculation based on real enrollments
    const q = query(collection(db, 'enrollments'), where('class_id', '==', classId));
    const enrollSnap = await getDocs(q);
    
    const stats: StudentAnalytics[] = [];
    
    for (const enrollDoc of enrollSnap.docs) {
      const enroll = enrollDoc.data() as Enrollment;
      const userDoc = await getDoc(doc(db, 'users', enroll.student_id));
      if (userDoc.exists()) {
         const user = userDoc.data() as User;
         // Mock score calculation for demo purposes
         stats.push({
           id: user.id,
           name: user.name,
           score: 85, 
           attendance: 90,
           submissions_count: 5
         });
      }
    }
    return stats;
  }
  
  async getUserById(userId: string): Promise<User | undefined> {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as User : undefined;
  }
}

export const api = new FirebaseService();
