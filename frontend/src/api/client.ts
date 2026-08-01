import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401, refresh token
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authApi = {
  sendCode: (email: string, type: string) => api.post('/auth/send-code', { email, type }),
  register: (data: { email: string; code: string; password: string; nickname: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string; remember_me: boolean }) =>
    api.post('/auth/login', data),
  refresh: (refresh_token: string) => api.post('/auth/refresh', { refresh_token }),
  me: () => api.get('/auth/me'),
};

// Course APIs
export const courseApi = {
  list: (params: { page?: number; page_size?: number; grade?: string; subject?: string; keyword?: string }) =>
    api.get('/courses', { params }),
  today: () => api.get('/courses/today'),
  completed: () => api.get('/courses/completed'),
  getById: (id: number) => api.get(`/courses/${id}`),
  updateProgress: (id: number, data: { progress: number; watch_time: number }) =>
    api.put(`/courses/${id}/progress`, data),
  filters: () => api.get('/courses/filters'),
  create: (data: any) => api.post('/courses', data),
  update: (id: number, data: any) => api.put(`/courses/${id}`, data),
  delete: (id: number) => api.delete(`/courses/${id}`),
  addCourseware: (courseId: number, data: any) => api.post(`/courses/${courseId}/courseware`, data),
  deleteCourseware: (courseId: number, cwId: number) => api.delete(`/courses/${courseId}/courseware/${cwId}`),
};

// Mark APIs
export const markApi = {
  list: (courseId: number) => api.get(`/courses/${courseId}/marks`),
  create: (courseId: number, data: { mark_time: number; mark_type: string; label: string }) =>
    api.post(`/courses/${courseId}/marks`, data),
  update: (courseId: number, markId: number, data: any) =>
    api.put(`/courses/${courseId}/marks/${markId}`, data),
  delete: (courseId: number, markId: number) =>
    api.delete(`/courses/${courseId}/marks/${markId}`),
};

// Slogan APIs
export const sloganApi = {
  list: () => api.get('/slogans'),
  create: (data: any) => api.post('/slogans', data),
  update: (id: number, data: any) => api.put(`/slogans/${id}`, data),
  delete: (id: number) => api.delete(`/slogans/${id}`),
};

// Schedule APIs
export const scheduleApi = {
  list: (date?: string) => api.get('/schedules', { params: date ? { schedule_date: date } : {} }),
  create: (data: any) => api.post('/schedules', data),
  delete: (id: number) => api.delete(`/schedules/${id}`),
};

// Admin APIs
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params: any) => api.get('/admin/users', { params }),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
};

// Upload API
export const uploadApi = {
  upload: (file: File, subdir: string = 'videos') => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/upload?subdir=${subdir}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
