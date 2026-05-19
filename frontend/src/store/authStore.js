import { create } from 'zustand';
import api from '../lib/api';

// Lazy imports to avoid circular deps — resolved at call time
const getWorkspacesStore = () => import('./workspacesStore').then((m) => m.default.getState());
const getNotesStore = () => import('./notesStore').then((m) => m.default.getState());

async function prefetchDashboardData() {
  try {
    const [workspacesStore, notesStore] = await Promise.all([
      getWorkspacesStore(),
      getNotesStore(),
    ]);
    // Fetch workspaces first so we can pass the first workspace ID to fetchNotes
    const workspaceList = await workspacesStore.fetchWorkspaces();
    const firstWorkspaceId = workspaceList?.[0]?.id ?? null;
    // Fetch notes + shared-with-me in parallel
    await Promise.all([
      notesStore.fetchNotes(firstWorkspaceId),
      notesStore.fetchSharedWithMe(),
    ]);
  } catch {
    // Non-critical — dashboard will retry on its own
  }
}

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  init: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data, isAuthenticated: true, isInitialized: true });
      // Start pre-fetching dashboard data immediately (don't await — fire and forget)
      prefetchDashboardData();
    } catch {
      localStorage.removeItem('token');
      set({ isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.access_token);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      // Pre-fetch on fresh login too
      prefetchDashboardData();
      return true;
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Login failed', isLoading: false });
      return false;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', { email, password, name });
      localStorage.setItem('token', res.data.access_token);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      prefetchDashboardData();
      return true;
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Registration failed', isLoading: false });
      return false;
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await api.patch('/auth/me', data);
      set({ user: res.data });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false, error: null });
  },
}));

export default useAuthStore;
