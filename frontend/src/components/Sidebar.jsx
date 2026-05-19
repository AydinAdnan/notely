import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, FileText, Clock, Users, Globe, LogOut,
  FolderOpen, Pencil, Trash2, Check, X, Share2, Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useNotesStore from '../store/notesStore';
import useWorkspacesStore from '../store/workspacesStore';

// ── Share Workspace Modal ─────────────────────────────────────────────────────

const ShareWorkspaceModal = ({ workspace, onClose }) => {
  const { shareWorkspace } = useNotesStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setMsg(''); setError('');
    try {
      const res = await shareWorkspace(workspace.id, email.trim());
      setMsg(res.message || 'Workspace shared!');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to share workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neu-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border-neu border-neu-black shadow-neu-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Share2 size={16} /> Share "{workspace.name}"
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 font-medium mb-3">Shares all notes in this workspace with the user.</p>
          <form onSubmit={handleShare} className="flex gap-2">
            <input
              autoFocus
              type="email"
              className="input flex-1 !py-2 !text-sm"
              placeholder="user@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn btn-blue !py-2 !px-3 !text-sm disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Share'}
            </button>
          </form>
          {error && <p className="text-red-600 text-xs font-medium mt-2">{error}</p>}
          {msg && <p className="text-green-600 text-xs font-medium mt-2">{msg}</p>}
        </div>
      </div>
    </div>
  );
};

// ── WorkspaceItem ─────────────────────────────────────────────────────────────

