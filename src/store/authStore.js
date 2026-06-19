import { create } from 'zustand';
import * as authApi from '../api/auth';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: true,
  error: null,

  loadUser: async () => {
    try {
      set({ loading: true });
      const { data } = await authApi.getMe();
      set({ user: data.user, token: data.token, loading: false, error: null });
    } catch {
      set({ user: null, token: null, loading: false, error: null });
    }
  },

  register: async (formData) => {
    try {
      set({ loading: true, error: null });
      const { data } = await authApi.register(formData);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      set({ error: msg, loading: false });
      return false;
    }
  },

  login: async (formData) => {
    try {
      set({ loading: true, error: null });
      const { data } = await authApi.login(formData);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ error: msg, loading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
      set({ user: null, token: null, loading: false });
    } catch {
      set({ user: null, token: null, loading: false });
    }
  },

  getToken: () => {
    return get().token;
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;