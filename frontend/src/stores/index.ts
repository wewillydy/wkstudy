import { create } from 'zustand';
import { authApi } from '../api/client';

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
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (email: string, code: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (email, password, rememberMe) => {
    const { data } = await authApi.login({ email, password, remember_me: rememberMe });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    set({ isAuthenticated: true });
    const me = await authApi.me();
    set({ user: me.data });
  },

  register: async (email, code, password, nickname) => {
    const { data } = await authApi.register({ email, code, password, nickname });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    set({ isAuthenticated: true });
    const me = await authApi.me();
    set({ user: me.data });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const { data } = await authApi.me();
      set({ user: data });
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
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
