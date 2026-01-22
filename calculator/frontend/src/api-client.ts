import { getReauthAt, getToken, setAuth, setToken } from './auth-store';

type RequestOptions = Omit<RequestInit, 'headers'> & {
  skipRefresh?: boolean;
  headers?: Record<string, string>;
};

type RequestError = Error & { status?: number; statusCode?: number };
type JsonRecord = Record<string, unknown>;
type QueryParams = Record<string, string | number | boolean>;
type TokenResponse = { token?: string; user?: Record<string, unknown> };

const API_URL = import.meta.env.VITE_API_URL || '';
const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrf_token';
let refreshPromise: Promise<TokenResponse | null> | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function buildQuery(params: QueryParams = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    qs.set(key, String(value));
  }
  return qs.toString();
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const entry of cookies) {
    const [key, ...rest] = entry.split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function isAuthPath(path: string) {
  return path.startsWith('/api/auth/');
}

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = request<TokenResponse>('/api/auth/refresh', { method: 'POST', skipRefresh: true })
    .then((res) => {
      if (res?.token) setToken(res.token);
      if (res?.user) {
        const token = res?.token || getToken();
        setAuth(token, res.user, getReauthAt());
      }
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

  async function request<T = unknown>(path: string, options: RequestOptions = {}) {
    const url = `${API_URL}${path}`;
    const token = getToken();
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    const {
      skipRefresh: skipRefreshRaw,
      headers: extraHeaders,
      ...fetchOptions
    } = options;
    const skipRefresh = skipRefreshRaw === true;
    const headers: Record<string, string> = {
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
          return request(path, { ...fetchOptions, headers: extraHeaders, skipRefresh: true });
        } catch (refreshError) {
          // fall through to original error
        }
      }
      let detail = '';
      let statusCode = resp.status;
      try {
        const data: unknown = await resp.json();
        if (isRecord(data)) {
          const messageValue = data.message;
          if (typeof messageValue === 'string') detail = messageValue;
          const statusValue = data.statusCode;
          if (typeof statusValue === 'number' && Number.isFinite(statusValue)) {
            statusCode = statusValue;
          }
        }
      } catch (e) {
        /* ignore parse error */
      }
      const error = new Error(detail || `HTTP ${resp.status}`) as RequestError;
      error.status = resp.status;
      error.statusCode = statusCode;
      throw error;
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
  login(credentials: JsonRecord) {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  },
  reauth(credentials: JsonRecord) {
    return request('/api/auth/reauth', { method: 'POST', body: JSON.stringify(credentials) });
  },
  async changePassword(payload: JsonRecord) {
    const res = await request<TokenResponse>('/api/auth/password', { method: 'POST', body: JSON.stringify(payload) });
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
  saveSettings(settings: JsonRecord) {
    return request('/api/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
  },
  // Notices
  listNotices() {
    return request('/api/notices', { method: 'GET' });
  },
  createNotice(data: JsonRecord) {
    return request('/api/notices', { method: 'POST', body: JSON.stringify(data) });
  },
  updateNotice(id: string, data: JsonRecord) {
    return request(`/api/notices/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteNotice(id: string) {
    return request(`/api/notices/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getCourses() {
    return request('/api/courses', { method: 'GET' });
  },
  saveCourses(data: JsonRecord) {
    return request('/api/courses', { method: 'POST', body: JSON.stringify(data) });
  },
  // Course config sets
  listCourseConfigSets() {
    return request('/api/course-config-sets', { method: 'GET' });
  },
  saveCourseConfigSet(name: string, data: JsonRecord) {
    return request('/api/course-config-sets', {
      method: 'POST',
      body: JSON.stringify({ name, data }),
    });
  },
  deleteCourseConfigSet(name: string) {
    return request(`/api/course-config-sets/${encodeURIComponent(name)}`, { method: 'DELETE' });
  },
  // Users (master/admin)
  listUsers() {
    return request('/api/users', { method: 'GET' });
  },
  createUser(data: JsonRecord) {
    return request('/api/users', { method: 'POST', body: JSON.stringify(data) });
  },
  deleteUser(username: string) {
    return request(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
  },
  updateUser(username: string, data: JsonRecord) {
    return request(`/api/users/${encodeURIComponent(username)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  listPermissions() {
    return request('/api/permissions', { method: 'GET' });
  },
  getUserPermissions(username: string) {
    return request(`/api/users/${encodeURIComponent(username)}/permissions`, { method: 'GET' });
  },
  updateUserPermissions(username: string, data: JsonRecord) {
    return request(`/api/users/${encodeURIComponent(username)}/permissions`, { method: 'PUT', body: JSON.stringify(data) });
  },
  // Registrations (full list)
  listRegistrations() {
    return request('/api/registrations', { method: 'GET' });
  },
  listRegistrationCourseNames(courseConfigSetName: string) {
    const qs = new URLSearchParams({ courseConfigSetName }).toString();
    return request(`/api/registrations/course-names?${qs}`, { method: 'GET' });
  },
  renameRegistrationCourseNames(payload: JsonRecord) {
    return request('/api/registrations/course-names', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updateRegistrationWithdrawal(id: string, withdrawnAt: string | null) {
    return request(`/api/registrations/${encodeURIComponent(id)}/withdrawal`, {
      method: 'PATCH',
      body: JSON.stringify({ withdrawnAt }),
    });
  },
  updateRegistrationNote(id: string, content: string) {
    return request(`/api/registrations/${encodeURIComponent(id)}/note`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },
  transferRegistration(id: string, payload: JsonRecord) {
    return request(`/api/registrations/${encodeURIComponent(id)}/transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  cancelTransferRegistration(id: string) {
    return request(`/api/registrations/${encodeURIComponent(id)}/transfer/cancel`, {
      method: 'POST',
    });
  },
  listRegistrationExtensions(params: { registrationIds?: string[] } = {}) {
    const qs = new URLSearchParams();
    if (Array.isArray(params.registrationIds) && params.registrationIds.length) {
      qs.set('registrationIds', params.registrationIds.join(','));
    }
    const query = qs.toString();
    return request(`/api/registration-extensions${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  },
  createRegistrationExtension(payload: JsonRecord) {
    return request('/api/registration-extensions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  // Merge groups (registrations grouping)
  listMerges() {
    return request('/api/merges', { method: 'GET' });
  },
  saveMerges(merges: unknown[]) {
    return request('/api/merges', { method: 'PUT', body: JSON.stringify({ merges }) });
  },
  // Course notes
  listCourseNotes(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return request(`/api/course-notes${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  createCourseNote(data: JsonRecord) {
    return request('/api/course-notes', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCourseNote(id: string, data: JsonRecord) {
    return request(`/api/course-notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteCourseNote(id: string, params: QueryParams = {}) {
    const qs = buildQuery(params);
    const suffix = qs ? `?${qs}` : '';
    return request(`/api/course-notes/${encodeURIComponent(id)}${suffix}`, { method: 'DELETE' });
  },
  listStudents(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return request(`/api/students${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  getStudent(id: string) {
    return request(`/api/students/${id}`, { method: 'GET' });
  },
  addStudents(records: JsonRecord[]) {
    return request('/api/students', { method: 'POST', body: JSON.stringify(records) });
  },
  updateStudent(id: string, record: JsonRecord) {
    return request(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(record) });
  },
  deleteStudent(id: string) {
    return request(`/api/students/${id}`, { method: 'DELETE' });
  },
  // Calendar notes
  listCalendarNotes(params: QueryParams = {}) {
    const qs = buildQuery(params);
    return request(`/api/calendar-notes${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  createCalendarNote(data: JsonRecord) {
    return request('/api/calendar-notes', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCalendarNote(id: string, data: JsonRecord) {
    return request(`/api/calendar-notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteCalendarNote(id: string) {
    return request(`/api/calendar-notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  // Attendance
  listAttendance(params: { month?: string; registrationIds?: string[] } = {}) {
    const qs = new URLSearchParams();
    if (params.month) qs.set('month', params.month);
    if (Array.isArray(params.registrationIds) && params.registrationIds.length) {
      qs.set('registrationIds', params.registrationIds.join(','));
    }
    const query = qs.toString();
    return request(`/api/attendance${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  saveAttendance(data: JsonRecord) {
    return request('/api/attendance', { method: 'POST', body: JSON.stringify(data) });
  },
  saveAttendanceEntries(entries: JsonRecord[]) {
    return request('/api/attendance', { method: 'POST', body: JSON.stringify({ entries }) });
  },
};
