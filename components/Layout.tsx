import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, BookOpen, BarChart2, Zap, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-100">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
             <Zap className="text-white fill-white" size={16} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">JEXAM</h1>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">{user.role} Access</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2">
          <button
            onClick={() => onTabChange('classes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'classes' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <BookOpen size={18} />
            <span className="font-medium text-sm">Classes</span>
          </button>
          
          {user.role === UserRole.TEACHER && (
             <button
             onClick={() => onTabChange('analytics')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-purple-900/20 text-purple-400 border border-purple-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
           >
             <BarChart2 size={18} />
             <span className="font-medium text-sm">Analytics</span>
           </button>
          )}

          <button
            onClick={() => onTabChange('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <UserIcon size={18} />
            <span className="font-medium text-sm">Profile</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 relative z-10 overflow-y-auto h-screen">
         <div className="max-w-7xl mx-auto">
             {children}
         </div>
      </main>
    </div>
  );
};
