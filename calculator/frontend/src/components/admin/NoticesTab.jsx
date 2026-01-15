import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api-client.js';

function formatTargets(targets) {
  if (!targets || targets.length === 0) return '전체';
  return targets.join(', ');
}

function formatDateTime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(value);
  }
}

const ROLE_OPTIONS = [
  { value: 'admin', label: '관리자' },
  { value: 'teacher', label: '강사' },
  { value: 'parttime', label: '알바' },
];

const NoticesTab = ({ user }) => {
  const isMaster = user?.role === 'master';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notices, setNotices] = useState([]);

  const [editId, setEditId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targets, setTargets] = useState([]);

  const sortedNotices = useMemo(() => {
    return (notices || []).slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [notices]);

  async function loadNotices() {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.listNotices();
      setNotices(res?.notices || []);
    } catch (e) {
      setError(e?.message || '공지사항을 불러오지 못했습니다.');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotices();
  }, []);

  function resetForm() {
    setEditId('');
    setTitle('');
    setBody('');
    setTargets([]);
  }

  function toggleTarget(value) {
    setTargets((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('제목과 내용을 입력해주세요.');
      return;
    }
    setError('');
    try {
      const payload = { title: title.trim(), body: body.trim(), targets };
      if (editId) {
        await apiClient.updateNotice(editId, payload);
      } else {
        await apiClient.createNotice(payload);
      }
      resetForm();
      await loadNotices();
    } catch (e2) {
      setError(e2?.message || '저장에 실패했습니다.');
    }
  }

  function startEdit(notice) {
    setEditId(notice?.id || '');
    setTitle(notice?.title || '');
    setBody(notice?.body || '');
    setTargets(Array.isArray(notice?.targets) ? notice.targets : []);
  }

  async function handleDelete(id) {
    if (!id) return;
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await apiClient.deleteNotice(id);
      await loadNotices();
    } catch (e) {
      setError(e?.message || '삭제에 실패했습니다.');
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>공지사항</h2>
        </div>
        <button type="button" className="action-btn btn-outline" onClick={loadNotices} disabled={loading}>
          새로고침
        </button>
      </div>

      {isMaster && (
        <div style={{ border: '1px solid #dfe3e8', borderRadius: 8, padding: 12, background: '#f9fafb', marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 8px' }}>{editId ? '공지 수정' : '공지 생성'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <textarea
                className="form-input"
                rows={4}
                placeholder="내용"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              {ROLE_OPTIONS.map((opt) => (
                <label key={opt.value} style={{ marginRight: 10 }}>
                  <input
                    type="checkbox"
                    checked={targets.includes(opt.value)}
                    onChange={() => toggleTarget(opt.value)}
                    style={{ marginRight: 6 }}
                  />
                  {opt.label}
                </label>
              ))}
              <span style={{ color: '#666', fontSize: '0.9rem' }}>(미선택 시 전체)</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="action-btn btn-primary" disabled={loading}>
                저장
              </button>
              <button type="button" className="action-btn btn-outline" onClick={resetForm} disabled={loading}>
                초기화
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 10, color: '#e74c3c', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#666' }}>불러오는 중...</div>
      ) : sortedNotices.length === 0 ? (
        <div style={{ color: '#666' }}>공지사항이 없습니다.</div>
      ) : (
        <div>
          {sortedNotices.map((notice) => (
            <div
              key={notice.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{notice.title || ''}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    대상: {formatTargets(notice.targets)} {formatDateTime(notice.updatedAt)}
                  </div>
                </div>

                {isMaster && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button type="button" className="action-btn btn-outline btn-sm" onClick={() => startEdit(notice)}>
                      수정
                    </button>
                    <button type="button" className="action-btn btn-outline btn-sm" onClick={() => handleDelete(notice.id)} style={{ color: '#d33' }}>
                      삭제
                    </button>
                  </div>
                )}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#333' }}>{notice.body || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticesTab;

