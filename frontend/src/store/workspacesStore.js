import { create } from 'zustand';
import api from '../lib/api';

const useWorkspacesStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isLoading: false,

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/workspaces');
      const list = res.data;
      set({ workspaces: list, isLoading: false });
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
    set((s) => ({ workspaces: [...s.workspaces, res.data], activeWorkspaceId: res.data.id }));
    return res.data;
  },

  renameWorkspace: async (id, name) => {
    const res = await api.patch(`/workspaces/${id}`, { name });
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? res.data : w)),
    }));
  },

  deleteWorkspace: async (id) => {
    await api.delete(`/workspaces/${id}`);
    set((s) => {
      const remaining = s.workspaces.filter((w) => w.id !== id);
      return {
        workspaces: remaining,
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
