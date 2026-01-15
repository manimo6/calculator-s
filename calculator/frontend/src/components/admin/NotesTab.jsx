import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api-client.js';
import Modal from '../common/Modal.jsx';

function normalizeCourseConfigSets(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((p) => (typeof p === 'string' ? { name: p, data: null } : p))
      .filter((p) => p && typeof p.name === 'string')
      .map((p) => ({ name: p.name, data: p.data }));
  }
  if (typeof raw === 'object') {
    return Object.keys(raw).map((name) => ({ name, data: raw[name] }));
  }
  return [];
}

function extractCourseConfigSetCourses(courseConfigSet) {
  const out = [];
  const tree = courseConfigSet?.data?.courseTree || [];
  tree.forEach((g) => (g.items || []).forEach((i) => out.push(i.label)));
  return Array.from(new Set(out.filter(Boolean)));
}

const NotesTab = () => {
  const [courseConfigSetLoading, setCourseConfigSetLoading] = useState(true);
  const [courseConfigSetError, setCourseConfigSetError] = useState('');
  const [courseConfigSets, setCourseConfigSets] = useState([]);
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState('');

  const selectedCourseConfigSetObj = useMemo(() => courseConfigSets.find((p) => p.name === selectedCourseConfigSet) || null, [courseConfigSets, selectedCourseConfigSet]);
  const courseConfigSetCourses = useMemo(() => extractCourseConfigSetCourses(selectedCourseConfigSetObj), [selectedCourseConfigSetObj]);
  const courseConfigSetCourseSet = useMemo(() => new Set(courseConfigSetCourses), [courseConfigSetCourses]);
  const courseConfigSetCategories = useMemo(() => {
    const tree = selectedCourseConfigSetObj?.data?.courseTree || [];
    return Array.from(new Set(tree.map((g) => g.cat).filter(Boolean)));
  }, [selectedCourseConfigSetObj]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState([]);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [formCategory, setFormCategory] = useState('');
  const [formCourses, setFormCourses] = useState([]);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');

  async function loadCourseConfigSets() {
    setCourseConfigSetLoading(true);
    setCourseConfigSetError('');
    try {
      const raw = await apiClient.listCourseConfigSets();
      const list = normalizeCourseConfigSets(raw).sort((a, b) => b.name.localeCompare(a.name, 'ko-KR'));
      setCourseConfigSets(list);
    } catch (e) {
      setCourseConfigSetError(e?.message || '설정 세트를 불러오지 못했습니다.');
      setCourseConfigSets([]);
    } finally {
      setCourseConfigSetLoading(false);
    }
  }

  useEffect(() => {
    loadCourseConfigSets();
  }, []);

  async function loadNotes() {
    if (!selectedCourseConfigSet) return;
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (courseFilter) params.course = courseFilter;
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.listCourseNotes(params);
      const results = res?.results || [];
      const filtered = results.filter((n) => {
        const courses = Array.isArray(n.courses) ? n.courses : [];
        return courses.some((c) => courseConfigSetCourseSet.has(c));
      });
      setNotes(filtered);
    } catch (e) {
      setError(e?.message || '메모를 불러오지 못했습니다.');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, [selectedCourseConfigSet, categoryFilter, courseFilter, search]);

  function openNew() {
    setEditing(null);
    setFormCategory(categoryFilter || '');
    setFormCourses(courseFilter ? [courseFilter] : []);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setModalOpen(true);
  }

  function openEdit(note) {
    setEditing(note);
    setFormCategory(note?.category || '');
    setFormCourses(Array.isArray(note?.courses) ? note.courses : []);
    setFormTitle(note?.title || '');
    setFormContent(note?.content || '');
    setFormTags(Array.isArray(note?.tags) ? note.tags.join(', ') : '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function saveNote() {
    setError('');
    if (!selectedCourseConfigSet) {
      setError('설정 세트를 먼저 선택하세요.');
      return;
    }
    const title = formTitle.trim();
    const courses = (formCourses || []).filter(Boolean);
    if (!courses.length || !title) {
      setError('과목(1개 이상)과 제목은 필수입니다.');
      return;
    }
    const invalid = courses.find((c) => !courseConfigSetCourseSet.has(c));
    if (invalid) {
      setError('선택한 설정 세트에 없는 과목이 포함되어 있습니다.');
      return;
    }
    const tags = (formTags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      category: (formCategory || '').trim(),
      courses,
      course: courses[0],
      title,
      content: formContent || '',
      tags,
    };
    try {
      if (editing?.id) {
        await apiClient.updateCourseNote(editing.id, payload);
      } else {
        await apiClient.createCourseNote(payload);
      }
      closeModal();
      await loadNotes();
    } catch (e) {
      setError(e?.message || '저장에 실패했습니다.');
    }
  }

  async function deleteNote() {
    const id = editing?.id;
    if (!id) return;
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await apiClient.deleteCourseNote(id);
      closeModal();
      await loadNotes();
    } catch (e) {
      setError(e?.message || '삭제에 실패했습니다.');
    }
  }

  const courseOptions = useMemo(() => courseConfigSetCourses.slice().sort((a, b) => a.localeCompare(b, 'ko-KR')), [courseConfigSetCourses]);

  const visibleNotes = useMemo(() => {
    return (notes || [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [notes]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>과목별 메모</h2>
          <p style={{ margin: '6px 0 0', color: '#666' }}>설정 세트 선택이 필수입니다.</p>
        </div>
        <button type="button" className="action-btn btn-outline" onClick={loadCourseConfigSets} disabled={courseConfigSetLoading}>
          설정 세트 새로고침
        </button>
      </div>

      {courseConfigSetError && <div style={{ marginBottom: 10, color: '#e74c3c', fontWeight: 600 }}>{courseConfigSetError}</div>}

      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, background: '#fff', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600 }}>설정 세트</label>
            <select
              className="form-select"
              style={{ minWidth: 200 }}
              value={selectedCourseConfigSet}
              onChange={(e) => {
                setSelectedCourseConfigSet(e.target.value);
                setCategoryFilter('');
                setCourseFilter('');
                setSearch('');
              }}
              disabled={courseConfigSetLoading}
            >
              <option value="">-- 선택 --</option>
              {courseConfigSets.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600 }}>카테고리</label>
            <select
              className="form-select"
              style={{ minWidth: 150 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              disabled={!selectedCourseConfigSet}
            >
              <option value="">-- 전체 --</option>
              {courseConfigSetCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600 }}>과목</label>
            <select
              className="form-select"
              style={{ minWidth: 220 }}
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              disabled={!selectedCourseConfigSet}
            >
              <option value="">-- 전체 --</option>
              {courseOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontWeight: 600 }}>검색</label>
            <input
              className="form-input"
              type="text"
              placeholder="제목/내용/태그"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!selectedCourseConfigSet}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className="action-btn btn-outline" onClick={loadNotes} disabled={!selectedCourseConfigSet || loading}>
              새로고침
            </button>
            <button type="button" className="action-btn btn-primary" onClick={openNew} disabled={!selectedCourseConfigSet}>
              새 메모
            </button>
          </div>
        </div>
      </div>

      {!selectedCourseConfigSet ? (
        <div style={{ color: '#666' }}>설정 세트를 먼저 선택하세요.</div>
      ) : loading ? (
        <div style={{ color: '#666' }}>불러오는 중...</div>
      ) : visibleNotes.length === 0 ? (
        <div style={{ color: '#666' }}>표시할 메모가 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {visibleNotes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openEdit(n)}
              style={{
                textAlign: 'left',
                border: '1px solid #e0e0e0',
                borderRadius: 10,
                padding: 12,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{n.title || '(제목 없음)'}</div>
              <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: 6 }}>
                {n.category ? `카테고리: ${n.category}` : '카테고리: -'}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: 6 }}>
                과목: {(Array.isArray(n.courses) ? n.courses : []).join(', ') || '-'}
              </div>
              <div style={{ color: '#999', fontSize: '0.8rem' }}>
                {n.updatedAt ? new Date(n.updatedAt).toLocaleString('ko-KR') : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? '메모 수정' : '새 메모'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label className="form-label">카테고리</label>
            <select className="form-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
              <option value="">-- 선택 --</option>
              {courseConfigSetCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">과목(복수 선택 가능) <span style={{ color: 'red' }}>*</span></label>
            <select
              className="form-select"
              multiple
              size={8}
              value={formCourses}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                setFormCourses(values);
              }}
            >
              {courseOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">제목 <span style={{ color: 'red' }}>*</span></label>
            <input className="form-input" type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          </div>
          <div>
            <label className="form-label">내용</label>
            <textarea className="form-input" rows={6} value={formContent} onChange={(e) => setFormContent(e.target.value)} />
          </div>
          <div>
            <label className="form-label">태그(쉼표로 구분)</label>
            <input className="form-input" type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="예: 숙제, 시험범위" />
          </div>
          {error && <div style={{ color: '#e74c3c', fontWeight: 600 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {editing?.id && (
              <button type="button" className="action-btn btn-outline" onClick={deleteNote} style={{ color: '#d33' }}>
                삭제
              </button>
            )}
            <button type="button" className="action-btn btn-outline" onClick={closeModal}>
              닫기
            </button>
            <button type="button" className="action-btn btn-primary" onClick={saveNote}>
              저장
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NotesTab;
