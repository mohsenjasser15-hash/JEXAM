import React, { useState, useEffect, useRef } from 'react';
import { User, ClassModel, Video, Exam, ForumPost, UserRole, Question, StudentAnalytics, StreamMode, LiveSessionState } from '../types';
import { api } from '../services/mockData';
import { Whiteboard } from './Whiteboard';
import { Video as VideoIcon, FileText, Upload, Plus, MonitorPlay, Send, Clock, PlayCircle, Users, Shield, Copy, Check, Hand, Mic, MicOff, Camera, ScreenShare, Square, Smartphone, Maximize, Minimize, Image } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ClassDetailProps {
  user: User;
  classModel: ClassModel;
  onBack: () => void;
}

export const ClassDetail: React.FC<ClassDetailProps> = ({ user, classModel, onBack }) => {
  const [activeTab, setActiveTab] = useState<'stream' | 'videos' | 'exams' | 'forum' | 'students'>('stream');
  
  // Data State
  const [videos, setVideos] = useState<Video[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [analyticsData, setAnalyticsData] = useState<StudentAnalytics[]>([]);
  
  // Live Stream State
  const [isLive, setIsLive] = useState(classModel.isLive || false);
  const [liveState, setLiveState] = useState<LiveSessionState | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>(StreamMode.CAMERA);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [studentMicStream, setStudentMicStream] = useState<MediaStream | null>(null);
  const [raisedHandUsers, setRaisedHandUsers] = useState<User[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamContainerRef = useRef<HTMLDivElement>(null);
  
  const [error, setError] = useState<string>('');

  // Add Student State
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  
  // Forms
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  
  // Exam Creation State
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestionBody, setCurrentQuestionBody] = useState('');
  const [currentQuestionImage, setCurrentQuestionImage] = useState<File | null>(null);
  const [currentChoices, setCurrentChoices] = useState<string[]>(['', '', '', '']);
  const [currentCorrectAnswerIndex, setCurrentCorrectAnswerIndex] = useState<number>(0);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [classModel.id]);

  // Full Screen Change Listener
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  // POLLING LOOP for Live State (Simulates Socket)
  useEffect(() => {
    const interval = setInterval(async () => {
      const cls = await api.getClass(classModel.id);
      const sessionState = await api.getLiveSessionState(classModel.id);
      
      setLiveState(sessionState);

      // Resolve user objects for raised hands
      if (sessionState && sessionState.raisedHands.length > 0) {
        const users = await Promise.all(sessionState.raisedHands.map(id => api.getUserById(id)));
        setRaisedHandUsers(users.filter((u): u is User => !!u));
      } else {
        setRaisedHandUsers([]);
      }

      if (cls && cls.isLive !== isLive) {
        setIsLive(!!cls.isLive);
        if (cls.isLive) {
          showNotification('CLASS IS NOW LIVE!', 'red');
        } else {
          showNotification('Broadcast Ended', 'gray');
          setLocalStream(null); // Cleanup on end
        }
      }

      // If student allowed to speak, trigger mic check
      if (user.role === UserRole.STUDENT && sessionState?.activeSpeakers.includes(user.id)) {
        if (!studentMicStream) {
           try {
             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
             setStudentMicStream(stream);
             showNotification('MICROPHONE ACTIVATED BY TEACHER', 'green');
           } catch(e) {
             console.error(e);
             setError('Teacher allowed you to speak, but mic access failed.');
           }
        }
      } else if (user.role === UserRole.STUDENT && studentMicStream && !sessionState?.activeSpeakers.includes(user.id)) {
        // Teacher muted student
        studentMicStream.getTracks().forEach(t => t.stop());
        setStudentMicStream(null);
        showNotification('Microphone muted by teacher', 'gray');
      }

    }, 2000);
    return () => clearInterval(interval);
  }, [classModel.id, isLive, user.id, user.role, studentMicStream]);

  // Teacher Local Stream Management
  useEffect(() => {
    const manageStream = async () => {
       if (user.role !== UserRole.TEACHER || !isLive) return;
       
       // Stop previous tracks if changing modes (except audio maybe, but keeping it simple)
       if (localStream) {
          localStream.getTracks().forEach(t => t.stop());
       }

       try {
         let stream: MediaStream | null = null;
         
         if (streamMode === StreamMode.CAMERA) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
         } else if (streamMode === StreamMode.SCREEN) {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
         } 
         // Whiteboard doesn't need a stream here, handled by component

         setLocalStream(stream);
         
         // Sync mode to backend
         await api.updateStreamMode(classModel.id, streamMode);

       } catch (err) {
         console.error("Stream Error", err);
         setError("Failed to access media device. Please check permissions.");
         setStreamMode(StreamMode.CAMERA); // Fallback
       }
    };

    manageStream();
  }, [streamMode, isLive, user.role]);

  // Attach streams to video elements
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // For student listening to themselves (not common) or simplified audio handling
    // In a real app, we'd handle incoming remote streams.
  }, [studentMicStream]);


  const loadData = async () => {
    const [v, e, p, a] = await Promise.all([
      api.getVideos(classModel.id),
      api.getExams(classModel.id),
      api.getPosts(classModel.id),
      api.getClassAnalytics(classModel.id)
    ]);
    setVideos(v);
    setExams(e);
    setPosts(p);
    setAnalyticsData(a);
  };

  const showNotification = (msg: string, color: string) => {
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 bg-${color}-600 text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-in slide-in-from-right font-bold flex items-center gap-3`;
      notification.innerHTML = `<span>${msg}</span>`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 4000);
  };

  const handleToggleLive = async () => {
    setError('');
    if (isLive) {
      // Stop Everything
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
      await api.setClassLiveStatus(classModel.id, false);
      setIsLive(false);
    } else {
      // Start
      await api.setClassLiveStatus(classModel.id, true);
      setIsLive(true);
      setActiveTab('stream');
      setStreamMode(StreamMode.CAMERA);
    }
  };

  const toggleFullScreen = () => {
    if (!streamContainerRef.current) return;

    if (!document.fullscreenElement) {
      streamContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Student Interaction Handlers
  const handleRaiseHand = async () => {
    if (liveState?.raisedHands.includes(user.id)) {
      await api.lowerHand(classModel.id, user.id);
    } else {
      await api.raiseHand(classModel.id, user.id);
      showNotification('Hand Raised ✋', 'cyan');
    }
  };

  const handleAllowSpeaker = async (studentId: string) => {
    await api.allowSpeaker(classModel.id, studentId);
  };

  const handleMuteSpeaker = async (studentId: string) => {
    await api.muteSpeaker(classModel.id, studentId);
  };

  // Other Handlers (Video Upload, Exam, etc - kept same)
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName) return;
    const res = await api.createStudentAndEnroll(classModel.id, newStudentName);
    setGeneratedCode(res.code);
    loadData(); 
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoFile || !newVideoTitle) return;
    await api.uploadVideo(classModel.id, user.id, newVideoTitle, newVideoFile);
    setNewVideoFile(null);
    setNewVideoTitle('');
    loadData();
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle || !newPostBody) return;
    await api.createPost({
      class_id: classModel.id,
      author_id: user.id,
      author_name: user.name,
      title: newPostTitle,
      body: newPostBody
    });
    setNewPostTitle('');
    setNewPostBody('');
    loadData();
  };

  const handleAddQuestion = () => {
    if (!currentQuestionBody) {
      setError('Please enter the question text.');
      return;
    }
    
    // Check if at least one choice is empty (optional check, but good for validation)
    if (currentChoices.some(c => !c.trim())) {
      setError('Please fill in all 4 choices.');
      return;
    }

    const newQ: Question = {
      id: Math.random().toString(),
      exam_id: '',
      kind: 'mcq',
      body: currentQuestionBody,
      image_url: currentQuestionImage ? URL.createObjectURL(currentQuestionImage) : undefined,
      points: 1,
      choices: [...currentChoices],
      correct_answer: currentChoices[currentCorrectAnswerIndex]
    };
    setExamQuestions([...examQuestions, newQ]);
    
    // Reset Form
    setCurrentQuestionBody('');
    setCurrentQuestionImage(null);
    setCurrentChoices(['', '', '', '']);
    setCurrentCorrectAnswerIndex(0);
    setError('');
  };

  const handleSaveExam = async () => {
    if (!newExamTitle) return;
    await api.createExam({
      id: '',
      class_id: classModel.id,
      teacher_id: user.id,
      title: newExamTitle,
      description: 'New Exam',
      time_limit_minutes: 60,
      questions: examQuestions
    });
    setIsCreatingExam(false);
    setExamQuestions([]);
    setNewExamTitle('');
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 font-bold tracking-wide transition-colors">← DASHBOARD</button>
        <div className="flex gap-2">
           {user.role === UserRole.TEACHER && (
             <>
                <button 
                  onClick={() => setShowAddStudent(true)}
                  className="flex items-center gap-2 bg-slate-800 text-cyan-400 border border-slate-700 px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all uppercase tracking-wide"
                >
                  <Users size={16} /> Add Student
                </button>
                <button 
                  onClick={handleToggleLive}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${isLive ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  <MonitorPlay size={18} />
                  {isLive ? 'END STREAM' : 'GO LIVE'}
                </button>
             </>
           )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl text-red-200 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <Shield size={16} /> {error}
        </div>
      )}

      {/* Class Title Card */}
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl p-8 border border-slate-800 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/20 transition-all duration-700"></div>
        <h1 className="text-4xl font-bold text-white relative z-10">{classModel.title}</h1>
        <p className="text-slate-400 mt-2 relative z-10 max-w-2xl">{classModel.description}</p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {['stream', 'videos', 'exams', 'forum', 'students'].map(tab => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab as any)}
             className={`px-6 py-4 font-bold text-sm uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? 'border-cyan-500 text-cyan-400 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
           >
             {tab}
           </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="min-h-[500px]">
        {activeTab === 'stream' && (
          <div className="space-y-4 animate-in fade-in duration-500">
             {isLive ? (
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 {/* Left: Main Stream Area */}
                 <div className={`lg:col-span-3 space-y-4 ${isFullScreen ? 'fixed inset-0 z-50 bg-black flex items-center justify-center p-0' : ''}`}>
                    <div ref={streamContainerRef} className={`bg-black aspect-video rounded-2xl flex items-center justify-center relative overflow-hidden border border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.1)] ${isFullScreen ? 'w-full h-full rounded-none border-none' : ''}`}>
                      {/* LIVE Indicator */}
                      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 shadow-lg z-20">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                          LIVE
                      </div>
                      
                      {/* Full Screen Toggle */}
                      <button 
                         onClick={toggleFullScreen}
                         className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-lg text-white hover:bg-slate-800 z-30 transition-colors"
                         title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                      >
                         {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                      </button>

                      {/* MODE SWITCHER FOR TEACHER */}
                      {user.role === UserRole.TEACHER && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-900/80 backdrop-blur p-2 rounded-xl border border-slate-700 z-30">
                           <button onClick={() => setStreamMode(StreamMode.CAMERA)} className={`p-3 rounded-lg ${streamMode === StreamMode.CAMERA ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                              <Camera size={20} />
                           </button>
                           <button onClick={() => setStreamMode(StreamMode.SCREEN)} className={`p-3 rounded-lg ${streamMode === StreamMode.SCREEN ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                              <ScreenShare size={20} />
                           </button>
                           <button onClick={() => setStreamMode(StreamMode.WHITEBOARD)} className={`p-3 rounded-lg ${streamMode === StreamMode.WHITEBOARD ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                              <Square size={20} />
                           </button>
                        </div>
                      )}

                      {/* ACTUAL CONTENT RENDER */}
                      {user.role === UserRole.TEACHER ? (
                         // TEACHER VIEW
                         streamMode === StreamMode.WHITEBOARD ? (
                           <Whiteboard active={streamMode === StreamMode.WHITEBOARD} />
                         ) : (
                           <video 
                             ref={videoRef} 
                             autoPlay 
                             muted 
                             playsInline 
                             className="w-full h-full object-contain z-10" 
                           />
                         )
                      ) : (
                         // STUDENT VIEW (Simulating seeing what teacher sends)
                         liveState?.mode === StreamMode.WHITEBOARD ? (
                             // In a real app, this would be a canvas receiving drawing socket events.
                             // For this demo, we show a placeholder indicating whiteboard mode
                             <div className="text-center">
                                <Square size={64} className="mx-auto text-cyan-500 mb-4 animate-pulse" />
                                <h3 className="text-xl font-bold text-white">Interactive Whiteboard Active</h3>
                                <p className="text-slate-500">Teacher is drawing...</p>
                             </div>
                         ) : (
                             // Students would receive WebRTC stream here.
                             // We show a placeholder because we can't stream mock localStream to another browser instance without a server.
                             <div className="text-center z-10">
                                <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    {liveState?.mode === StreamMode.SCREEN ? <Smartphone size={40} className="text-red-500"/> : <Camera size={40} className="text-red-500" />}
                                </div>
                                <p className="text-red-400 font-mono text-sm tracking-widest uppercase">
                                  RECEIVING {liveState?.mode} STREAM
                                </p>
                             </div>
                         )
                      )}
                      
                      {/* Scanlines effect (only if not whiteboard, for that crisp look) */}
                      {streamMode !== StreamMode.WHITEBOARD && (
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_4px,6px_100%] pointer-events-none"></div>
                      )}
                    </div>

                    {/* Student Mic Status Bar */}
                    {user.role === UserRole.STUDENT && !isFullScreen && (
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${studentMicStream ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                               <Mic size={24} />
                            </div>
                            <div>
                               <p className="font-bold text-white text-sm">Microphone Status</p>
                               <p className="text-xs text-slate-500 font-mono">
                                 {studentMicStream ? 'TRANSMITTING AUDIO' : 'MUTED BY TEACHER'}
                               </p>
                            </div>
                         </div>
                         <button 
                           onClick={handleRaiseHand}
                           className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${liveState?.raisedHands.includes(user.id) ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                         >
                           <Hand size={18} />
                           {liveState?.raisedHands.includes(user.id) ? 'HAND RAISED' : 'RAISE HAND'}
                         </button>
                      </div>
                    )}
                 </div>

                 {/* Right: Interaction Panel (Chat/Students) - Hidden in Full Screen */}
                 {!isFullScreen && (
                 <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col h-[500px]">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Live Interaction</h3>
                    
                    {/* Active Speakers List */}
                    <div className="mb-4">
                       <h4 className="text-[10px] font-bold text-cyan-400 uppercase mb-2 flex items-center gap-2">
                         <Mic size={10} /> Speaking Now
                       </h4>
                       <div className="space-y-2">
                          {liveState?.activeSpeakers.length === 0 && <p className="text-xs text-slate-600 italic">No students speaking.</p>}
                          {/* In a real app, map activeSpeakers IDs to names. Mocking for visual if Teacher */}
                          {user.role === UserRole.TEACHER && liveState?.activeSpeakers.map(id => (
                            <div key={id} className="bg-green-900/20 border border-green-500/30 p-2 rounded flex justify-between items-center">
                               <span className="text-green-400 text-xs font-bold">Student {id.substring(0,4)}</span>
                               <button onClick={() => handleMuteSpeaker(id)} className="text-slate-400 hover:text-red-400"><MicOff size={14}/></button>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Raised Hands List (Teacher Only) */}
                    {user.role === UserRole.TEACHER && (
                      <div className="flex-1 overflow-y-auto">
                        <h4 className="text-[10px] font-bold text-yellow-400 uppercase mb-2 flex items-center gap-2">
                           <Hand size={10} /> Raised Hands ({raisedHandUsers.length})
                        </h4>
                        <div className="space-y-2">
                           {raisedHandUsers.map(u => (
                             <div key={u.id} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-slate-700 text-xs flex items-center justify-center font-bold text-white">{u.name.charAt(0)}</div>
                                   <span className="text-sm text-slate-300 font-bold">{u.name}</span>
                                </div>
                                <div className="flex gap-1">
                                   <button 
                                     onClick={() => handleAllowSpeaker(u.id)}
                                     className="p-1.5 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                                     title="Allow to speak"
                                   >
                                     <Mic size={14} />
                                   </button>
                                </div>
                             </div>
                           ))}
                           {raisedHandUsers.length === 0 && (
                             <div className="text-center py-8 text-slate-600 text-xs">
                               No hands raised.
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {/* Chat Placeholder */}
                    <div className="mt-auto pt-4 border-t border-slate-800">
                       <div className="h-32 bg-slate-950/50 rounded-lg p-2 overflow-y-auto mb-2 space-y-2">
                          <p className="text-xs text-slate-400"><span className="text-cyan-500 font-bold">System:</span> Welcome to the live session.</p>
                       </div>
                       <div className="flex gap-2">
                          <input className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" placeholder="Type message..." />
                          <button className="bg-slate-800 p-2 rounded text-cyan-400"><Send size={14}/></button>
                       </div>
                    </div>
                 </div>
                 )}
               </div>
             ) : (
               <div className="bg-slate-900/50 border border-slate-800 aspect-video rounded-2xl flex items-center justify-center flex-col text-slate-500">
                 <MonitorPlay size={48} className="mb-4 text-slate-700"/>
                 <p className="tracking-widest uppercase text-xs font-bold">Signal Offline</p>
                 <p className="text-xs mt-2">Waiting for teacher to start broadcast...</p>
               </div>
             )}
          </div>
        )}

        {/* --- OTHER TABS (Same as before) --- */}
        {activeTab === 'videos' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {user.role === UserRole.TEACHER && (
              <form onSubmit={handleUploadVideo} className="bg-slate-900/50 p-6 rounded-2xl border border-dashed border-slate-700 hover:border-cyan-500/50 transition-colors">
                <h3 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Upload size={16} /> Upload Module
                </h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1 font-mono">MODULE_TITLE</label>
                    <input 
                      type="text" 
                      value={newVideoTitle}
                      onChange={e => setNewVideoTitle(e.target.value)}
                      className="w-full rounded-lg border-slate-700 bg-slate-950 text-sm p-3 border text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                      placeholder="Enter title..."
                      required
                    />
                  </div>
                  <div className="flex-1">
                     <label className="block text-xs text-slate-500 mb-1 font-mono">SOURCE_FILE</label>
                     <input 
                       type="file" 
                       accept="video/*"
                       onChange={e => setNewVideoFile(e.target.files ? e.target.files[0] : null)}
                       className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-900/30 file:text-cyan-400 hover:file:bg-cyan-900/50"
                       required
                     />
                  </div>
                  <button type="submit" className="bg-cyan-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]">UPLOAD</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(video => (
                <div key={video.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group">
                  <div className="aspect-video bg-black relative">
                    <video src={video.storage_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" controls />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                    <PlayCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 w-12 h-12 group-hover:scale-110 transition-transform pointer-events-none" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">{video.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-mono">
                        <Clock size={12} />
                        <span>{new Date(video.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              {videos.length === 0 && <p className="text-slate-600 text-sm col-span-full text-center py-10 font-mono uppercase">No modules found in database.</p>}
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             {user.role === UserRole.TEACHER && !isCreatingExam && (
               <button 
                 onClick={() => setIsCreatingExam(true)}
                 className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
               >
                 <Plus size={16} /> INITIALIZE EXAM
               </button>
             )}

             {isCreatingExam && (
               <div className="bg-slate-900 p-6 rounded-xl border border-purple-500/30 shadow-lg space-y-6">
                 <div>
                   <h3 className="text-lg font-bold text-purple-400 uppercase tracking-widest mb-4">Exam Configurator</h3>
                   <input 
                     placeholder="EXAM DESIGNATION" 
                     value={newExamTitle}
                     onChange={e => setNewExamTitle(e.target.value)}
                     className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-purple-500 outline-none placeholder-slate-600"
                   />
                 </div>
                 
                 {/* Question List */}
                 <div className="space-y-4">
                   {examQuestions.map((q, i) => (
                     <div key={q.id} className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-sm space-y-3">
                       <div className="flex gap-3 items-start">
                           <span className="font-bold text-purple-500 font-mono text-lg">0{i+1}</span>
                           <div className="flex-1 space-y-2">
                               <p className="text-slate-200 font-medium text-base">{q.body}</p>
                               {q.image_url && (
                                   <div className="rounded-lg overflow-hidden border border-slate-700 w-fit">
                                       <img src={q.image_url} alt="Attachment" className="max-h-40 object-contain bg-black" />
                                   </div>
                               )}
                           </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2 pl-8">
                           {q.choices?.map((choice, idx) => (
                               <div key={idx} className={`p-2 rounded border flex items-center ${choice === q.correct_answer ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                                   <span className="font-bold mr-2 w-5">{String.fromCharCode(65+idx)}.</span>
                                   <span>{choice}</span>
                                   {choice === q.correct_answer && <Check size={14} className="ml-auto" />}
                               </div>
                           ))}
                       </div>
                     </div>
                   ))}
                 </div>

                 {/* New Question Form */}
                 <div className="bg-slate-950 p-5 rounded-xl border border-slate-700 space-y-4 relative">
                   <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-600 to-transparent rounded-l-xl"></div>
                   <h4 className="font-bold text-slate-400 text-sm uppercase flex items-center gap-2">
                     <Plus size={14} /> New Question Node
                   </h4>
                   
                   <textarea 
                     placeholder="Enter question text..." 
                     value={currentQuestionBody}
                     onChange={e => setCurrentQuestionBody(e.target.value)}
                     className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-purple-500 outline-none resize-none h-24 text-sm"
                   />

                   <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-purple-400 transition-colors bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                          <Image size={16}/> Attach Visual Asset
                          <input type="file" className="hidden" accept="image/*" onChange={e => setCurrentQuestionImage(e.target.files?.[0] || null)} />
                      </label>
                      {currentQuestionImage && <span className="text-xs text-purple-400 font-bold bg-purple-900/20 px-2 py-1 rounded border border-purple-900/50">{currentQuestionImage.name}</span>}
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentChoices.map((choice, index) => (
                          <div key={index} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                              <input 
                                  type="radio" 
                                  name="correctAnswer" 
                                  checked={currentCorrectAnswerIndex === index}
                                  onChange={() => setCurrentCorrectAnswerIndex(index)}
                                  className="w-4 h-4 accent-purple-500 cursor-pointer"
                              />
                              <span className="text-slate-500 font-bold font-mono">{String.fromCharCode(65+index)}</span>
                              <input
                                  placeholder={`Option ${index + 1}`}
                                  value={choice}
                                  onChange={(e) => {
                                      const newChoices = [...currentChoices];
                                      newChoices[index] = e.target.value;
                                      setCurrentChoices(newChoices);
                                  }}
                                  className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 placeholder-slate-600"
                              />
                          </div>
                      ))}
                   </div>
                   
                   <button onClick={handleAddQuestion} className="w-full bg-slate-800 text-slate-300 py-3 rounded-lg text-sm font-bold hover:bg-slate-700 hover:text-white border border-slate-700 transition-all">
                     ADD QUESTION NODE
                   </button>
                 </div>

                 <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                   <button onClick={() => setIsCreatingExam(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-white transition-colors">ABORT</button>
                   <button onClick={handleSaveExam} className="px-6 py-2 text-sm bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all">DEPLOY EXAM</button>
                 </div>
               </div>
             )}

             <div className="space-y-3">
               {exams.map(exam => (
                 <div key={exam.id} className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-purple-500/40 transition-all group">
                   <div className="flex items-center gap-5">
                     <div className="p-3 bg-purple-900/20 text-purple-400 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                       <FileText size={24} />
                     </div>
                     <div>
                       <h4 className="font-bold text-white text-lg">{exam.title}</h4>
                       <p className="text-xs text-slate-500 font-mono mt-1">{exam.questions?.length || 0} QUESTIONS • {exam.time_limit_minutes} MIN TIME LIMIT</p>
                     </div>
                   </div>
                   <button className="px-5 py-2.5 text-sm border border-slate-700 text-slate-300 rounded-lg hover:bg-purple-600 hover:text-white hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all font-bold">
                     {user.role === UserRole.TEACHER ? 'ANALYZE RESULTS' : 'BEGIN EXAM'}
                   </button>
                 </div>
               ))}
               {exams.length === 0 && !isCreatingExam && <p className="text-slate-600 text-sm text-center py-10 font-mono uppercase">No active assessments.</p>}
             </div>
          </div>
        )}

        {activeTab === 'forum' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <form onSubmit={handleCreatePost} className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg">
               <input
                 className="w-full text-lg font-bold placeholder-slate-600 bg-transparent border-none focus:ring-0 px-0 mb-2 text-white"
                 placeholder="TOPIC SUBJECT..."
                 value={newPostTitle}
                 onChange={e => setNewPostTitle(e.target.value)}
               />
               <textarea
                 className="w-full text-sm text-slate-300 placeholder-slate-600 bg-transparent border-none focus:ring-0 px-0 resize-none h-20"
                 placeholder="Enter transmission content..."
                 value={newPostBody}
                 onChange={e => setNewPostBody(e.target.value)}
               />
               <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-2">
                 <button type="button" className="text-slate-500 hover:text-cyan-400 transition-colors">
                   <Upload size={18} />
                 </button>
                 <button type="submit" className="bg-cyan-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-cyan-500 flex items-center gap-2">
                   <span>TRANSMIT</span>
                   <Send size={14} />
                 </button>
               </div>
             </form>

             <div className="space-y-4">
               {posts.map(post => (
                 <div key={post.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                   <div className="flex justify-between items-start mb-3">
                     <h4 className="font-bold text-white text-lg">{post.title}</h4>
                     <span className="text-xs text-slate-600 font-mono">{new Date(post.created_at).toLocaleDateString()}</span>
                   </div>
                   <p className="text-slate-300 text-sm mb-5 leading-relaxed">{post.body}</p>
                   <div className="flex items-center gap-3 text-xs text-slate-500">
                     <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-cyan-400 border border-slate-700">
                       {post.author_name.charAt(0)}
                     </div>
                     <span className="font-medium">{post.author_name}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'students' && user.role === UserRole.TEACHER && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
             <div className="p-6 border-b border-slate-800 flex justify-between items-center">
               <h3 className="font-bold text-white">PERFORMANCE METRICS</h3>
             </div>
             <div className="p-6">
                <div className="h-64 w-full">
                  {analyticsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#64748b" />
                        <YAxis axisLine={false} tickLine={false} stroke="#64748b" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                          cursor={{fill: '#1e293b'}} 
                        />
                        <Bar dataKey="score" fill="#a855f7" radius={[4, 4, 0, 0]} name="Exam Score" />
                        <Bar dataKey="attendance" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Attendance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 font-mono uppercase">
                      No student data available.
                    </div>
                  )}
                </div>
             </div>
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-950 text-slate-500 font-mono text-xs uppercase tracking-wider">
                 <tr>
                   <th className="px-6 py-4">Student ID</th>
                   <th className="px-6 py-4">Attendance</th>
                   <th className="px-6 py-4">Avg Score</th>
                   <th className="px-6 py-4">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {analyticsData.map((s, i) => (
                   <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                     <td className="px-6 py-4 font-bold text-white">{s.name}</td>
                     <td className="px-6 py-4 text-cyan-400">{s.attendance}%</td>
                     <td className="px-6 py-4 text-purple-400">{s.score}</td>
                     <td className="px-6 py-4"><span className="px-2 py-1 rounded text-[10px] bg-green-900/30 text-green-400 font-bold border border-green-900 uppercase tracking-wide">Active</span></td>
                   </tr>
                 ))}
                 {analyticsData.length === 0 && (
                   <tr>
                     <td colSpan={4} className="px-6 py-8 text-center text-slate-600 font-mono uppercase">
                       No students enrolled.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}
      </div>

      {/* ADD STUDENT MODAL */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] border border-slate-700 relative">
            <h3 className="text-xl font-bold mb-6 text-white uppercase tracking-wider flex items-center gap-2">
               <Users className="text-cyan-400" />
               Register Student
            </h3>
            {!generatedCode ? (
              <form onSubmit={handleAddStudent} className="space-y-5">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Student Name</label>
                   <input
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                    placeholder="Enter full name"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    required
                    autoFocus
                   />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddStudent(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] uppercase tracking-wide">Generate Code</button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-6 animate-in zoom-in duration-300">
                <div className="bg-slate-950 p-6 rounded-xl border border-green-500/30 shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]">
                  <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Login Code Generated</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-4xl font-mono font-bold text-white tracking-widest select-all">{generatedCode}</p>
                    <button onClick={() => navigator.clipboard.writeText(generatedCode)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"><Copy size={20}/></button>
                  </div>
                </div>
                <p className="text-sm text-slate-400">The student has been automatically enrolled in <span className="text-cyan-400 font-bold">{classModel.title}</span>. Share this code with them securely.</p>
                <button 
                  onClick={() => setShowAddStudent(false)}
                  className="w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 font-bold uppercase tracking-wide border border-slate-700 hover:border-white transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
