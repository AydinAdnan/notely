import { create } from 'zustand';
import api from '../lib/api';

const COLORS = ['bg-neu-yellow', 'bg-neu-pink', 'bg-neu-cyan', 'bg-neu-green', 'bg-neu-purple'];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

function normalize(n) {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    color: n.color,
    isPinned: n.is_pinned,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
    publicToken: n.public_token || null,
  };
}

const useNotesStore = create((set, get) => ({
  notes: [],
  sharedWithMe: [],
  activeNoteId: null,
  currentView: 'all', // 'all' | 'shared' | 'public'
  isLoading: false,
  isSaving: false,
  error: null,

  // ── Fetch ─────────────────────────────────────────────────────────────────

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/notes', { params: { page_size: 100 } });
      set({ notes: res.data.notes.map(normalize), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSharedWithMe: async () => {
    try {
      const res = await api.get('/shared-with-me');
      set({ sharedWithMe: res.data });
    } catch {}
  },

  // ── Navigation ────────────────────────────────────────────────────────────

  setActiveNote: (id) => set({ activeNoteId: id }),
  setCurrentView: (view) => set({ currentView: view, activeNoteId: null }),

  // ── CRUD ──────────────────────────────────────────────────────────────────

  addNote: async () => {
    const optimistic = {
      id: `temp-${Date.now()}`,
      title: 'Untitled Note',
      content: '',
      color: randomColor(),
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publicToken: null,
    };
    set((s) => ({ notes: [optimistic, ...s.notes], activeNoteId: optimistic.id }));
    try {
      const res = await api.post('/notes', {
        title: optimistic.title,
        content: optimistic.content,
        color: optimistic.color,
      });
      const real = normalize(res.data);
      set((s) => ({
        notes: s.notes.map((n) => (n.id === optimistic.id ? real : n)),
        activeNoteId: real.id,
      }));
    } catch {
      set((s) => ({ notes: s.notes.filter((n) => n.id !== optimistic.id), activeNoteId: null }));
    }
  },

  updateNote: async (id, updates) => {
    // Optimistic
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      ),
    }));
    try {
      set({ isSaving: true });
      const body = {};
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.content !== undefined) body.content = updates.content;
      if (updates.color !== undefined) body.color = updates.color;
      if (updates.isPinned !== undefined) body.is_pinned = updates.isPinned;
      const res = await api.put(`/notes/${id}`, body);
      const updated = normalize(res.data);
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? updated : n)),
        isSaving: false,
      }));
    } catch {
      set({ isSaving: false });
    }
  },

  deleteNote: async (id) => {
    set((s) => {
      const remaining = s.notes.filter((n) => n.id !== id);
      return {
        notes: remaining,
        activeNoteId:
          s.activeNoteId === id
            ? remaining.length > 0 ? remaining[0].id : null
            : s.activeNoteId,
      };
    });
    try {
      await api.delete(`/notes/${id}`);
    } catch {}
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().updateNote(id, { isPinned: !note.isPinned });
  },

  // ── Sharing ───────────────────────────────────────────────────────────────

  shareNote: async (noteId, email) => {
    const res = await api.post(`/notes/${noteId}/share`, { email });
    return res.data;
  },

  getNoteShares: async (noteId) => {
    const res = await api.get(`/notes/${noteId}/shares`);
    return res.data;
  },

  revokeShare: async (noteId, userId) => {
    await api.delete(`/notes/${noteId}/share/${userId}`);
  },

  // ── Public links ──────────────────────────────────────────────────────────

  generatePublicLink: async (noteId) => {
    const res = await api.post(`/notes/${noteId}/generate-link`);
    const token = res.data.token;
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, publicToken: token } : n)),
    }));
    return token;
  },

  deletePublicLink: async (noteId) => {
    await api.delete(`/notes/${noteId}/generate-link`);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, publicToken: null } : n)),
    }));
  },

  // ── History ───────────────────────────────────────────────────────────────

  getNoteHistory: async (noteId) => {
    const res = await api.get(`/notes/${noteId}/history`);
    return res.data;
  },

  restoreVersion: async (noteId, versionId) => {
    const res = await api.post(`/notes/${noteId}/restore/${versionId}`);
    const updated = normalize(res.data);
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? updated : n)),
    }));
    return updated;
  },

  // ── AI rewrite ────────────────────────────────────────────────────────────

  rewriteText: async (text, mode, model = 'meta/llama-3.1-8b-instruct') => {
    const res = await api.post('/ai/rewrite', { text, mode, model });
    return res.data.result;
  },

  // ── Search ────────────────────────────────────────────────────────────────

  searchNotes: async (q) => {
    const res = await api.get('/search', { params: { q } });
    return res.data.results;
  },
}));

export default useNotesStore;
