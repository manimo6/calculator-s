import React, { useState, useEffect } from 'react';
import { fetchCourseData, courseTree, courseInfo, timeTable, recordingAvailable, weekdayName, courseToCatMap } from '../../utils/data.js';
import { apiClient } from '../../api-client.js';
import CourseModal from './CourseModal.jsx';
import CategoryModal from './CategoryModal.jsx';
import { Download, FolderPlus, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react';

const CourseManager = () => {
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(Date.now()); // trigger re-render

    // Modals
    const [modal, setModal] = useState({ type: null, props: {} });
    const [toast, setToast] = useState({ visible: false, message: '' });

    // Course config sets
    const [courseConfigSetList, setCourseConfigSetList] = useState([]);
    const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState('');

    useEffect(() => {
        loadData();
        loadCourseConfigSets();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Global Data
            // In a real app we would call API and set local state. 
            // Here we rely on 'utils/data.js' globals for legacy compatibility
            // But 'fetchCourseData' updates those globals.
            await fetchCourseData();
            setLoading(false);
            setLastUpdated(Date.now());
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const loadCourseConfigSets = async () => {
        try {
            const raw = await apiClient.listCourseConfigSets();
            const names = raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw) : [];
            names.sort((a, b) => b.localeCompare(a, 'ko-KR'));
            setCourseConfigSetList(names);
        } catch (e) {
            setCourseConfigSetList([]);
        }
    };

    const showToast = (msg) => {
        setToast({ visible: true, message: msg });
        setTimeout(() => setToast({ visible: false, message: '' }), 3000);
    };

    const rebuildCourseToCatMap = () => {
        Object.keys(courseToCatMap).forEach((k) => delete courseToCatMap[k]);
        for (const group of courseTree) {
            for (const item of group.items || []) {
                courseToCatMap[item.val] = group.cat;
            }
        }
    };

    const handleSaveCategory = (newName, originalName) => {
        const name = (newName || '').trim();
        if (!name) {
            showToast('카테고리 이름을 입력하세요.');
            return;
        }
        const dup = courseTree.find((g) => g.cat === name);
        if (dup && name !== originalName) {
            showToast('이미 존재하는 카테고리입니다.');
            return;
        }

        if (originalName) {
            const target = courseTree.find((g) => g.cat === originalName);
            if (target) target.cat = name;
        } else {
            courseTree.push({ cat: name, items: [] });
        }

        rebuildCourseToCatMap();
        setLastUpdated(Date.now());
    };

    const handleDeleteCategory = (catName) => {
        const idx = courseTree.findIndex((g) => g.cat === catName);
        if (idx === -1) return;
        const group = courseTree[idx];
        const hasItems = Array.isArray(group.items) && group.items.length > 0;
        const ok = hasItems
            ? confirm(`'${catName}' 카테고리와 포함된 수업(${group.items.length}개)을 삭제할까요?`)
            : confirm(`'${catName}' 카테고리를 삭제할까요?`);
        if (!ok) return;

        (group.items || []).forEach((item) => {
            const label = item.label;
            delete courseInfo[item.val];
            delete recordingAvailable[item.val];
            delete timeTable[item.val];
            if (label) delete timeTable[label];
        });

        courseTree.splice(idx, 1);
        rebuildCourseToCatMap();
        setLastUpdated(Date.now());
        showToast('삭제되었습니다.');
    };

    const handleSaveCourse = (formData, courseId) => {
        const name = (formData?.courseName || '').trim();
        const category = (formData?.category || '').trim();
        if (!name || !category) {
            showToast('카테고리와 수업명을 입력하세요.');
            return;
        }
        const dupCourse = courseTree
            .flatMap((g) => g.items || [])
            .find((it) => it.label === name && it.val !== courseId);
        if (dupCourse) {
            showToast('이미 존재하는 수업명입니다.');
            return;
        }

        const ensureCategory = (cat) => {
            let group = courseTree.find((g) => g.cat === cat);
            if (!group) {
                group = { cat, items: [] };
                courseTree.push(group);
            }
            return group;
        };

        const buildTimeValue = () => {
            const t = formData?.timeType || 'default';
            if (t === 'onoff') {
                return { 온라인: formData?.timeOnline || '', 오프라인: formData?.timeOffline || '' };
            }
            if (t === 'dynamic') {
                const obj = {};
                (formData?.dynamicOptions || []).forEach((opt) => {
                    const label = (opt?.label || '').trim();
                    const time = (opt?.time || '').trim();
                    if (!label) return;
                    obj[label] = time;
                });
                return obj;
            }
            return formData?.timeDefault || '';
        };

        const buildRecordingValue = () => {
            const t = formData?.timeType || 'default';
            if (t === 'onoff') {
                return { 온라인: !!formData?.isRecordingOnline, 오프라인: !!formData?.isRecordingOffline };
            }
            return !!formData?.isRecordingAvailable;
        };

        const buildCourseInfo = (key, prev) => {
            const next = { ...(prev || {}) };
            next.name = name;
            next.fee = Number(formData?.fee || 0);
            next.textbook = formData?.textbook || next.textbook || {};
            next.days = Array.isArray(formData?.days) ? formData.days : [];
            next.startDays = Array.isArray(formData?.startDays) ? formData.startDays : [];
            next.endDays = Array.isArray(formData?.endDays) ? formData.endDays : [];
            next.endDay = next.endDays?.length ? next.endDays[0] : (prev?.endDay ?? 5);
            next.min = Number(formData?.minDuration || 1);
            next.max = Number(formData?.maxDuration || 12);
            // React UI uses these fields in 일부 컴포넌트
            next.minDuration = next.min;
            next.maxDuration = next.max;
            next.hasMathOption = !!formData?.hasMathOption;
            next.mathExcludedFee = Number(formData?.mathExcludedFee || 0);
            if (formData?.timeType === 'dynamic') next.dynamicTime = true;
            else delete next.dynamicTime;
            return next;
        };

        if (courseId) {
            // Edit existing
            let fromGroup = null;
            let fromIdx = -1;
            for (const g of courseTree) {
                const i = (g.items || []).findIndex((it) => it.val === courseId);
                if (i !== -1) {
                    fromGroup = g;
                    fromIdx = i;
                    break;
                }
            }
            if (!fromGroup || fromIdx === -1) {
                showToast('수업을 찾지 못했습니다.');
                return;
            }
            const oldLabel = fromGroup.items[fromIdx].label;
            const targetGroup = ensureCategory(category);
            const item = { ...fromGroup.items[fromIdx], label: name };

            if (fromGroup !== targetGroup) {
                fromGroup.items.splice(fromIdx, 1);
                targetGroup.items.push(item);
            } else {
                fromGroup.items[fromIdx] = item;
            }

            courseInfo[courseId] = buildCourseInfo(courseId, courseInfo[courseId]);
            const nextTime = buildTimeValue();
            delete timeTable[courseId];
            if (oldLabel) delete timeTable[oldLabel];
            timeTable[name] = nextTime;
            recordingAvailable[courseId] = buildRecordingValue();
        } else {
            // Create new
            const newId = `course_${Date.now()}`;
            const targetGroup = ensureCategory(category);
            targetGroup.items.push({ val: newId, label: name });
            courseInfo[newId] = buildCourseInfo(newId, {});
            timeTable[name] = buildTimeValue();
            recordingAvailable[newId] = buildRecordingValue();
        }

        rebuildCourseToCatMap();
        setLastUpdated(Date.now());
    };

    const handleDeleteCourse = (id) => {
        if (!id) return;
        let group = null;
        let idx = -1;
        for (const g of courseTree) {
            const i = (g.items || []).findIndex((it) => it.val === id);
            if (i !== -1) {
                group = g;
                idx = i;
                break;
            }
        }
        if (!group || idx === -1) return;
        const label = group.items[idx].label;
        if (!confirm(`'${label || id}' 수업을 삭제할까요?`)) return;

        group.items.splice(idx, 1);
        delete courseInfo[id];
        delete recordingAvailable[id];
        delete timeTable[id];
        if (label) delete timeTable[label];

        rebuildCourseToCatMap();
        setLastUpdated(Date.now());
        showToast('삭제되었습니다.');
    };

    const handleSaveToServer = async () => {
        try {
            // Mock API Call - in real app, update `data` object
            const payload = {
                weekdayName, courseTree, courseInfo, timeTable, recordingAvailable
            };
            await apiClient.saveCourses(payload);
            showToast('서버에 저장되었습니다.');
        } catch (e) {
            alert('저장 실패: ' + e.message);
        }
    };

    const handleSaveCourseConfigSet = async () => {
        const name = prompt('설정 세트 이름을 입력하세요:');
        if (!name) return;
        const data = { weekdayName, courseTree, courseInfo, timeTable, recordingAvailable };
        try {
            await apiClient.saveCourseConfigSet(name, data);
            showToast(`설정 세트 '${name}'이(가) 저장되었습니다.`);
            await loadCourseConfigSets();
        } catch (e) {
            showToast(e.message || '설정 세트 저장 실패');
        }
    };

    const handleLoadCourseConfigSet = async () => {
        const name = selectedCourseConfigSet;
        if (!name) {
            showToast('불러올 설정 세트를 선택하세요.');
            return;
        }
        if (!confirm(`현재 설정이 덮어씌워집니다. '${name}' 설정 세트를 불러오시겠습니까?`)) return;
        try {
            const raw = await apiClient.listCourseConfigSets();
            const courseConfigSetData = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw[name] : null;
            if (!courseConfigSetData) {
                showToast('설정 세트 데이터를 찾지 못했습니다.');
                return;
            }

            if (courseConfigSetData.weekdayName) {
                weekdayName.length = 0;
                weekdayName.push(...courseConfigSetData.weekdayName);
            }
            courseTree.length = 0;
            courseTree.push(...(courseConfigSetData.courseTree || []));
            Object.keys(courseInfo).forEach((k) => delete courseInfo[k]);
            Object.assign(courseInfo, courseConfigSetData.courseInfo || {});
            Object.keys(timeTable).forEach((k) => delete timeTable[k]);
            Object.assign(timeTable, courseConfigSetData.timeTable || {});
            Object.keys(recordingAvailable).forEach((k) => delete recordingAvailable[k]);
            Object.assign(recordingAvailable, courseConfigSetData.recordingAvailable || {});

            rebuildCourseToCatMap();
            setLastUpdated(Date.now());
            showToast('설정 세트를 불러왔습니다.');
        } catch (e) {
            showToast(e.message || '설정 세트 불러오기 실패');
        }
    };

    const handleDeleteCourseConfigSet = async () => {
        const name = selectedCourseConfigSet;
        if (!name) {
            showToast('삭제할 설정 세트를 선택하세요.');
            return;
        }
        if (!confirm(`'${name}' 설정 세트를 삭제하시겠습니까?`)) return;
        try {
            await apiClient.deleteCourseConfigSet(name);
            showToast('설정 세트가 삭제되었습니다.');
            setSelectedCourseConfigSet('');
            await loadCourseConfigSets();
        } catch (e) {
            showToast(e.message || '설정 세트 삭제 실패');
        }
    };

    return (
        <div className="course-manager">
            {/* Header / Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>수업목록 관리</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', background: '#f8f9fa', padding: '5px 10px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#555' }}>설정 세트:</span>
                        <select
                            className="form-select"
                            style={{ width: 180, padding: '5px', fontSize: '0.9rem' }}
                            value={selectedCourseConfigSet}
                            onChange={(e) => setSelectedCourseConfigSet(e.target.value)}
                        >
                            <option value="">-- 선택 --</option>
                            {courseConfigSetList.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                         </select>
                        <button className="action-btn btn-outline" title="불러오기" aria-label="불러오기" style={{ padding: '5px 10px', fontSize: '0.9rem' }} onClick={handleLoadCourseConfigSet}>
                            <Upload className="h-4 w-4" />
                        </button>
                        <button className="action-btn btn-outline" title="설정 세트 저장" aria-label="설정 세트 저장" style={{ padding: '5px 10px', fontSize: '0.9rem' }} onClick={handleSaveCourseConfigSet}>
                            <Download className="h-4 w-4" />
                        </button>
                        <button className="action-btn btn-outline" title="삭제" aria-label="설정 세트 삭제" style={{ padding: '5px 10px', fontSize: '0.9rem', color: 'var(--danger-color)' }} onClick={handleDeleteCourseConfigSet}>
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                    <button className="action-btn btn-outline" onClick={() => setModal({ type: 'category' })}>
                        <FolderPlus className="mr-2 h-4 w-4" /> 카테고리 추가
                    </button>
                    <button className="action-btn btn-primary" onClick={() => setModal({ type: 'course' })}>
                        <Plus className="mr-2 h-4 w-4" /> 수업 추가
                    </button>
                    <button className="action-btn btn-success" onClick={handleSaveToServer}>
                        <Save className="mr-2 h-4 w-4" /> 저장
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? <div>Loading...</div> : (
                <div className="course-tree-admin">
                    {courseTree.map(group => (
                        <div key={group.cat} style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{group.cat}</span>
                                <div>
                                    <button onClick={() => setModal({ type: 'category', props: { editingCategory: group.cat } })} style={{ marginRight: '5px' }} aria-label="카테고리 수정"><Pencil className="h-4 w-4" /></button>
                                    <button onClick={() => handleDeleteCategory(group.cat)} style={{ color: 'red' }} aria-label="카테고리 삭제"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '10px' }}>
                                {group.items.map(item => {
                                    const info = courseInfo[item.val] || {};
                                    return (
                                        <div key={item.val} style={{ display: 'flex', justifyContent: 'space-between', background: '#f9f9f9', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{item.label}</div>
                                                <div style={{ fontSize: '0.85em', color: '#666' }}>
                                                    {Number(info.fee || 0).toLocaleString()}원 | {info.days ? info.days.length : 0}일
                                                </div>
                                            </div>
                                            <div>
                                                <button onClick={() => setModal({
                                                    type: 'course',
                                                    props: { editingCourseId: item.val, courseData: { category: group.cat, name: item.label, info: info, timeData: timeTable[item.val] || timeTable[item.label], recording: recordingAvailable[item.val] } }
                                                })} style={{ marginRight: '5px' }} aria-label="수업 수정"><Pencil className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteCourse(item.val)} style={{ color: 'red' }} aria-label="수업 삭제"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals commented out for debug */}
            <CategoryModal
                isOpen={modal.type === 'category'}
                onClose={() => setModal({ type: null, props: {} })}
                onSave={handleSaveCategory}
                {...modal.props}
            />
            <CourseModal
                isOpen={modal.type === 'course'}
                onClose={() => setModal({ type: null, props: {} })}
                onSave={handleSaveCourse}
                categories={courseTree}
                {...modal.props}
            />

            {/* Global Toast */}
            {toast.visible && (
                <div style={{
                    position: 'fixed', bottom: '20px', right: '20px',
                    background: '#333', color: 'white', padding: '10px 20px', borderRadius: '4px',
                    zIndex: 9999, animation: 'fadeIn 0.3s'
                }}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default CourseManager;
