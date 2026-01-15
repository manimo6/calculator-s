import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api-client.js';

const ROLE_OPTIONS = [
  { value: 'master', label: '마스터' },
  { value: 'admin', label: '관리자' },
  { value: 'teacher', label: '강사' },
  { value: 'parttime', label: '알바' },
];

const AccountsTab = ({ user }) => {
  const isMaster = user?.role === 'master';
  const currentUsername = user?.username || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  const [editingUsername, setEditingUsername] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');

  const sortedUsers = useMemo(() => {
    return (users || []).slice().sort((a, b) => String(a.username || '').localeCompare(String(b.username || ''), 'ko-KR'));
  }, [users]);

  function resetForm() {
    setEditingUsername('');
    setUsername('');
    setPassword('');
    setRole('admin');
    setError('');
  }

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.listUsers();
      setUsers(res?.users || []);
    } catch (e) {
      setUsers([]);
      setError(e?.message || '계정 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (!isMaster) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>계정 관리</h2>
        <p style={{ color: '#d33' }}>마스터만 접근 가능합니다.</p>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmed = username.trim();
    if (!trimmed || !role) {
      setError('아이디와 권한을 입력해주세요.');
      return;
    }
    if (!editingUsername && !password) {
      setError('신규 계정은 비밀번호가 필요합니다.');
      return;
    }
    try {
      if (editingUsername) {
        await apiClient.updateUser(trimmed, { role, ...(password ? { password } : {}) });
      } else {
        await apiClient.createUser({ username: trimmed, password, role });
      }
      resetForm();
      await loadUsers();
    } catch (e2) {
      setError(e2?.message || '저장에 실패했습니다.');
    }
  }

  function startEdit(target) {
    setEditingUsername(target?.username || '');
    setUsername(target?.username || '');
    setPassword('');
    setRole(target?.role || 'admin');
    setError('');
  }

  async function handleDelete(targetUsername) {
    if (!targetUsername) return;
    if (targetUsername === currentUsername) return;
    if (!confirm(`'${targetUsername}' 계정을 삭제할까요?`)) return;
    try {
      await apiClient.deleteUser(targetUsername);
      await loadUsers();
    } catch (e) {
      setError(e?.message || '삭제에 실패했습니다.');
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>계정 관리</h2>
          <p style={{ margin: '6px 0 0', color: '#666' }}>마스터만 생성/수정/삭제가 가능합니다.</p>
        </div>
        <button type="button" className="action-btn btn-outline" onClick={loadUsers} disabled={loading}>
          새로고침
        </button>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fafafa', marginBottom: 12 }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>{editingUsername ? '계정 수정' : '계정 생성'}</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="아이디"
            style={{ flex: 1, minWidth: 140 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            readOnly={!!editingUsername}
            required
          />
          <input
            type="password"
            className="form-input"
            placeholder={editingUsername ? '비밀번호(수정 시만 입력)' : '비밀번호'}
            style={{ flex: 1, minWidth: 160 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: 140 }}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="submit" className="action-btn btn-primary" disabled={loading}>
            저장
          </button>
          <button type="button" className="action-btn btn-outline" onClick={resetForm} disabled={loading}>
            초기화
          </button>
        </form>
      </div>

      {error && (
        <div style={{ marginBottom: 10, color: '#e74c3c', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>계정 목록</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '6px 4px' }}>아이디</th>
              <th style={{ padding: '6px 4px' }}>권한</th>
              <th style={{ padding: '6px 4px' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: 8, color: '#666' }}>불러오는 중...</td></tr>
            ) : sortedUsers.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 8, color: '#666' }}>계정이 없습니다.</td></tr>
            ) : (
              sortedUsers.map((u) => (
                <tr key={u.username} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 4px' }}>{u.username}</td>
                  <td style={{ padding: '8px 4px' }}>{u.role}</td>
                  <td style={{ padding: '8px 4px' }}>
                    <button type="button" className="action-btn btn-outline btn-sm" onClick={() => startEdit(u)} style={{ marginRight: 6 }}>
                      수정
                    </button>
                    {u.username === currentUsername ? (
                      <span style={{ color: '#888' }}>(본인)</span>
                    ) : (
                      <button
                        type="button"
                        className="action-btn btn-outline btn-sm"
                        onClick={() => handleDelete(u.username)}
                        style={{ color: '#d33' }}
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountsTab;

