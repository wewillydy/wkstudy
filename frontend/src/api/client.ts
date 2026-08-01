import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const authApi = {
  sendCode: (email: string, type: string) => api.post('/auth/send-code', { email, type }),
  register: (data: { email: string; code: string; password: string; nickname: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string; remember_me: boolean }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const courseApi = {
  list: (params: any) => api.get('/courses', { params }),
  today: () => api.get('/courses/today'),
  completed: () => api.get('/courses/completed'),
  getById: (id: number) => api.get(`/courses/${id}`),
  updateProgress: (id: number, data: any) => api.put(`/courses/${id}/progress`, data),
  filters: () => api.get('/courses/filters'),
  create: (data: any) => api.post('/courses', data),
  update: (id: number, data: any) => api.put(`/courses/${id}`, data),
  delete: (id: number) => api.delete(`/courses/${id}`),
  addCourseware: (courseId: number, data: any) => api.post(`/courses/${courseId}/courseware`, data),
  deleteCourseware: (courseId: number, cwId: number) => api.delete(`/courses/${courseId}/courseware/${cwId}`),
};

export const markApi = {
  list: (courseId: number) => api.get(`/courses/${courseId}/marks`),
  create: (courseId: number, data: any) => api.post(`/courses/${courseId}/marks`, data),
  update: (courseId: number, markId: number, data: any) => api.put(`/courses/${courseId}/marks/${markId}`, data),
  delete: (courseId: number, markId: number) => api.delete(`/courses/${courseId}/marks/${markId}`),
};

export const sloganApi = {
  list: () => api.get('/slogans'),
  create: (data: any) => api.post('/slogans', data),
  update: (id: number, data: any) => api.put(`/slogans/${id}`, data),
  delete: (id: number) => api.delete(`/slogans/${id}`),
};

export const scheduleApi = {
  list: (date?: string) => api.get('/schedules', { params: date ? { schedule_date: date } : {} }),
  create: (data: any) => api.post('/schedules', data),
  delete: (id: number) => api.delete(`/schedules/${id}`),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params: any) => api.get('/admin/users', { params }),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
};

export const uploadApi = {
  upload: (file: File, subdir: string = 'videos') => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/upload?subdir=${subdir}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