const WorkspaceItem = ({ workspace, isActive, onSelect, onRename, onDelete, onShare }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commitRename = () => {
    if (name.trim() && name !== workspace.name) onRename(workspace.id, name.trim());
    setEditing(false);
  };

  return (
    <div
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer ${isActive ? 'bg-neu-black text-neu-white' : 'hover:bg-gray-200/60 text-gray-700'}`}
      onClick={() => !editing && onSelect(workspace.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <FolderOpen size={15} className={isActive ? 'text-neu-yellow shrink-0' : 'shrink-0 text-gray-500'} />

      {editing ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-gray-300 text-gray-900"
        />
      ) : (
        <span className="flex-1 text-sm font-medium truncate">{workspace.name}</span>
      )}

      {showActions && !editing && (
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onShare(workspace)}
            className={`p-0.5 rounded hover:bg-blue-100 ${isActive ? 'text-gray-300 hover:text-blue-400' : 'text-gray-400 hover:text-blue-600'}`}
            title="Share workspace"
          >
            <Share2 size={11} />
          </button>
          <button
            onClick={() => setEditing(true)}
            className={`p-0.5 rounded hover:bg-gray-300/60 ${isActive ? 'text-gray-300 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
            title="Rename"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(workspace.id)}
            className={`p-0.5 rounded hover:bg-red-100 ${isActive ? 'text-gray-300 hover:text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            title="Delete workspace"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

const Sidebar = ({ isMobileOpen, setMobileOpen }) => {
  const { logout } = useAuthStore();
  const { addNote, setActiveNote, setCurrentView, currentView, fetchSharedWithMe, fetchNotes } = useNotesStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces, createWorkspace, renameWorkspace, deleteWorkspace, setActiveWorkspace } = useWorkspacesStore();
  const navigate = useNavigate();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [sharingWorkspace, setSharingWorkspace] = useState(null);
  const newInputRef = useRef(null);

  useEffect(() => {
    // If prefetchDashboardData already populated workspaces, skip the redundant fetch.
    // We still need to handle the "no workspaces yet" case for brand-new users.
    const { workspaces: existing, isLoading } = useWorkspacesStore.getState();
    if (existing.length > 0 || isLoading) return;

    fetchWorkspaces().then((list) => {
      if (list.length === 0) {
        createWorkspace('My Workspace').then((ws) => {
          fetchNotes(ws.id);
        });
      } else {
        fetchNotes(list[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (isCreating && newInputRef.current) newInputRef.current.focus();
  }, [isCreating]);

  const closeMobile = () => { if (setMobileOpen) setMobileOpen(false); };

  const handleSelectWorkspace = (id) => {
    setActiveWorkspace(id);
    setCurrentView('workspace');
    fetchNotes(id);
    setActiveNote(null);
    navigate('/dashboard');
    closeMobile();
  };

  const handleNavTo = (view) => {
    setCurrentView(view);
    if (view !== 'workspace') {
      fetchNotes(); // fetch all notes, no workspace filter
    }
    navigate('/dashboard');
    closeMobile();
    if (view === 'shared') fetchSharedWithMe();
  };

  const handleAddNote = () => {
    addNote(currentView === 'workspace' ? activeWorkspaceId : null);
    closeMobile();
  };

  const handleCreateWorkspace = async () => {
    if (!newName.trim()) { setIsCreating(false); return; }
    const ws = await createWorkspace(newName.trim());
    setNewName('');
    setIsCreating(false);
    handleSelectWorkspace(ws.id);
  };

  const handleDeleteWorkspace = async (id) => {
    await deleteWorkspace(id);
    // If we deleted the active workspace, fetch all notes
    if (activeWorkspaceId === id) {
      setCurrentView('all');
      fetchNotes();
    }
  };

  const navBtn = (view, icon, label) => (
    <button
      onClick={() => handleNavTo(view)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-200/60 font-medium transition-colors text-sm ${currentView === view ? 'bg-gray-200/80 text-gray-900' : 'text-gray-600'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {sharingWorkspace && (
        <ShareWorkspaceModal workspace={sharingWorkspace} onClose={() => setSharingWorkspace(null)} />
      )}
    <div className={`w-56 bg-[#f9f9f8] flex flex-col h-full shrink-0 border-r border-gray-200 text-sm fixed md:relative z-50 transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

      {/* Logo */}
      <div className="p-5 pb-3">
        <Link to="/dashboard" onClick={() => { setActiveNote(null); setCurrentView('all'); closeMobile(); }} className="inline-block">
          <h1 className="text-xl font-display font-bold text-gray-900 hover:text-gray-600 transition-colors">NoteZap</h1>
        </Link>
      </div>

      {/* New Note */}
      <div className="px-4 pb-3">
        <button
          onClick={handleAddNote}
          className="btn btn-white w-full flex items-center justify-center gap-2 !py-2 !text-sm"
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Workspaces */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Workspaces</span>
            <button
              onClick={() => setIsCreating(true)}
              className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
              title="New workspace"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="space-y-0.5">
            {workspaces.map((ws) => (
              <WorkspaceItem
                key={ws.id}
                workspace={ws}
                isActive={activeWorkspaceId === ws.id && currentView === 'workspace'}
                onSelect={handleSelectWorkspace}
                onRename={renameWorkspace}
                onDelete={handleDeleteWorkspace}
                onShare={(ws) => setSharingWorkspace(ws)}
              />
            ))}

            {isCreating && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 rounded-md">
                <FolderOpen size={15} className="text-gray-500 shrink-0" />
                <input
                  ref={newInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace();
                    if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
                  }}
                  placeholder="Workspace name…"
                  className="flex-1 text-sm font-medium bg-transparent outline-none"
                />
                <button onClick={handleCreateWorkspace} className="p-0.5 text-green-600 hover:text-green-700"><Check size={13} /></button>
                <button onClick={() => { setIsCreating(false); setNewName(''); }} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={13} /></button>
              </div>
            )}

            {workspaces.length === 0 && !isCreating && (
              <p className="px-3 py-2 text-xs text-gray-400">No workspaces yet</p>
            )}
          </div>
        </div>

        {/* Views */}
        <div>
          <div className="px-1 mb-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Views</span>
          </div>
          <div className="space-y-0.5">
            {navBtn('all', <FileText size={16} />, 'All Notes')}
            {navBtn('recent', <Clock size={16} />, 'Recent')}
            {navBtn('shared', <Users size={16} />, 'Shared with me')}
            {navBtn('public', <Globe size={16} />, 'Public Links')}
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200/60">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-600 font-medium hover:text-red-600 w-full px-3 py-2 rounded-md hover:bg-red-50 transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
