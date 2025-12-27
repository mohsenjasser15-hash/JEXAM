import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { Zap, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form States
  const [studentCode, setStudentCode] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // For student, we pass code as password and assume email logic in service
      const user = await api.login(studentCode, studentCode, UserRole.STUDENT);
      onLogin(user);
    } catch (err: any) {
      console.error(err);
      setError('Invalid Access Code or network error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await api.login(teacherEmail, teacherPassword, UserRole.TEACHER);
      onLogin(user);
    } catch (err: any) {
      console.error(err);
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/20">
              <Zap className="text-white" size={24} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome to JExam</h1>
          <p className="text-slate-400 text-center mb-8 text-sm">Advanced Learning Management Platform</p>

          <div className="flex bg-slate-950 p-1 rounded-lg mb-8">
            <button 
              onClick={() => { setMode('student'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'student' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Student
            </button>
            <button 
              onClick={() => { setMode('teacher'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'teacher' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Teacher
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          {mode === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Access Code</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 text-slate-600" size={18} />
                  <input
                    type="text"
                    value={studentCode}
                    onChange={e => setStudentCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors font-mono"
                    placeholder="ENTER-CODE"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Login as Student'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 text-slate-600" size={18} />
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={e => setTeacherEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    placeholder="teacher@school.edu"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 text-slate-600" size={18} />
                  <input
                    type="password"
                    value={teacherPassword}
                    onChange={e => setTeacherPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Access Dashboard'}
              </button>
            </form>
          )}
        </div>
        <div className="bg-slate-950 p-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-600">Secure Education Environment v2.0</p>
        </div>
      </div>
    </div>
  );
};