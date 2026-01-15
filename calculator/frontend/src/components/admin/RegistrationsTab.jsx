import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api-client.js';

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

function extractCourseTreeFromCourseConfigSet(courseConfigSet) {
  return Array.isArray(courseConfigSet?.data?.courseTree) ? courseConfigSet.data.courseTree : [];
}

function extractCourseConfigSetCourses(courseConfigSet) {
  const out = [];
  extractCourseTreeFromCourseConfigSet(courseConfigSet).forEach((g) => (g.items || []).forEach((i) => out.push(i.label)));
  return Array.from(new Set(out.filter(Boolean)));
}

function buildCourseCategoryMap(courseTree) {
  const map = new Map();
  courseTree.forEach((g) => (g.items || []).forEach((i) => map.set(i.label, g.cat)));
  return map;
}

function isMergeKey(value) {
  return typeof value === 'string' && value.startsWith('__merge__');
}

const RegistrationsTab = () => {
  const [courseConfigSetLoading, setCourseConfigSetLoading] = useState(true);
  const [courseConfigSetError, setCourseConfigSetError] = useState('');
  const [courseConfigSets, setCourseConfigSets] = useState([]);
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState('');

  const selectedCourseConfigSetObj = useMemo(() => courseConfigSets.find((p) => p.name === selectedCourseConfigSet) || null, [courseConfigSets, selectedCourseConfigSet]);
  const courseConfigSetTree = useMemo(() => extractCourseTreeFromCourseConfigSet(selectedCourseConfigSetObj), [selectedCourseConfigSetObj]);
  const courseConfigSetBaseCourses = useMemo(() => extractCourseConfigSetCourses(selectedCourseConfigSetObj), [selectedCourseConfigSetObj]);
  const courseConfigSetCourseSet = useMemo(() => new Set(courseConfigSetBaseCourses), [courseConfigSetBaseCourses]);
  const courseCatMap = useMemo(() => buildCourseCategoryMap(courseConfigSetTree), [courseConfigSetTree]);
  const courseConfigSetCategories = useMemo(() => Array.from(new Set(courseConfigSetTree.map((g) => g.cat).filter(Boolean))), [courseConfigSetTree]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [merges, setMerges] = useState([]);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');

  const [mergeManagerOpen, setMergeManagerOpen] = useState(false);
  const [mergeName, setMergeName] = useState('');
  const [mergeCourses, setMergeCourses] = useState([]);

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

  async function loadMerges() {
    try {
      const res = await apiClient.listMerges();
      setMerges(res?.merges || []);
    } catch {
      setMerges([]);
    }
  }

  async function loadRegistrations() {
    if (!selectedCourseConfigSet) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.listRegistrations();
      const results = res?.results || [];
      setRegistrations(results);
    } catch (e) {
      setError(e?.message || '등록현황을 불러오지 못했습니다.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedCourseConfigSet) return;
    loadMerges();
    loadRegistrations();
  }, [selectedCourseConfigSet]);

  const mapCourseToCategory = useMemo(() => {
    const bases = courseConfigSetBaseCourses.slice().sort((a, b) => b.length - a.length);
    return (courseLabel) => {
      if (!courseLabel) return '';
      if (courseCatMap.has(courseLabel)) return courseCatMap.get(courseLabel);
      for (const base of bases) {
        if (courseLabel.startsWith(base)) return courseCatMap.get(base) || '';
      }
      return '';
    };
  }, [courseCatMap, courseConfigSetBaseCourses]);

  const dataCourseSet = useMemo(() => new Set((registrations || []).map((r) => r.course).filter(Boolean)), [registrations]);

  const courseOptions = useMemo(() => {
    if (!selectedCourseConfigSet) return [];
    const out = new Set(courseConfigSetBaseCourses);
    // 설정 세트 과목명을 접두사로 하는 변형 과목(데이터 기반)도 포함
    for (const c of dataCourseSet) {
      for (const base of courseConfigSetCourseSet) {
        if (typeof c === 'string' && c.startsWith(base)) {
          out.add(c);
          break;
        }
      }
    }
    return Array.from(out).sort((a, b) => a.localeCompare(b, 'ko-KR'));
  }, [selectedCourseConfigSet, courseConfigSetBaseCourses, dataCourseSet, courseConfigSetCourseSet]);

  const filteredRegistrations = useMemo(() => {
    if (!selectedCourseConfigSet) return [];
    if (courseConfigSetCourseSet.size === 0) return [];
    const allowed = courseConfigSetCourseSet.size ? courseConfigSetCourseSet : null;
    let list = (registrations || []).slice();

    // 설정 세트에 포함된 과목(및 접두사 변형)만 허용
    if (allowed && allowed.size) {
      list = list.filter((r) => {
        if (allowed.has(r.course)) return true;
        for (const base of allowed) {
          if (r.course && String(r.course).startsWith(base)) return true;
        }
        return false;
      });
    }

    if (categoryFilter) {
      list = list.filter((r) => mapCourseToCategory(String(r.course || '')) === categoryFilter);
    }

    if (courseFilter) {
      if (isMergeKey(courseFilter)) {
        const id = courseFilter.replace('__merge__', '');
        const mg = merges.find((m) => String(m.id) === String(id));
        if (mg?.courses?.length) {
          list = list.filter((r) => mg.courses.includes(r.course));
        } else {
          list = [];
        }
      } else {
        list = list.filter((r) => r.course === courseFilter);
      }
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((r) => String(r.name || '').toLowerCase().includes(s));
    }

    return list;
  }, [selectedCourseConfigSet, registrations, courseConfigSetCourseSet, categoryFilter, courseFilter, merges, search, mapCourseToCategory]);

  async function persistMerges(next) {
    try {
      const res = await apiClient.saveMerges(next);
      setMerges(res?.merges || next);
    } catch {
      setMerges(next);
    }
  }

  async function addMerge() {
    const name = (mergeName || '').trim();
    const selected = (mergeCourses || []).filter(Boolean);
    if (selected.length < 2) {
      setError('합반은 과목을 2개 이상 선택해야 합니다.');
      return;
    }
    const id = Date.now().toString();
    const next = [...merges, { id, name, courses: Array.from(new Set(selected)) }];
    setMergeName('');
    setMergeCourses([]);
    await persistMerges(next);
  }

  async function deleteMerge(id) {
    const next = merges.filter((m) => String(m.id) !== String(id));
    await persistMerges(next);
  }

  const mergeOptions = useMemo(() => {
    return (merges || []).map((m) => ({
      value: `__merge__${m.id}`,
      label: `[합반] ${m.name || (Array.isArray(m.courses) ? m.courses.join(' + ') : '')}`,
    }));
  }, [merges]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>등록현황</h2>
          <p style={{ margin: '6px 0 0', color: '#666' }}>설정 세트 선택이 필수입니다.</p>
        </div>
        <button type="button" className="action-btn btn-outline" onClick={loadCourseConfigSets} disabled={courseConfigSetLoading}>
          설정 세트 새로고침
        </button>
      </div>

      {courseConfigSetError && <div style={{ marginBottom: 10, color: '#e74c3c', fontWeight: 600 }}>{courseConfigSetError}</div>}
      {error && <div style={{ marginBottom: 10, color: '#e74c3c', fontWeight: 600 }}>{error}</div>}

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
              style={{ minWidth: 260 }}
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              disabled={!selectedCourseConfigSet}
            >
              <option value="">-- 전체 --</option>
              {mergeOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
              {courseOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontWeight: 600 }}>검색(이름)</label>
            <input
              className="form-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!selectedCourseConfigSet}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className="action-btn btn-outline" onClick={loadRegistrations} disabled={!selectedCourseConfigSet || loading}>
              새로고침
            </button>
            <button type="button" className="action-btn btn-outline" onClick={() => setMergeManagerOpen((v) => !v)} disabled={!selectedCourseConfigSet}>
              합반 관리
            </button>
          </div>
        </div>

        {mergeManagerOpen && selectedCourseConfigSet && (
          <div style={{ marginTop: 12, padding: 10, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa' }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>합반 설정</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600 }}>합반 이름</label>
                <input className="form-input" type="text" value={mergeName} onChange={(e) => setMergeName(e.target.value)} style={{ minWidth: 180 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600 }}>과목 선택(2개 이상)</label>
                <select
                  className="form-select"
                  multiple
                  size={8}
                  value={mergeCourses}
                  onChange={(e) => setMergeCourses(Array.from(e.target.selectedOptions).map((o) => o.value))}
                  style={{ minWidth: 260 }}
                >
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button type="button" className="action-btn btn-primary" onClick={addMerge}>
                  합반 추가
                </button>
              </div>
            </div>
            <ul style={{ marginTop: 10, paddingLeft: 18 }}>
              {(merges || []).map((m) => (
                <li key={m.id} style={{ marginBottom: 6 }}>
                  <span style={{ marginRight: 8 }}>[합반] {m.name || (m.courses || []).join(' + ')}</span>
                  <button type="button" className="action-btn btn-outline btn-sm" onClick={() => deleteMerge(m.id)} style={{ color: '#d33' }}>
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!selectedCourseConfigSet ? (
        <div style={{ color: '#666' }}>설정 세트를 먼저 선택하세요.</div>
      ) : loading ? (
        <div style={{ color: '#666' }}>불러오는 중...</div>
      ) : courseConfigSetCourseSet.size === 0 ? (
        <div style={{ color: '#666' }}>선택한 설정 세트에 과목이 없습니다.</div>
      ) : filteredRegistrations.length === 0 ? (
        <div style={{ color: '#666' }}>표시할 데이터가 없습니다.</div>
      ) : (
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', color: '#666' }}>
            총 {filteredRegistrations.length}건
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>이름</th>
                  <th style={{ padding: '8px 10px' }}>과목</th>
                  <th style={{ padding: '8px 10px' }}>시작</th>
                  <th style={{ padding: '8px 10px' }}>종료</th>
                  <th style={{ padding: '8px 10px' }}>주수</th>
                  <th style={{ padding: '8px 10px' }}>등록시각</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((r, idx) => (
                  <tr key={`${r.id || idx}`} style={{ borderBottom: '1px solid #f3f3f3' }}>
                    <td style={{ padding: '8px 10px' }}>{r.name}</td>
                    <td style={{ padding: '8px 10px' }}>{r.course}</td>
                    <td style={{ padding: '8px 10px' }}>{r.startDate}</td>
                    <td style={{ padding: '8px 10px' }}>{r.endDate}</td>
                    <td style={{ padding: '8px 10px' }}>{r.weeks}</td>
                    <td style={{ padding: '8px 10px' }}>{r.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationsTab;
