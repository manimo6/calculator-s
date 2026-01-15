import { getToken, setToken } from './auth-store.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
let refreshPromise = null;

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const entry of cookies) {
    const [key, ...rest] = entry.split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function isAuthPath(path) {
  return path.startsWith('/api/auth/');
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = request('/api/auth/refresh', { method: 'POST', skipRefresh: true })
    .then((res) => {
      if (res?.token) setToken(res.token);
      return res;
    })
    .catch((error) => {
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const token = getToken();
  const csrfToken = getCookie('csrf_token');
  const {
    skipRefresh: skipRefreshRaw,
    headers: extraHeaders,
    ...fetchOptions
  } = options;
  const skipRefresh = skipRefreshRaw === true;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(extraHeaders || {}),
  };
  const resp = await fetch(url, {
    credentials: 'include',
    ...fetchOptions,
    headers,
  });

  if (!resp.ok) {
    if (resp.status === 401 && !skipRefresh && !isAuthPath(path)) {
      try {
        await refreshSession();
        return request(path, { ...fetchOptions, skipRefresh: true });
      } catch (refreshError) {
        // fall through to original error
      }
    }
    let detail = '';
    try {
      const data = await resp.json();
      detail = data?.message || '';
    } catch (e) {
      /* ignore parse error */
    }
    throw new Error(detail || `HTTP ${resp.status}`);
  }

  // 빈 응답을 허용하기 위해 상태코드만 체크 후 JSON 시도
  try {
    return await resp.json();
  } catch (e) {
    return null;
  }
}

export const apiClient = {
  // Auth
  login(credentials) {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  },
  reauth(credentials) {
    return request('/api/auth/reauth', { method: 'POST', body: JSON.stringify(credentials) });
  },
  async changePassword(payload) {
    const res = await request('/api/auth/password', { method: 'POST', body: JSON.stringify(payload) });
    if (res?.token) setToken(res.token);
    return res;
  },
  refresh() {
    return refreshSession();
  },
  logout() {
    return request('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return request('/api/auth/me', { method: 'GET' });
  },
  getSettings() {
    return request('/api/settings', { method: 'GET' });
  },
  saveSettings(settings) {
    return request('/api/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
  },
  // Notices
  listNotices() {
    return request('/api/notices', { method: 'GET' });
  },
  createNotice(data) {
    return request('/api/notices', { method: 'POST', body: JSON.stringify(data) });
  },
  updateNotice(id, data) {
    return request(`/api/notices/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteNotice(id) {
    return request(`/api/notices/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getCourses() {
    return request('/api/courses', { method: 'GET' });
  },
  saveCourses(data) {
    return request('/api/courses', { method: 'POST', body: JSON.stringify(data) });
  },
  // Course config sets
  listCourseConfigSets() {
    return request('/api/course-config-sets', { method: 'GET' });
  },
  saveCourseConfigSet(name, data) {
    return request('/api/course-config-sets', {
      method: 'POST',
      body: JSON.stringify({ name, data }),
    });
  },
  deleteCourseConfigSet(name) {
    return request(`/api/course-config-sets/${encodeURIComponent(name)}`, { method: 'DELETE' });
  },
  // Users (master/admin)
  listUsers() {
    return request('/api/users', { method: 'GET' });
  },
  createUser(data) {
    return request('/api/users', { method: 'POST', body: JSON.stringify(data) });
  },
  deleteUser(username) {
    return request(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
  },
  updateUser(username, data) {
    return request(`/api/users/${encodeURIComponent(username)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  listPermissions() {
    return request('/api/permissions', { method: 'GET' });
  },
  getUserPermissions(username) {
    return request(`/api/users/${encodeURIComponent(username)}/permissions`, { method: 'GET' });
  },
  updateUserPermissions(username, data) {
    return request(`/api/users/${encodeURIComponent(username)}/permissions`, { method: 'PUT', body: JSON.stringify(data) });
  },
  // Registrations (full list)
  listRegistrations() {
    return request('/api/registrations', { method: 'GET' });
  },
  listRegistrationCourseNames(courseConfigSetName) {
    const qs = new URLSearchParams({ courseConfigSetName }).toString();
    return request(`/api/registrations/course-names?${qs}`, { method: 'GET' });
  },
  renameRegistrationCourseNames(payload) {
    return request('/api/registrations/course-names', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updateRegistrationWithdrawal(id, withdrawnAt) {
    return request(`/api/registrations/${encodeURIComponent(id)}/withdrawal`, {
      method: 'PATCH',
      body: JSON.stringify({ withdrawnAt }),
    });
  },
  updateRegistrationNote(id, content) {
    return request(`/api/registrations/${encodeURIComponent(id)}/note`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },
  transferRegistration(id, payload) {
    return request(`/api/registrations/${encodeURIComponent(id)}/transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  cancelTransferRegistration(id) {
    return request(`/api/registrations/${encodeURIComponent(id)}/transfer/cancel`, {
      method: 'POST',
    });
  },
  listRegistrationExtensions(params = {}) {
    const qs = new URLSearchParams();
    if (Array.isArray(params.registrationIds) && params.registrationIds.length) {
      qs.set('registrationIds', params.registrationIds.join(','));
    }
    const query = qs.toString();
    return request(`/api/registration-extensions${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },
  createRegistrationExtension(payload) {
    return request('/api/registration-extensions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  // Merge groups (registrations grouping)
  listMerges() {
    return request('/api/merges', { method: 'GET' });
  },
  saveMerges(merges) {
    return request('/api/merges', { method: 'PUT', body: JSON.stringify({ merges }) });
  },
  // Course notes
  listCourseNotes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/course-notes${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  createCourseNote(data) {
    return request('/api/course-notes', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCourseNote(id, data) {
    return request(`/api/course-notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteCourseNote(id, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const suffix = qs ? `?${qs}` : '';
    return request(`/api/course-notes/${encodeURIComponent(id)}${suffix}`, { method: 'DELETE' });
  },
  listStudents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/students${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  getStudent(id) {
    return request(`/api/students/${id}`, { method: 'GET' });
  },
  addStudents(records) {
    return request('/api/students', { method: 'POST', body: JSON.stringify(records) });
  },
  updateStudent(id, record) {
    return request(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(record) });
  },
  deleteStudent(id) {
    return request(`/api/students/${id}`, { method: 'DELETE' });
  },
  // Calendar notes
  listCalendarNotes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/calendar-notes${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  createCalendarNote(data) {
    return request('/api/calendar-notes', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCalendarNote(id, data) {
    return request(`/api/calendar-notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteCalendarNote(id) {
    return request(`/api/calendar-notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  // Attendance
  listAttendance(params = {}) {
    const qs = new URLSearchParams();
    if (params.month) qs.set('month', params.month);
    if (Array.isArray(params.registrationIds) && params.registrationIds.length) {
      qs.set('registrationIds', params.registrationIds.join(','));
    }
    const query = qs.toString();
    return request(`/api/attendance${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  saveAttendance(data) {
    return request('/api/attendance', { method: 'POST', body: JSON.stringify(data) });
  },
  saveAttendanceEntries(entries) {
    return request('/api/attendance', { method: 'POST', body: JSON.stringify({ entries }) });
  },
};
