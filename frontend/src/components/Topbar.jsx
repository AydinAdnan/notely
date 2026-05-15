import React, { useState, useEffect } from 'react';
import {
  Search, Share2, History, ArrowLeft, Menu, X, Copy, Check,
  Globe, UserPlus, Trash2, Loader2, RotateCcw, Link as LinkIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useNotesStore from '../store/notesStore';

// ── Search Modal ──────────────────────────────────────────────────────────────

const SearchModal = ({ onClose }) => {
  const { searchNotes, setActiveNote } = useNotesStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchNotes(q)); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 bg-neu-black/40 z-50 flex items-start justify-center pt-24 p-4" onClick={onClose}>
      <div className="bg-neu-white border-neu border-neu-black shadow-neu-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <Search size={18} className="text-gray-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search notes..."
            className="flex-1 outline-none font-medium text-gray-800"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && <div className="p-4 text-center text-gray-400"><Loader2 size={18} className="animate-spin mx-auto" /></div>}
          {!loading && results.length === 0 && q.trim() && (
            <p className="p-4 text-gray-400 text-sm font-medium text-center">No results for "{q}"</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => { setActiveNote(r.id); onClose(); }}
              className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <p className="font-bold text-gray-900 text-sm">{r.title || 'Untitled'}</p>
              <p className="text-gray-500 text-xs mt-1 truncate">{r.content?.replace(/<[^>]+>/g, '') || 'Empty note'}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Share Modal ───────────────────────────────────────────────────────────────

const ShareModal = ({ noteId, onClose }) => {
  const { shareNote, getNoteShares, revokeShare, generatePublicLink, deletePublicLink, notes } = useNotesStore();
  const note = notes.find((n) => n.id === noteId);
  const [email, setEmail] = useState('');
  const [shares, setShares] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getNoteShares(noteId).then(setShares).catch(() => {});
  }, [noteId]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSharing(true); setError(''); setMsg('');
    try {
      await shareNote(noteId, email);
      setMsg(`Shared with ${email}`);
      setEmail('');
      const updated = await getNoteShares(noteId);
      setShares(updated);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to share');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevoke = async (userId) => {
    try {
      await revokeShare(noteId, userId);
      setShares((s) => s.filter((sh) => sh.shared_with.id !== userId));
    } catch {}
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try { await generatePublicLink(noteId); }
    finally { setIsGenerating(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${note?.publicToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-neu-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neu-white border-neu border-neu-black shadow-neu-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b-neu border-neu-black">
          <h2 className="font-display font-bold text-xl flex items-center gap-2"><Share2 size={18} /> Share Note</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Share by email */}
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2"><UserPlus size={14} /> Share with someone</h3>
            <form onSubmit={handleShare} className="flex gap-2">
              <input
                type="email"
                className="input flex-1 !py-2 !text-sm"
                placeholder="user@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" disabled={isSharing} className="btn btn-blue !py-2 !px-4 !text-sm disabled:opacity-50">
                {isSharing ? <Loader2 size={14} className="animate-spin" /> : 'Share'}
              </button>
            </form>
            {error && <p className="text-red-600 text-xs font-medium mt-1">{error}</p>}
            {msg && <p className="text-green-600 text-xs font-medium mt-1">{msg}</p>}
          </div>

          {/* Shared with list */}
          {shares.length > 0 && (
            <div>
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">Shared with</h3>
              <div className="space-y-1">
                {shares.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">{s.shared_with.email}</span>
                    <button onClick={() => handleRevoke(s.shared_with.id)} className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public link */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2"><Globe size={14} /> Public link</h3>
            {note?.publicToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded">
                  <LinkIcon size={14} className="text-gray-400 shrink-0" />
                  <span className="text-xs font-mono text-gray-600 truncate flex-1">
                    {window.location.origin}/share/{note.publicToken}
                  </span>
                  <button onClick={handleCopy} className="shrink-0">
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
                  </button>
                </div>
                <button onClick={() => deletePublicLink(noteId)} className="text-xs text-red-500 hover:underline font-medium">
                  Remove public link
                </button>
              </div>
            ) : (
              <button onClick={handleGenerateLink} disabled={isGenerating} className="btn btn-white !py-2 !text-sm flex items-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                Generate public link
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── History Modal ─────────────────────────────────────────────────────────────

const HistoryModal = ({ noteId, onClose }) => {
  const { getNoteHistory, restoreVersion } = useNotesStore();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    getNoteHistory(noteId)
      .then(setVersions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [noteId]);

  const formatDate = (iso) => new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handleRestore = async (versionId) => {
    setRestoring(versionId);
    try {
      await restoreVersion(noteId, versionId);
      onClose();
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-neu-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neu-white border-neu border-neu-black shadow-neu-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b-neu border-neu-black">
          <h2 className="font-display font-bold text-xl flex items-center gap-2"><History size={18} /> Version History</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>}
          {!loading && versions.length === 0 && (
            <p className="p-8 text-center text-gray-400 text-sm font-medium">No history yet. Versions are saved when you edit content.</p>
          )}
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div>
                <p className="font-bold text-sm text-gray-800">{v.title || 'Untitled'}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{formatDate(v.created_at)}</p>
              </div>
              <button
                onClick={() => handleRestore(v.id)}
                disabled={restoring === v.id}
                className="btn !bg-neu-cyan !py-1.5 !px-3 !text-xs flex items-center gap-1 disabled:opacity-50"
              >
                {restoring === v.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Topbar ────────────────────────────────────────────────────────────────────

const Topbar = ({ onMenuClick }) => {
  const { activeNoteId, setActiveNote } = useNotesStore();
  const [showSearch, setShowSearch] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const location = useLocation();
  const isProfile = location.pathname === '/profile';

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowShare(false);
        setShowHistory(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showShare && activeNoteId && <ShareModal noteId={activeNoteId} onClose={() => setShowShare(false)} />}
      {showHistory && activeNoteId && <HistoryModal noteId={activeNoteId} onClose={() => setShowHistory(false)} />}

      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-md">
            <Menu size={20} />
          </button>

          {activeNoteId ? (
            <button
              onClick={() => setActiveNote(null)}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : !isProfile && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium w-48 lg:w-64 justify-start text-gray-500 rounded-md"
              >
                <Search size={16} />
                <span>Search notes... (Ctrl+K)</span>
              </button>
              <button onClick={() => setShowSearch(true)} className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md">
                <Search size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {activeNoteId && (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowShare(true)}
                className="btn btn-green !px-2 sm:!px-3 !py-1.5 !text-sm flex items-center gap-1 sm:gap-2"
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="btn !bg-neu-white !px-2 sm:!px-3 !py-1.5 flex items-center gap-1 sm:gap-2 border-neu border-neu-black shadow-neu-sm hover:bg-neu-bg-warm !text-sm"
              >
                <History size={16} />
                <span className="hidden sm:inline">History</span>
              </button>
            </div>
          )}
          {activeNoteId && <div className="w-px h-6 bg-gray-300 mx-1" />}
          <Link to="/profile" className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-gray-200 transition-all">
            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent" alt="Avatar" className="w-full h-full object-cover" />
          </Link>
        </div>
      </div>
    </>
  );
};

export default Topbar;
