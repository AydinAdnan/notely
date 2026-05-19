import { create } from 'zustand';
import api from '../lib/api';

const WORKSPACES_TTL = 5 * 60_000; // 5 minutes

const useWorkspacesStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,
  _fetchedAt: null,

  fetchWorkspaces: async () => {
    const lastFetch = get()._fetchedAt;

    // Cache hit — return the already-loaded list immediately
    if (lastFetch && Date.now() - lastFetch < WORKSPACES_TTL) {
      return get().workspaces;
    }

    set({ isLoading: true });
    try {
      const res = await api.get('/workspaces');
      const list = res.data;
      set({ workspaces: list, isLoading: false, _fetchedAt: Date.now() });
      if (list.length > 0 && !get().activeWorkspaceId) {
        set({ activeWorkspaceId: list[0].id });
      }
      return list;
    } catch {
      set({ isLoading: false });
      return [];
    }
  },

  createWorkspace: async (name) => {
    const res = await api.post('/workspaces', { name });
    set((s) => ({
      workspaces: [...s.workspaces, res.data],
      activeWorkspaceId: res.data.id,
      _fetchedAt: null, // invalidate so next fetch is fresh
    }));
    return res.data;
  },

  renameWorkspace: async (id, name) => {
    const res = await api.patch(`/workspaces/${id}`, { name });
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? res.data : w)),
      _fetchedAt: null,
    }));
  },

  deleteWorkspace: async (id) => {
    await api.delete(`/workspaces/${id}`);
    set((s) => {
      const remaining = s.workspaces.filter((w) => w.id !== id);
      return {
        workspaces: remaining,
        _fetchedAt: null,
        activeWorkspaceId:
          s.activeWorkspaceId === id
            ? remaining.length > 0 ? remaining[0].id : null
            : s.activeWorkspaceId,
      };
    });
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
}));

export default useWorkspacesStore;
