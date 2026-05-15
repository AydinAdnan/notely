import React, { useState } from 'react';
import { Plus, FileText, Clock, Users, Globe, LogOut, ChevronDown, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useNotesStore from '../store/notesStore';

const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuthStore();
  const { addNote, setActiveNote, setCurrentView, currentView, fetchSharedWithMe } = useNotesStore();
  const navigate = useNavigate();

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const handleLogout = () => logout();
  const closeMobile = () => { if (setMobileOpen) setMobileOpen(false); };

  const navTo = (view) => {
    setCurrentView(view);
    navigate('/dashboard');
    closeMobile();
    if (view === 'shared') fetchSharedWithMe();
  };

  return (
    <div className={`w-56 bg-[#f9f9f8] flex flex-col h-full shrink-0 border-r border-gray-200 text-sm fixed md:relative z-50 transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

      {/* App Logo */}
      <div className="p-5 pb-0">
        <Link to="/dashboard" onClick={() => { setActiveNote(null); setCurrentView('all'); closeMobile(); }} className="inline-block">
          <h1 className="text-xl font-display font-bold text-gray-900 hover:text-gray-600 transition-colors">Notes.app</h1>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-3 relative mt-1">
        <button
          onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-gray-200/60 rounded-md transition-colors text-left"
        >
          <div>
            <h1 className="font-semibold text-gray-800 flex items-center gap-2">
              <div className="w-5 h-5 bg-neu-black text-neu-white rounded flex items-center justify-center text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="truncate w-32">{user?.name || 'My Workspace'}</span>
            </h1>
          </div>
          <ChevronDown size={14} className="text-gray-500" />
        </button>

        {isWorkspaceOpen && (
          <div className="absolute top-full left-4 right-4 bg-white border border-gray-200 shadow-neu-sm rounded-lg py-2 z-50 mt-1">
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {user?.email}
            </div>
            <button
              onClick={() => { setIsWorkspaceOpen(false); navigate('/profile'); closeMobile(); }}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700"
            >
              Edit Profile <Check size={14} className={user ? 'opacity-100' : 'opacity-0'} />
            </button>
          </div>
        )}
      </div>

      <div className="p-4 pt-2">
        <button
          onClick={() => { addNote(); closeMobile(); }}
          className="btn btn-white w-full flex items-center justify-center gap-2 mb-6"
        >
          <Plus size={20} />
          <span>New Note</span>
        </button>

        <nav className="space-y-1">
          <div className="font-semibold text-xs text-gray-400 mb-2 mt-4 pl-3 uppercase tracking-wider">My Notes</div>
          <button
            onClick={() => navTo('all')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200/60 font-medium transition-colors ${currentView === 'all' ? 'bg-gray-200/80 text-gray-900' : 'text-gray-700'}`}
          >
            <FileText size={18} />
            <span>All Notes</span>
          </button>
          <button
            onClick={() => navTo('recent')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200/60 font-medium transition-colors ${currentView === 'recent' ? 'bg-gray-200/80 text-gray-900' : 'text-gray-700'}`}
          >
            <Clock size={18} />
            <span>Recent</span>
          </button>

          <div className="font-semibold text-xs text-gray-400 mb-2 mt-6 pl-3 uppercase tracking-wider">Shared</div>
          <button
            onClick={() => navTo('shared')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200/60 font-medium transition-colors ${currentView === 'shared' ? 'bg-gray-200/80 text-gray-900' : 'text-gray-700'}`}
          >
            <Users size={18} />
            <span>Shared with me</span>
          </button>
          <button
            onClick={() => navTo('public')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200/60 font-medium transition-colors ${currentView === 'public' ? 'bg-gray-200/80 text-gray-900' : 'text-gray-700'}`}
          >
            <Globe size={18} />
            <span>Public Links</span>
          </button>
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-gray-200/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-600 font-medium hover:text-red-600 w-full px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
