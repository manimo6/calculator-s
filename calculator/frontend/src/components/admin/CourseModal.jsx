import React, { useState, useEffect, useReducer } from 'react';
import Modal from '../common/Modal.jsx';
import { weekdayName } from '../../utils/data.js';

// Initial state for the complex course form
const initialState = {
    category: '',
    courseName: '',
    fee: 0,
    textbook: {
        defaultOption: 'none', defaultAmount: 0,
        onlineOption: 'none', onlineAmount: 0,
        offlineOption: 'none', offlineAmount: 0,
        customNote: ''
    },
    days: [],
    startDays: [],
    endDays: [],
    minDuration: 1,
    maxDuration: 12,
    timeType: 'default', // default, onoff, dynamic
    timeDefault: '',
    timeOnline: '',
    timeOffline: '',
    dynamicOptions: [], // [{label, time}]

    // Recording
    isRecordingAvailable: false,
    isRecordingOnline: false,
    isRecordingOffline: false,

    // Math Option
    hasMathOption: false,
    mathExcludedFee: 0
};

function courseFormReducer(state, action) {
    switch (action.type) {
        case 'RESET': return { ...initialState, ...action.payload };
        case 'SET_FIELD': return { ...state, [action.field]: action.value };
        case 'SET_TEXTBOOK': return { ...state, textbook: { ...state.textbook, [action.key]: action.value } };
        case 'TOGGLE_DAY': {
            // Logic for checkbox arrays
            const list = state[action.field];
            const idx = action.value;
            return { ...state, [action.field]: list.includes(idx) ? list.filter(d => d !== idx) : [...list, idx] };
        }
        case 'ADD_DYNAMIC_TIME':
            return { ...state, dynamicOptions: [...state.dynamicOptions, { label: '', time: '' }] };
        case 'UPDATE_DYNAMIC_TIME': {
            const newOpts = [...state.dynamicOptions];
            newOpts[action.index][action.key] = action.value;
            return { ...state, dynamicOptions: newOpts };
        }
        case 'REMOVE_DYNAMIC_TIME':
            return { ...state, dynamicOptions: state.dynamicOptions.filter((_, i) => i !== action.index) };
        default: return state;
    }
}

