import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { ClassDetail } from './components/ClassDetail';
import { api } from './services/api';
import { ClassModel, User, UserRole } from './types';
import { Plus, Terminal, Loader2 } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [activeTab, setActiveTab] = useState('classes');
  const [selectedClass, setSelectedClass] = useState<ClassModel | null>(null);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  
  // Forms
  const [newClassTitle, setNewClassTitle] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');

  // Persist Auth Session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Sync with Firestore profile
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
             // Fallback or specific error handling
             setUser(null);
          }
        } catch(e) {
          console.error("Auth sync error", e);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user]);

  const loadClasses = async () => {
    if (!user) return;
    try {
      const data = await api.getClasses(user.id, user.role);
      setClasses(data);
    } catch (e) {
      console.error("Failed to load classes", e);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newClassTitle) return;
    try {
      await api.createClass(user.id, newClassTitle, newClassDesc);
      setShowCreateClassModal(false);
      setNewClassTitle('');
      setNewClassDesc('');
      loadClasses();
    } catch (e) {
      alert("Failed to create class");
    }
  };

  if (loading) {
     return (
       <div className="min-h-screen bg-slate-950 flex items-center justify-center">
         <Loader2 className="text-cyan-500 animate-spin" size={48} />
       </div>
     );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  if (selectedClass) {
    return (
      <Layout user={user} onLogout={() => api.logout()} activeTab="class" onTabChange={() => setSelectedClass(null)}>
        <ClassDetail user={user} classModel={selectedClass} onBack={() => setSelectedClass(null)} />
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={() => api.logout()} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'classes' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white neon-text">
              {user.role === UserRole.TEACHER ? 'COMMAND CENTER' : 'ENROLLED COURSES'}
            </h2>
            {user.role === UserRole.TEACHER && (
              <div className="flex gap-3">
                 <button 
                  onClick={() => setShowCreateClassModal(true)}
                  className="flex items-center gap-2 bg-cyan-600 text-black px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all uppercase tracking-wide"
                 >
                   <Plus size={16} /> New Class
                 </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div 
                key={cls.id} 
                onClick={() => setSelectedClass(cls)}
                className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/50 transition-all cursor-pointer group overflow-hidden relative"
              >
                <div className="h-32 bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex flex-col justify-end relative">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                      <Terminal size={64} />
                   </div>
                   <h3 className="text-white text-2xl font-bold z-10 group-hover:text-cyan-400 transition-colors">{cls.title}</h3>
                   {cls.isLive && (
                     <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse">LIVE</div>
                   )}
                </div>
                <div className="p-6">
                  <p className="text-slate-400 text-sm line-clamp-2 h-10">{cls.description}</p>
                  <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500 font-mono uppercase tracking-wider">
                    <span>CODE: {cls.join_code}</span>
                    <span className="group-hover:text-cyan-400 font-bold transition-colors">ACCESS &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
                <div className="col-span-full text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                    <p className="text-slate-500 font-mono uppercase">System Empty. No classes detected.</p>
                </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
         <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-lg border border-slate-800 p-8 max-w-2xl animate-in slide-in-from-right duration-500">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px]">
                   <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xl font-bold text-white">
                      {user.name.charAt(0)}
                   </div>
               </div>
               <div>
                   <h2 className="text-2xl font-bold text-white">USER PROFILE</h2>
                   <p className="text-slate-500 text-sm font-mono uppercase">ID: {user.id}</p>
               </div>
            </div>
            
            <div className="space-y-6">
               <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                  <p className="text-lg font-medium text-white">{user.name}</p>
               </div>
               <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Clearance Level</label>
                  <span className={`inline-block mt-1 px-3 py-1 text-xs font-bold rounded border uppercase tracking-wide ${user.role === UserRole.TEACHER ? 'bg-purple-900/20 text-purple-400 border-purple-500/50' : 'bg-cyan-900/20 text-cyan-400 border-cyan-500/50'}`}>
                    {user.role}
                  </span>
               </div>
               {user.role === UserRole.STUDENT && (
                   <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Access Code (Password)</label>
                     <p className="text-xl font-mono text-cyan-400 tracking-wider">{user.student_code}</p>
                     <p className="text-xs text-slate-500 mt-2">Use this code as your password for login.</p>
                   </div>
               )}
            </div>
         </div>
      )}

      {/* CREATE CLASS MODAL */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] border border-slate-700 relative">
            <h3 className="text-xl font-bold mb-6 text-white uppercase tracking-wider">Initialize New Class</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder="Class Designation (e.g. Physics 101)"
                value={newClassTitle}
                onChange={e => setNewClassTitle(e.target.value)}
                required
              />
              <textarea
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none h-32 resize-none transition-colors"
                placeholder="Briefing / Description"
                value={newClassDesc}
                onChange={e => setNewClassDesc(e.target.value)}
                required
              />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateClassModal(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] uppercase tracking-wide">Initialize</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
