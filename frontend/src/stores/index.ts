import { create } from 'zustand';
import { authApi } from '../api/client';
import api from '../api/client';

interface User {
  id: number;
  email: string;
  nickname: string;
  avatar: string;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, code: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: async (email, password) => {
    const { data } = await authApi.login({ email, password, remember_me: true });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    // Fetch user info after setting token
    const me = await api.get('/auth/me');
    set({ user: me.data, isAuthenticated: true });
  },

  register: async (email, code, password, nickname) => {
    const { data } = await authApi.register({ email, code, password, nickname });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    const me = await api.get('/auth/me');
    set({ user: me.data, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));

interface ThemeState {
  theme: 'dark' | 'light';
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = localStorage.getItem('mskt_theme') as 'dark' | 'light' | null;
  const initial = stored || 'dark';
  if (initial === 'light') document.documentElement.classList.add('light');
  return {
    theme: initial,
    toggle: () => set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('mskt_theme', next);
      if (next === 'light') document.documentElement.classList.add('light');
      else document.documentElement.classList.remove('light');
      return { theme: next };
    }),
  };
});

interface Toast {
  id: number;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string) => void;
}

let toastId = 0;
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2500);
  },
}));