const CourseModal = ({ isOpen, onClose, onSave, categories, editingCourseId, courseData }) => {
    const [state, dispatch] = useReducer(courseFormReducer, initialState);

    useEffect(() => {
        if (isOpen && categories.length > 0) {
            if (editingCourseId && courseData) {
                // Parse existing data into state
                const info = courseData.info || {};
                const timeData = courseData.timeData;
                const rec = courseData.recording; // boolean or object
                const tb = info.textbook || {};

                // Time parsing
                let tType = 'default';
                let tDefault = '', tOnline = '', tOffline = '', tDynamic = [];

                if (!timeData || typeof timeData === 'string') {
                    tType = 'default'; tDefault = timeData || '';
                } else if (timeData.type === 'onoff') {
                    tType = 'onoff'; tOnline = timeData.online; tOffline = timeData.offline;
                } else if (timeData.type === 'dynamic') {
                    tType = 'dynamic'; tDynamic = timeData.options || [];
                } else if (typeof timeData === 'object') {
                    const keys = Object.keys(timeData);
                    const hasOnOff = keys.includes('온라인') || keys.includes('오프라인');
                    if (hasOnOff) {
                        tType = 'onoff';
                        tOnline = timeData['온라인'] || '';
                        tOffline = timeData['오프라인'] || '';
                    } else {
                        tType = 'dynamic';
                        tDynamic = keys.map((k) => ({ label: k, time: timeData[k] })).filter((o) => o.label);
                    }
                }

                // Recording parsing
                let recAvail = false, recOn = false, recOff = false;
                if (typeof rec === 'object' && rec !== null) {
                    recOn = rec["온라인"]; recOff = rec["오프라인"];
                } else {
                    recAvail = !!rec;
                }

                dispatch({
                    type: 'RESET', payload: {
                        category: courseData.category,
                        courseName: courseData.name,
                        fee: info.fee || 0,
                        textbook: {
                            defaultOption: tb.defaultOption || 'none', defaultAmount: tb.defaultAmount || 0,
                            onlineOption: tb.onlineOption || 'none', onlineAmount: tb.onlineAmount || 0,
                            offlineOption: tb.offlineOption || 'none', offlineAmount: tb.offlineAmount || 0,
                            customNote: tb.customNote || ''
                        },
                        days: info.days || [],
                        startDays: info.startDays || [],
                        endDays: info.endDays || [],
                        minDuration: info.min || 1,
                        maxDuration: info.max || 12,
                        timeType: tType,
                        timeDefault: tDefault,
                        timeOnline: tOnline,
                        timeOffline: tOffline,
                        dynamicOptions: tDynamic,
                        isRecordingAvailable: recAvail,
                        isRecordingOnline: recOn,
                        isRecordingOffline: recOff,
                        hasMathOption: info.hasMathOption || false,
                        mathExcludedFee: info.mathExcludedFee || 0
                    }
                });

            } else {
                dispatch({ type: 'RESET', payload: { ...initialState, category: categories[0]?.cat || '' } });
                dispatch({ type: 'ADD_DYNAMIC_TIME' }); // Add one default slot
            }
        }
    }, [isOpen, editingCourseId, courseData]); // categories removed from dependency to avoid loop if it changes, handled by logic

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(state, editingCourseId);
        onClose();
    };

    // Helper for Day Checkboxes
    const DayCheckboxes = ({ field, type = 'checkbox' }) => (
        <div className="checkbox-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6, 0].map(d => (
                <label key={d} className="checkbox-label" style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type={type}
                        name={field}
                        checked={state[field].includes(d)}
                        onChange={() => {
                            if (type === 'radio') {
                                // For radio behavior with toggle logic if needed, but standard radio is single selection.
                                // However legacy logic allowed multiple? "End Days" checkbox in HTML was radio logic but might be array?
                                // admin.js: $('input[name="endDays"]:checked').each... It implies multiple? 
                                // HTML says `type="radio"` for endDays. So it should be single. 
                                // Wait, admin.js logs imply it pushes to array.
                                // If HTML was radio, only one can be checked. 
                                // Let's stick to array for logic simplicity, but enforce single if UI demands.
                                // React state uses valid `checked`.
                                // Let's assume multi-select is okay unless it breaks logic.
                                // Logic.js: `c.endDays[0]` -> it uses the first one.
                                // So strictly it's one. But I'll use toggle logic which works for both.
                                dispatch({ type: 'TOGGLE_DAY', field, value: d });
                            } else {
                                dispatch({ type: 'TOGGLE_DAY', field, value: d });
                            }
                        }}
                    />
                    <span style={{ marginLeft: '4px' }}>{weekdayName[d]}</span>
                </label>
            ))}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingCourseId ? "수업 수정" : "수업 추가"}>
            <form onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>

                {/* Category & Name */}
                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-col" style={{ flex: 1 }}>
                        <div className="form-group">
                            <label>카테고리</label>
                            <select
                                className="form-select"
                                value={state.category}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'category', value: e.target.value })}
                                required
                            >
                                {categories.map(c => <option key={c.cat} value={c.cat}>{c.cat}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-col" style={{ flex: 1 }}>
                        <div className="form-group">
                            <label>수업 이름</label>
                            <input
                                type="text" className="form-input" placeholder="예: 겨울특강 Math" required
                                value={state.courseName}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'courseName', value: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>수강료 (원)</label>
                    <input
                        type="number" className="form-input" required
                        value={state.fee}
                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'fee', value: parseInt(e.target.value) || 0 })}
                    />
                </div>

                {/* Duration */}
                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-col" style={{ flex: 1 }}>
                        <label>최소 기간 (주)</label>
                        <input type="number" className="form-input" min="1" value={state.minDuration} onChange={e => dispatch({ type: 'SET_FIELD', field: 'minDuration', value: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div className="form-col" style={{ flex: 1 }}>
                        <label>최대 기간 (주)</label>
                        <input type="number" className="form-input" min="1" value={state.maxDuration} onChange={e => dispatch({ type: 'SET_FIELD', field: 'maxDuration', value: parseInt(e.target.value) || 1 })} />
                    </div>
                </div>

                <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />

                {/* Time Settings */}
                <div className="form-group">
                    <label>시간 설정 방식</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <label><input type="radio" name="timeType" value="default" checked={state.timeType === 'default'} onChange={() => dispatch({ type: 'SET_FIELD', field: 'timeType', value: 'default' })} /> 기본</label>
                        <label><input type="radio" name="timeType" value="onoff" checked={state.timeType === 'onoff'} onChange={() => dispatch({ type: 'SET_FIELD', field: 'timeType', value: 'onoff' })} /> 온라인/오프라인</label>
                        <label><input type="radio" name="timeType" value="dynamic" checked={state.timeType === 'dynamic'} onChange={() => dispatch({ type: 'SET_FIELD', field: 'timeType', value: 'dynamic' })} /> 동적 시간</label>
                    </div>
                </div>

                {state.timeType === 'default' && (
                    <div className="form-group">
                        <label>수업 시간</label>
                        <input type="text" className="form-input" placeholder="예: 09:00~12:00" value={state.timeDefault} onChange={e => dispatch({ type: 'SET_FIELD', field: 'timeDefault', value: e.target.value })} />
                    </div>
                )}
                {state.timeType === 'onoff' && (
                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}> <label>온라인 시간</label> <input type="text" className="form-input" value={state.timeOnline} onChange={e => dispatch({ type: 'SET_FIELD', field: 'timeOnline', value: e.target.value })} /> </div>
                        <div style={{ flex: 1 }}> <label>오프라인 시간</label> <input type="text" className="form-input" value={state.timeOffline} onChange={e => dispatch({ type: 'SET_FIELD', field: 'timeOffline', value: e.target.value })} /> </div>
                    </div>
                )}
                {state.timeType === 'dynamic' && (
                    <div className="form-group">
                        <label>시간 옵션 목록</label>
                        {state.dynamicOptions.map((opt, i) => (
                            <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                <input type="text" placeholder="라벨" value={opt.label} onChange={e => dispatch({ type: 'UPDATE_DYNAMIC_TIME', index: i, key: 'label', value: e.target.value })} style={{ flex: 1 }} />
                                <input type="text" placeholder="시간" value={opt.time} onChange={e => dispatch({ type: 'UPDATE_DYNAMIC_TIME', index: i, key: 'time', value: e.target.value })} style={{ flex: 2 }} />
                                <button type="button" onClick={() => dispatch({ type: 'REMOVE_DYNAMIC_TIME', index: i })} style={{ color: 'red' }}>X</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => dispatch({ type: 'ADD_DYNAMIC_TIME' })} className="btn-outline btn-sm">+ 옵션 추가</button>
                    </div>
                )}

                <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />

                {/* Days */}
                <div className="form-group"><label>수업 요일</label><DayCheckboxes field="days" /></div>
                <div className="form-group"><label>시작 가능 요일</label><DayCheckboxes field="startDays" /></div>
                <div className="form-group"><label>종료 가능 요일</label><DayCheckboxes field="endDays" /></div>

                <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />

                {/* Recording */}
                <div className="form-group">
                    <label>녹화 강의 제공 가능</label>
                    {state.timeType === 'onoff' ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <label><input type="checkbox" checked={state.isRecordingOnline} onChange={e => dispatch({ type: 'SET_FIELD', field: 'isRecordingOnline', value: e.target.checked })} /> 온라인</label>
                            <label><input type="checkbox" checked={state.isRecordingOffline} onChange={e => dispatch({ type: 'SET_FIELD', field: 'isRecordingOffline', value: e.target.checked })} /> 오프라인</label>
                        </div>
                    ) : (
                        <div>
                            <label><input type="checkbox" checked={state.isRecordingAvailable} onChange={e => dispatch({ type: 'SET_FIELD', field: 'isRecordingAvailable', value: e.target.checked })} /> 가능</label>
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button type="button" className="action-btn btn-outline" onClick={onClose} style={{ marginRight: '8px' }}>취소</button>
                    <button type="submit" className="action-btn btn-primary">확인</button>
                </div>
            </form>
        </Modal>
    );
};

export default CourseModal;
