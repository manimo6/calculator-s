import React, { useState, useReducer, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { applyCourseConfigSetData, courseConfigSetName, courseInfo, resetCourseConfigSetData, type CourseInfo } from '../../utils/data';
import { createCartItem, calculateTotalFee } from '../../utils/calculatorLogic';
import { generateClipboardText } from '../../utils/clipboardUtils';
import { loadClipboardHistory, saveClipboardHistoryEntry, CLIPBOARD_HISTORY_LIMIT } from '../../utils/clipboardHistory';
import { normalizeCourseConfigSets, type CourseConfigSet } from '../../features/admin/courseConfigSets/utils';
import CourseSelector from './CourseSelector';
import SingleCourseOptions from './SingleCourseOptions';
import CartList from './CartList';
import Modal from '../common/Modal';
import HistoryModal from './HistoryModal';
import { apiClient } from '../../api-client';
import CourseConfigSetPicker from '../../features/admin/courseConfigSets/CourseConfigSetPicker';
import { useAuth } from '../../auth-context';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ClipboardClock, Copy, Layers, Plus, Save, History, ShoppingCart, AlertCircle, Undo2, UserRoundCog } from "lucide-react";

type SingleCourseInputs = {
    startDate: string
    period: number
    courseType: string
    drwLevel: string
    excludeMath: boolean
    selectedSatCampus: string
    selectedDynamicTime: string
    recordingEnabled: boolean
    recordingDates: string[]
    skipWeeks: number[]
    skipWeeksEnabled: boolean
}

type CartItem = {
    id: number
    studentName: string
    mainCourseKey: string
    discount: number
    singleCourseInputs: SingleCourseInputs
    selectedRecordingDates: string[]
    displayCourseName: string
    finalFee: number
    normalFee: number
    recordingFee: number
    details: {
        durationStr: string
        timeStr: string
        totalFee: number
        rawStartDate: Date | null
        rawEndDate: Date | null
    }
    totalDays: number
    recordingDays: number
}

type FormState = {
    studentName: string
    discount: number
    mainCourseKey: string | null
    singleCourseInputs: SingleCourseInputs
    cart: CartItem[]
}

type FormAction =
    | { type: 'SET_STUDENT_NAME'; payload: string }
    | { type: 'SET_DISCOUNT'; payload: number }
    | { type: 'SELECT_COURSE'; payload: string | null }
    | { type: 'UPDATE_SINGLE_INPUT'; field: keyof SingleCourseInputs | string; value: unknown }
    | { type: 'UPDATE_RECORDING_DATES'; payload: string[] }
    | { type: 'ADD_TO_CART'; payload: CartItem }
    | { type: 'REMOVE_FROM_CART'; payload: number }
    | { type: 'LOAD_HISTORY_RECORD'; payload: { key: string; inputs: Partial<SingleCourseInputs> } }
    | { type: 'RESET_AFTER_SAVE' }
    | { type: 'RESET_FOR_CONFIG' }

type ClipboardHistoryEntry = {
    id: string
    studentName: string
    createdAt: string
    text: string
    courses: string[]
    totalFee: number
}

type HistoryRecord = {
    id?: string
    name?: string
    course?: string
    courseId?: string
    startDate?: string
    endDate?: string
    weeks?: string | number
    skipWeeks?: number[]
    excludeMath?: boolean
    recordingDates?: string[]
} & Record<string, unknown>

type TextbookInfo = {
    textbookOption: TextbookOption
    textbookAmount: number
    customNote: string
}

type TextbookOption = 'none' | 'tbd' | 'amount'

type TextbookFields = {
    defaultOption?: string
    defaultAmount?: number
    onlineOption?: string
    onlineAmount?: number
    offlineOption?: string
    offlineAmount?: number
    customNote?: string
}

const COURSE_CONFIG_SET_STORAGE_KEY = "courseConfigSet.selected:calculator";
const SETTINGS_UPDATED_KEY = "settings.updatedAt";
const COURSE_CONFIG_SETS_UPDATED_KEY = "courseConfigSets.updatedAt";

const getCourseConfigSetStorageKey = (scope?: string) => {
    const safeScope = String(scope || "").trim();
    return safeScope ? `${COURSE_CONFIG_SET_STORAGE_KEY}:${safeScope}` : "";
};

const readStoredCourseConfigSet = (scope?: string) => {
    if (typeof window === "undefined") return "";
    try {
        const key = getCourseConfigSetStorageKey(scope);
        if (!key) return "";
        return String(localStorage.getItem(key) || "").trim();
    } catch {
        return "";
    }
};

const writeStoredCourseConfigSet = (scope: string | undefined, value: string) => {
    if (typeof window === "undefined") return;
    try {
        const nextValue = String(value || "").trim();
        const key = getCourseConfigSetStorageKey(scope);
        if (!key) return;
        if (!nextValue) {
            localStorage.removeItem(key);
            return;
        }
        localStorage.setItem(key, nextValue);
    } catch {
        // Ignore storage errors (private mode, quota, etc.)
    }
};

const initialState: FormState = {
    studentName: '',
    discount: 0,

    // Single Course Input State
    mainCourseKey: null,
    singleCourseInputs: {
        startDate: '',
        period: 1,
        courseType: '', // '온라인' | '오프라인'
        drwLevel: '',
        excludeMath: false,
        selectedSatCampus: '',
        selectedDynamicTime: '',
        recordingEnabled: false,
        recordingDates: [],
        skipWeeks: [],
        skipWeeksEnabled: false,
    },

    cart: []
};

function formReducer(state: FormState, action: FormAction) {
    switch (action.type) {
        case 'SET_STUDENT_NAME':
            return { ...state, studentName: action.payload };
        case 'SET_DISCOUNT':
            return { ...state, discount: action.payload };
        case 'SELECT_COURSE':
            return {
                ...state,
                mainCourseKey: action.payload,
                singleCourseInputs: { ...initialState.singleCourseInputs } // Reset start date when course changes
            };
        case 'UPDATE_SINGLE_INPUT':
            return {
                ...state,
                singleCourseInputs: {
                    ...state.singleCourseInputs,
                    [action.field]: action.value as SingleCourseInputs[keyof SingleCourseInputs]
                }
            };
        case 'UPDATE_RECORDING_DATES':
            return {
                ...state,
                singleCourseInputs: { ...state.singleCourseInputs, recordingDates: action.payload }
            };
        case 'ADD_TO_CART':
            return {
                ...state,
                cart: [...state.cart, action.payload],
                // Reset single inputs after add? optional.
                mainCourseKey: null,
                singleCourseInputs: { ...initialState.singleCourseInputs, startDate: state.singleCourseInputs.startDate }
            };
        case 'REMOVE_FROM_CART':
            return {
                ...state,
                cart: state.cart.filter(item => item.id !== action.payload)
            };
        case 'LOAD_HISTORY_RECORD':
            return {
                ...state,
                mainCourseKey: action.payload.key,
                singleCourseInputs: { ...state.singleCourseInputs, ...action.payload.inputs }
            };
        case 'RESET_AFTER_SAVE': {
            const preservedStartDate = state.singleCourseInputs?.startDate || '';
            return {
                ...initialState,
                singleCourseInputs: { ...initialState.singleCourseInputs, startDate: preservedStartDate }
            };
        }
        case 'RESET_FOR_CONFIG': {
            const preservedName = state.studentName || '';
            return {
                ...initialState,
                studentName: preservedName
            };
        }
        default:
            return state;
    }
}

const parseMonthStart = (value: string | null | undefined) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const [year, month] = raw.split("-").map(Number);
    if (!year || !month) return null;
    const date = new Date(year, month - 1, 1);
    return Number.isNaN(date.getTime()) ? null : date;
};

const parseMonthEnd = (value: string | null | undefined) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const [year, month] = raw.split("-").map(Number);
    if (!year || !month) return null;
    const date = new Date(year, month, 0);
    return Number.isNaN(date.getTime()) ? null : date;
};

const resolveCalendarRange = (settings: { calendarRange?: { minMonth?: string; maxMonth?: string } } | null | undefined) => {
    const range = settings?.calendarRange || {};
    const minDate = parseMonthStart(range.minMonth);
    const maxDate = parseMonthEnd(range.maxMonth);
    if (minDate && maxDate && minDate > maxDate) {
        return { minDate: null, maxDate: null };
    }
    return { minDate, maxDate };
};
const formatHistoryDate = (value: string | number | Date | null | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString('ko-KR');
};

const formatHistoryCourseSummary = (entry: ClipboardHistoryEntry | null | undefined) => {
    const courses = Array.isArray(entry?.courses) ? entry.courses.filter(Boolean) : [];
    if (courses.length === 0) return '';
    if (courses.length === 1) return courses[0];
    return `${courses[0]} 외 ${courses.length - 1}개`;
};

const formatHistoryMeta = (entry: ClipboardHistoryEntry | null | undefined) => {
    const parts = [];
    const savedAt = formatHistoryDate(entry?.createdAt);
    if (savedAt) parts.push(savedAt);
    const courseSummary = formatHistoryCourseSummary(entry);
    if (courseSummary) parts.push(courseSummary);
    const totalFee = Number.isFinite(entry?.totalFee) ? (entry?.totalFee ?? 0) : 0;
    if (totalFee > 0) parts.push(`${totalFee.toLocaleString()}원`);
    return parts.join(' · ');
};

const resolveTextbookInfo = (item: CartItem | null | undefined): TextbookInfo => {
    if (!item) {
        return { textbookOption: 'none', textbookAmount: 0, customNote: '' };
    }

    const courseKey = item.mainCourseKey;
    const info = courseInfo[courseKey] || {};
    const textbook = (info.textbook || {}) as TextbookFields;
    const courseType = item?.singleCourseInputs?.courseType;

    let textbookOption: TextbookOption = (textbook.defaultOption as TextbookOption) || 'none';
    let textbookAmount = Number(textbook.defaultAmount || 0);

    if (courseType === '온라인') {
        textbookOption = (textbook.onlineOption as TextbookOption) || (textbook.defaultOption as TextbookOption) || 'none';
        textbookAmount = Number(textbook.onlineAmount || textbook.defaultAmount || 0);
    } else if (courseType === '오프라인') {
        textbookOption = (textbook.offlineOption as TextbookOption) || (textbook.defaultOption as TextbookOption) || 'none';
        textbookAmount = Number(textbook.offlineAmount || textbook.defaultAmount || 0);
    }

    if (textbookOption !== 'amount') {
        textbookAmount = 0;
    }

    return {
        textbookOption,
        textbookAmount: Number.isFinite(textbookAmount) ? textbookAmount : 0,
        customNote: (textbook.customNote || '').trim()
    };
};

type CourseConfigSetSidebarProps = {
    courseConfigSetList: string[]
    selectedCourseConfigSet: string
    onSelectCourseConfigSet: (value: string) => void
    storageScope: string
    disabled?: boolean
    isSetPickerOpen: boolean
    onSetPickerOpenChange: (open: boolean) => void
    isEditing: boolean
    onCancelEdit: () => void
    onOpenClipboardHistory: () => void
    onOpenHistory: () => void
}

const CourseConfigSetSidebar = ({
    courseConfigSetList,
    selectedCourseConfigSet,
    onSelectCourseConfigSet,
    storageScope,
    disabled,
    isSetPickerOpen,
    onSetPickerOpenChange,
    isEditing,
    onCancelEdit,
    onOpenClipboardHistory,
    onOpenHistory
}: CourseConfigSetSidebarProps) => {
    const isSidebarPinned = !!isSetPickerOpen;
    const ActionButton = ({ icon: Icon, label, onClick, disabled: actionDisabled = false }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; disabled?: boolean }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={actionDisabled}
            className={`flex h-9 w-full items-center gap-2 rounded-lg px-1.5 text-xs leading-none transition-colors ${actionDisabled ? 'cursor-not-allowed opacity-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
            <span className="flex h-8 w-8 items-center justify-center text-foreground">
                <Icon className="h-4 w-4" />
            </span>
            <span
                className={`overflow-hidden text-xs font-medium transition-all duration-200 ${isSidebarPinned ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100'}`}
            >
                {label}
            </span>
        </button>
    );

    return (
        <>
            <div className="md:hidden">
                <div className="max-w-7xl mx-auto px-4 pt-4 mb-6">
                    <Card className="rounded-2xl border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            설정 세트 전환
                        </div>
                        <div className="mt-3">
                            <CourseConfigSetPicker
                                courseConfigSetList={courseConfigSetList}
                                selectedCourseConfigSet={selectedCourseConfigSet}
                                onSelectCourseConfigSet={onSelectCourseConfigSet}
                                storageScope={storageScope}
                                label=""
                                placeholder="설정 세트를 선택하세요"
                                disabled={disabled}
                                showClear={false}
                            />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {isEditing ? (
                                <Button variant="outline" size="sm" onClick={onCancelEdit}>
                                    <Undo2 className="mr-2 h-4 w-4" /> 수정취소
                                </Button>
                            ) : null}
                            <Button variant="outline" size="sm" onClick={onOpenClipboardHistory}>
                                <ClipboardClock className="mr-2 h-4 w-4" /> 최근 안내문
                            </Button>
                            <Button variant="outline" size="sm" onClick={onOpenHistory}>
                                <History className="mr-2 h-4 w-4" /> 기록 불러오기
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <Link to="/sehan">
                                    <UserRoundCog className="mr-2 h-4 w-4" /> 관리자페이지
                                </Link>
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
            <div className="hidden md:block">
                <div className="fixed left-4 top-1/2 z-40 -translate-y-1/2">
                    <div className={`group relative flex flex-col gap-1 rounded-2xl border border-border/60 bg-white/80 p-2 shadow-lg backdrop-blur transition-[width] duration-200 hover:w-64 ${isSidebarPinned ? 'w-64' : 'w-12'}`}>
                        <CourseConfigSetPicker
                            courseConfigSetList={courseConfigSetList}
                            selectedCourseConfigSet={selectedCourseConfigSet}
                            onSelectCourseConfigSet={onSelectCourseConfigSet}
                            storageScope={storageScope}
                            label=""
                            placeholder="설정 세트를 선택하세요"
                            disabled={disabled}
                            showClear={false}
                            popoverSide="right"
                            popoverAlign="start"
                            open={isSetPickerOpen}
                            onOpenChange={onSetPickerOpenChange}
                            triggerClassName="h-9 w-full justify-start border-transparent bg-transparent px-1.5 text-xs leading-none text-muted-foreground shadow-none hover:bg-muted"
                            triggerContent={(
                                <div className="flex w-full items-center gap-2 leading-none">
                                    <span className="flex h-8 w-8 items-center justify-center text-foreground">
                                        <Layers className="h-4 w-4" />
                                    </span>
                                    <span className={`overflow-hidden text-xs font-semibold transition-all duration-200 ${isSidebarPinned ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100'}`}>
                                        설정 세트 전환
                                    </span>
                                </div>
                            )}
                        />
                        {isEditing ? (
                            <ActionButton
                                icon={Undo2}
                                label="수정취소"
                                onClick={onCancelEdit}
                            />
                        ) : null}
                        <ActionButton
                            icon={ClipboardClock}
                            label="최근 안내문"
                            onClick={onOpenClipboardHistory}
                        />
                        <ActionButton
                            icon={History}
                            label="기록 불러오기"
                            onClick={onOpenHistory}
                        />
                        <Link
                            to="/sehan"
                            className="flex h-9 w-full items-center gap-2 rounded-lg px-1.5 text-xs leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <span className="flex h-8 w-8 items-center justify-center text-foreground">
                                <UserRoundCog className="h-4 w-4" />
                            </span>
                            <span className={`overflow-hidden text-xs font-medium transition-all duration-200 ${isSidebarPinned ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100'}`}>
                                관리자페이지
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

const StudentForm = () => {
    const { user } = useAuth();
    const storageScope = String(user?.username || '').trim();
    const [state, dispatch] = useReducer(formReducer, initialState);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [calendarRange, setCalendarRange] = useState<{ minDate: Date | null; maxDate: Date | null }>({ minDate: null, maxDate: null });

    // Real-time preview calculation
    const [previewFee, setPreviewFee] = useState(0);

    // New States
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savedClipboardText, setSavedClipboardText] = useState('');
    const [canCopy, setCanCopy] = useState(false);
    const [clipboardHistory, setClipboardHistory] = useState<ClipboardHistoryEntry[]>([]);
    const [isClipboardHistoryOpen, setIsClipboardHistoryOpen] = useState(false);
    const [courseConfigSetList, setCourseConfigSetList] = useState<string[]>([]);
    const [courseConfigSetMap, setCourseConfigSetMap] = useState<Record<string, unknown>>({});
    const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState(() => {
        const stored = readStoredCourseConfigSet(storageScope);
        return stored;
    });
    const [isCourseConfigSetLoading, setIsCourseConfigSetLoading] = useState(false);
    const [isSetPickerOpen, setIsSetPickerOpen] = useState(false);
    const refreshCooldownRef = useRef(0);
    const courseConfigSetLoadingRef = useRef(false);

    useEffect(() => {
        const stored = readStoredCourseConfigSet(storageScope);
        setSelectedCourseConfigSet(stored);
        if (!stored) {
            resetCourseConfigSetData();
            setEditingId(null);
            setErrorMsg(null);
            setIsHistoryOpen(false);
            setIsClipboardHistoryOpen(false);
            setSavedClipboardText('');
            setCanCopy(false);
            dispatch({ type: 'RESET_FOR_CONFIG' });
        }
    }, [storageScope]);

    // Helper: Trigger Legacy Toast
    const showToast = useCallback((message: string) => {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.innerText = message;
            toast.style.visibility = 'visible';
            toast.style.opacity = '1';

            setTimeout(() => {
                toast.style.visibility = 'hidden';
                toast.style.opacity = '0';
            }, 3000);
        }
    }, []);

    const loadCalendarRange = useCallback(async () => {
        try {
            const res = await apiClient.getSettings();
            const nextRange = resolveCalendarRange(res?.settings || {});
            setCalendarRange(nextRange);
        } catch (e) {
            setCalendarRange({ minDate: null, maxDate: null });
        }
    }, []);

    const loadCourseConfigSets = useCallback(async (options: { forceApply?: boolean } = {}) => {
        if (courseConfigSetLoadingRef.current) return;
        courseConfigSetLoadingRef.current = true;
        const { forceApply = false } = options;
        setIsCourseConfigSetLoading(true);
        try {
            const raw = await apiClient.listCourseConfigSets();
            const normalized = normalizeCourseConfigSets(raw);
            const names = normalized
                .map((item) => String(item?.name || '').trim())
                .filter(Boolean)
                .sort((a, b) => b.localeCompare(a, 'ko-KR'));
            const map: Record<string, CourseConfigSet['data']> = {};
            normalized.forEach((item) => {
                if (item?.name) {
                    map[item.name] = item.data;
                }
            });
            setCourseConfigSetList(names);
            setCourseConfigSetMap(map);
            const storedSelected = readStoredCourseConfigSet(storageScope);
            const storedValid = storedSelected && names.includes(storedSelected);
            if (storedSelected && !storedValid) {
                writeStoredCourseConfigSet(storageScope, "");
            }
            const nextSelected = storedValid
                ? storedSelected
                : selectedCourseConfigSet && names.includes(selectedCourseConfigSet)
                    ? selectedCourseConfigSet
                    : '';
            if (nextSelected !== selectedCourseConfigSet) {
                setSelectedCourseConfigSet(nextSelected);
            }
            const hasProgress =
                editingId ||
                state.cart.length > 0 ||
                state.mainCourseKey;
            const shouldApply = forceApply || !hasProgress;
            if (nextSelected && map[nextSelected] && shouldApply) {
                applyCourseConfigSetData(nextSelected, map[nextSelected]);
            } else if (!nextSelected && shouldApply) {
                resetCourseConfigSetData();
            }
        } catch (e) {
            setCourseConfigSetList([]);
            setCourseConfigSetMap({});
            showToast('설정 세트를 불러오지 못했습니다.');
        } finally {
            courseConfigSetLoadingRef.current = false;
            setIsCourseConfigSetLoading(false);
        }
    }, [
        editingId,
        selectedCourseConfigSet,
        showToast,
        state.cart.length,
        state.mainCourseKey,
        resetCourseConfigSetData,
        storageScope,
    ]);

    
    useEffect(() => {
        const history = loadClipboardHistory() as ClipboardHistoryEntry[];
        setClipboardHistory(history);
    }, []);

    useEffect(() => {
        loadCourseConfigSets();
    }, [loadCourseConfigSets]);

    useEffect(() => {
        loadCalendarRange();
    }, [loadCalendarRange]);

    useEffect(() => {
        const handleRefresh = () => {
            if (document.visibilityState && document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - refreshCooldownRef.current < 500) return;
            refreshCooldownRef.current = now;
            loadCourseConfigSets({ forceApply: true });
            loadCalendarRange();
        };

        window.addEventListener('focus', handleRefresh);
        document.addEventListener('visibilitychange', handleRefresh);

        return () => {
            window.removeEventListener('focus', handleRefresh);
            document.removeEventListener('visibilitychange', handleRefresh);
        };
    }, [loadCalendarRange, loadCourseConfigSets]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleSettingsUpdated = () => {
            loadCalendarRange();
        };
        const handleCourseConfigSetsUpdated = () => {
            loadCourseConfigSets({ forceApply: true });
        };
        const handleStorage = (event: StorageEvent) => {
            if (!event) return;
            if (event.key === SETTINGS_UPDATED_KEY) {
                handleSettingsUpdated();
            }
            if (event.key === COURSE_CONFIG_SETS_UPDATED_KEY) {
                handleCourseConfigSetsUpdated();
            }
        };

        window.addEventListener('settings:updated', handleSettingsUpdated);
        window.addEventListener('course-config-sets:updated', handleCourseConfigSetsUpdated);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('settings:updated', handleSettingsUpdated);
            window.removeEventListener('course-config-sets:updated', handleCourseConfigSetsUpdated);
            window.removeEventListener('storage', handleStorage);
        };
    }, [loadCalendarRange, loadCourseConfigSets]);

    useEffect(() => {
        if (state.mainCourseKey) {
            // Calculate only if valid
            const inputs = {
                mainCourseKey: state.mainCourseKey,
                discount: state.discount,
                singleCourseInputs: state.singleCourseInputs
            };
            const result = calculateTotalFee(inputs);
            setPreviewFee(result.totalFee || 0);
        } else {
            setPreviewFee(0);
        }
    }, [state.mainCourseKey, state.discount, state.singleCourseInputs]);

    const handleSelectCourse = (key: string) => {
        setCanCopy(false);
        setSavedClipboardText('');
        dispatch({ type: 'SELECT_COURSE', payload: key });
    };

    const handleSelectCourseConfigSet = (name: string) => {
        const nextName = String(name || '').trim();
        if (!nextName) return;
        if (nextName === selectedCourseConfigSet) return;

        const hasProgress =
            editingId ||
            state.cart.length > 0 ||
            state.mainCourseKey;

        if (hasProgress) {
            const ok = confirm(
                '현재 입력 중인 내용이 초기화됩니다. 설정 세트를 전환할까요?'
            );
            if (!ok) return;
        }

        const data = courseConfigSetMap[nextName];
        if (!data) {
            showToast('설정 세트를 찾지 못했습니다.');
            return;
        }

        const applied = applyCourseConfigSetData(nextName, data);
        if (!applied) {
            showToast('설정 세트 데이터를 불러오지 못했습니다.');
            return;
        }

        writeStoredCourseConfigSet(storageScope, nextName);
        setSelectedCourseConfigSet(nextName);
        setCanCopy(false);
        setSavedClipboardText('');
        setEditingId(null);
        setErrorMsg(null);
        setIsHistoryOpen(false);
        setIsClipboardHistoryOpen(false);
        dispatch({ type: 'RESET_FOR_CONFIG' });
        showToast(`설정 세트가 '${nextName}'으로 변경되었습니다.`);
    };

    const handleCopyHistory = (entry: ClipboardHistoryEntry) => {
        if (!entry?.text) {
            showToast("복사할 안내문이 없습니다.");
            return;
        }
        navigator.clipboard.writeText(entry.text).then(() => {
            showToast("안내 문구가 복사되었습니다.");
        }).catch(() => {
            showToast("복사 실패 (브라우저 권한 확인 필요)");
        });
    };

    const handleAddToCart = () => {
        try {
            const normalizedStudentName = (state.studentName || '').trim();
            if (!normalizedStudentName) {
                setErrorMsg("학생 이름을 입력해주세요.");
                return;
            }

            const cartStudentName = (state.cart[0]?.studentName || '').trim();
            if (state.cart.length > 0 && cartStudentName && cartStudentName !== normalizedStudentName) {
                setErrorMsg(
                    `한 번의 계산에는 한 학생만 담을 수 있습니다.\n현재 장바구니 학생: ${cartStudentName}\n입력된 학생: ${normalizedStudentName}`
                );
                return;
            }

            if (!state.mainCourseKey) {
                setErrorMsg("과목을 선택해주세요.");
                return;
            }
            const item = createCartItem({
                studentName: normalizedStudentName,
                mainCourseKey: state.mainCourseKey,
                discount: state.discount,
                singleCourseInputs: state.singleCourseInputs
            }, state.cart) as CartItem;

            dispatch({ type: 'ADD_TO_CART', payload: item });
            setCanCopy(false);
            setSavedClipboardText('');
            showToast("과목이 목록에 추가되었습니다.");
        } catch (e) {
            const message = e instanceof Error ? e.message : '과목 추가에 실패했습니다.';
            setErrorMsg(message);
        }
    };

    const handleSave = async () => {
        setCanCopy(false);
        setSavedClipboardText('');

        if (editingId && state.cart.length > 0) {
            setErrorMsg("수정 모드에서는 담긴 과목을 사용할 수 없습니다.\n오른쪽 목록을 비운 뒤 다시 시도해주세요.");
            return;
        }

        const normalizedStudentName = (state.studentName || '').trim();

        let itemsToSave: CartItem[] = [];
        let studentNameForSave = "";

        if (state.cart.length > 0) {
            itemsToSave = state.cart;

            const cartStudentName = (state.cart[0]?.studentName || '').trim();
            if (!cartStudentName) {
                setErrorMsg("학생 이름을 입력해주세요.");
                return;
            }

            const hasMixedStudents = state.cart.some(item =>
                ((item.studentName || '').trim() !== cartStudentName)
            );
            if (hasMixedStudents) {
                setErrorMsg("한 번의 계산에는 한 학생만 담을 수 있습니다.\n오른쪽 목록을 비운 뒤 다시 담아주세요.");
                return;
            }

            if (normalizedStudentName && normalizedStudentName !== cartStudentName) {
                setErrorMsg("학생 이름이 장바구니와 다릅니다.\n오른쪽 목록을 비운 뒤 다시 담아주세요.");
                return;
            }

            studentNameForSave = cartStudentName;
        } else {
            // Validate and create single item
            if (!state.mainCourseKey) {
                setErrorMsg("저장할 과목이 없습니다.");
                return;
            }
            if (!normalizedStudentName) {
                setErrorMsg("학생 이름을 입력해주세요.");
                return;
            }
            try {
                const item = createCartItem({
                    studentName: normalizedStudentName,
                    mainCourseKey: state.mainCourseKey,
                    discount: state.discount,
                    singleCourseInputs: state.singleCourseInputs
                }, []) as CartItem;
                itemsToSave = [item];
                studentNameForSave = item.studentName;
            } catch (e) {
                const message = e instanceof Error ? e.message : '저장할 과목을 확인해 주세요.';
                setErrorMsg(message);
                return;
            }
        }

        // Prepare records for API
        const records = itemsToSave.map(item => ({
            id: editingId || undefined,
            name: studentNameForSave,
            course: item.displayCourseName,
            courseId: item.mainCourseKey,
            courseConfigSetName,
            startDate: item.details.rawStartDate ? new Date(item.details.rawStartDate).toISOString().split('T')[0] : (item.singleCourseInputs.startDate || ''),
            endDate: item.details.rawEndDate ? new Date(item.details.rawEndDate).toISOString().split('T')[0] : '',
            weeks: item.singleCourseInputs.period,
            skipWeeks: item.singleCourseInputs.skipWeeks || [],
            excludeMath: !!item.singleCourseInputs.excludeMath,
            recordingDates: item.selectedRecordingDates,
            tuitionFee: Number.isFinite(item.finalFee) ? Math.round(item.finalFee) : null,
            timestamp: new Date().toISOString()
        }));

        try {
            if (editingId && records.length === 1) {
                await apiClient.updateStudent(editingId, records[0]);
                showToast("기록이 수정되었습니다.");
                setEditingId(null);
            } else {
                await apiClient.addStudents(records);
                showToast("계산 결과가 저장되었습니다.");
            }

            try {
                const textbookInfo = resolveTextbookInfo(itemsToSave[0]);
                const cartForClipboard = itemsToSave.map((item) => {
                    const info = resolveTextbookInfo(item);
                    return {
                        ...item,
                        textbookOption: info.textbookOption,
                        textbookAmount: info.textbookAmount,
                        customNote: info.customNote
                    };
                });
                const text = generateClipboardText({
                    studentName: studentNameForSave,
                    cart: cartForClipboard,
                    textbookOption: textbookInfo.textbookOption,
                    textbookAmount: textbookInfo.textbookAmount,
                    customNote: textbookInfo.customNote
                });
                setSavedClipboardText(text);
                setCanCopy(true);
                const nextHistory = saveClipboardHistoryEntry({
                    studentName: studentNameForSave,
                    createdAt: new Date().toISOString(),
                    text,
                    courses: itemsToSave.map((item) => item.displayCourseName).filter(Boolean),
                    totalFee: itemsToSave.reduce((sum, item) => sum + (item.finalFee || 0), 0)
                }) as ClipboardHistoryEntry[];
                setClipboardHistory(nextHistory);
            } catch (e) {
                setCanCopy(false);
                setSavedClipboardText('');
                const message = e instanceof Error ? e.message : '안내문 생성에 실패했습니다.';
                showToast(message);
            }

            dispatch({ type: 'RESET_AFTER_SAVE' });
        } catch (e) {
            const message = e instanceof Error ? e.message : '저장 실패: 알 수 없는 오류가 발생했습니다.';
            setErrorMsg("저장 실패: " + message);
        }
    };

    const handleCancelEdit = () => {
        setCanCopy(false);
        setSavedClipboardText('');
        setEditingId(null);
        dispatch({ type: 'RESET_AFTER_SAVE' });
        showToast("수정 모드가 취소되었습니다.");
    };

    const handleCopy = () => {
        if (!canCopy || !savedClipboardText) {
            showToast("먼저 '계산 및 저장하기'에서 저장을 완료한 뒤 복사할 수 있어요.");
            return;
        }

        navigator.clipboard.writeText(savedClipboardText).then(() => {
            showToast("안내 문구가 복사되었습니다.");
        }).catch(() => {
            showToast("복사 실패 (브라우저 권한 확인 필요)");
        });
    };

    const handleLoadHistory = (record: HistoryRecord) => {
        setCanCopy(false);
        setSavedClipboardText('');

        let foundKey = '';
        const normalizedCourseId = String(record?.courseId || '').trim();
        if (normalizedCourseId && courseInfo[normalizedCourseId]) {
            foundKey = normalizedCourseId;
        }

        if (!foundKey) {
            const courseLabel = String(record?.course || '');
            foundKey = Object.keys(courseInfo).find((k) => {
                const info = courseInfo[k];
                return info?.name === courseLabel;
            }) || '';
        }

        if (!foundKey) {
            const courseLabel = String(record?.course || '');
            foundKey = Object.keys(courseInfo).find((k) => {
                const info = courseInfo[k];
                const label = String(info?.name || '');
                return label ? courseLabel.startsWith(label) : false;
            }) || '';
        }

        if (!foundKey) {
            setErrorMsg(`'${record.course}' 과목 정보를 찾을 수 없습니다. (매칭 실패)`);
            return;
        }

        const resolvedKey = foundKey;

        dispatch({ type: 'SET_STUDENT_NAME', payload: String(record?.name || '') });

        const courseLabel = String(record?.course || '');
        const inputs = {
            startDate: record?.startDate || '',
            period: parseInt(String(record?.weeks || ''), 10) || 1,
            courseType: courseLabel.includes('온라인') ? '온라인' : (courseLabel.includes('오프라인') ? '오프라인' : ''),
            drwLevel: '',
            excludeMath: Boolean(record?.excludeMath || courseLabel.includes('수학제외')),
            recordingEnabled: Array.isArray(record?.recordingDates) && record.recordingDates.length > 0,
            recordingDates: Array.isArray(record?.recordingDates) ? record.recordingDates : [],
            skipWeeks: Array.isArray(record?.skipWeeks) ? record.skipWeeks : [],
            skipWeeksEnabled: Array.isArray(record?.skipWeeks) && record.skipWeeks.length > 0
        };

        dispatch({
            type: 'LOAD_HISTORY_RECORD', payload: {
                key: resolvedKey,
                inputs: inputs
            }
        });

        setEditingId(record?.id ? String(record.id) : null);
        setIsHistoryOpen(false);
        showToast("기록을 불러왔습니다. (수정 모드)");
    };

    // Calculate total from cart + current preview
    const cartTotal = state.cart.reduce((s, i) => s + i.finalFee, 0);
    const grandTotal = cartTotal + previewFee;

    return (
        <div className="relative">
            <CourseConfigSetSidebar
                courseConfigSetList={courseConfigSetList}
                selectedCourseConfigSet={selectedCourseConfigSet}
                onSelectCourseConfigSet={handleSelectCourseConfigSet}
                storageScope={storageScope || "calculator"}
                disabled={isCourseConfigSetLoading || courseConfigSetList.length === 0}
                isSetPickerOpen={isSetPickerOpen}
                onSetPickerOpenChange={setIsSetPickerOpen}
                isEditing={!!editingId}
                onCancelEdit={handleCancelEdit}
                onOpenClipboardHistory={() => setIsClipboardHistoryOpen(true)}
                onOpenHistory={() => setIsHistoryOpen(true)}
            />
            <div id="tuitionForm" className="max-w-7xl mx-auto p-4 md:p-8 md:pl-20">
                <div className="grid grid-cols-12 gap-8 items-start">

                {/* Left Column: Input Form */}
                <div className="col-span-12 lg:col-span-7 space-y-6">
                    <Card className="rounded-[2rem] border-border shadow-sm">
                        <CardContent className="p-8 space-y-8">
                            {/* Student Name */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground ml-1">학생 이름</Label>
                                <Input
                                    type="text"
                                    value={state.studentName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setCanCopy(false);
                                        setSavedClipboardText('');
                                        dispatch({ type: 'SET_STUDENT_NAME', payload: e.target.value })
                                    }}
                                    placeholder="이름을 입력하세요"
                                    className="h-12 text-lg"
                                    disabled={state.cart.length > 0}
                                />
                                {state.cart.length > 0 ? (
                                    <p className="text-xs text-muted-foreground ml-1">
                                        과목이 담겨있는 동안에는 학생 이름을 변경할 수 없습니다. (목록을 비운 뒤 변경 가능)
                                    </p>
                                ) : null}
                            </div>

                            {/* Course Selection */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground ml-1">수강 과목</Label>
                                {!selectedCourseConfigSet ? (
                                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                                        <span>설정 세트를 먼저 선택하세요.</span>
                                    </div>
                                ) : !state.mainCourseKey ? (
                                    <CourseSelector key={selectedCourseConfigSet || 'default'} onSelect={handleSelectCourse} />
                                ) : (
                                    <div className="flex justify-between items-center p-4 bg-secondary/30 border border-border rounded-xl">
                                        <span className="font-bold text-lg text-primary ml-2">
                                            {courseInfo[state.mainCourseKey]?.name || state.mainCourseKey}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setCanCopy(false);
                                                setSavedClipboardText('');
                                                dispatch({ type: 'SELECT_COURSE', payload: null })
                                            }}
                                        >
                                            변경
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Options for Selected Course */}
                            {state.mainCourseKey && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="py-6 border-t border-border">
                                        <SingleCourseOptions
                                            selectedCourseKey={state.mainCourseKey}
                                            courseInfo={courseInfo}
                                            inputs={state.singleCourseInputs}
                                            calendarMinDate={calendarRange.minDate || undefined}
                                            calendarMaxDate={calendarRange.maxDate || undefined}
                                            onChange={(field, value) => {
                                                setCanCopy(false);
                                                setSavedClipboardText('');
                                                dispatch({ type: 'UPDATE_SINGLE_INPUT', field, value })
                                            }}
                                            onRecordingChange={(dates) => {
                                                setCanCopy(false);
                                                setSavedClipboardText('');
                                                dispatch({ type: 'UPDATE_RECORDING_DATES', payload: dates })
                                            }}
                                        />

                                        {/* Discount */}
                                        <div className="mt-8 space-y-2">
                                            <Label className="text-muted-foreground ml-1">할인 적용</Label>
                                            <Select
                                                value={String(state.discount)}
                                                onValueChange={(val) => {
                                                    setCanCopy(false);
                                                    setSavedClipboardText('');
                                                    dispatch({ type: 'SET_DISCOUNT', payload: parseFloat(val) })
                                                }}
                                            >
                                                <SelectTrigger className="h-12 rounded-xl text-lg">
                                                    <SelectValue placeholder="할인 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">할인 없음</SelectItem>
                                                    <SelectItem value="0.05">5% 할인</SelectItem>
                                                    <SelectItem value="0.10">10% 할인</SelectItem>
                                                    <SelectItem value="0.15">15% 할인</SelectItem>
                                                    <SelectItem value="0.20">20% 할인</SelectItem>
                                                    <SelectItem value="0.25">25% 할인</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Add Button */}
                                        <div className="mt-10 flex items-center justify-end gap-4">
                                            {state.mainCourseKey && (
                                                <span className="text-lg font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl">
                                                    + {previewFee.toLocaleString()}원
                                                </span>
                                            )}
                                            <Button
                                                onClick={handleAddToCart}
                                                disabled={!state.mainCourseKey || !!editingId}
                                                size="lg"
                                                className="px-8 py-6 text-lg rounded-xl shadow-md transition-transform active:scale-95"
                                            >
                                                {!!editingId ? '수정 모드 (추가 불가)' : '담기'} <Plus className="ml-2 h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Receipt / Summary */}
                <div className="col-span-12 lg:col-span-5 sticky top-6">
                    <Card className="rounded-[2rem] shadow-lg border-border overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        <CardHeader className="pt-8 px-8">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 shrink-0 relative -top-1" /> 계산 내역
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            {/* Cart Items */}
                            <div className="min-h-[200px] mb-6 space-y-4">
                                {state.cart.length === 0 && !state.mainCourseKey ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-muted rounded-2xl">
                                        <p>담긴 과목이 없습니다</p>
                                    </div>
                                ) : (
                                    <CartList cart={state.cart} onRemove={id => {
                                        setCanCopy(false);
                                        setSavedClipboardText('');
                                        dispatch({ type: 'REMOVE_FROM_CART', payload: id })
                                    }} />
                                )}

                                {/* Preview Item Ghost */}
                                {state.mainCourseKey && (
                                    <div className="p-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 opacity-70 animate-pulse">
                                        <div className="flex justify-between items-center text-primary">
                                            <span className="font-medium">(추가 예정) {courseInfo[state.mainCourseKey]?.name || ''}</span>
                                            <span className="font-bold">{previewFee.toLocaleString()}원</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator className="my-6" />

                            {/* Grand Total */}
                            <div className="flex justify-between items-end mb-8">
                                <span className="text-muted-foreground font-medium mb-1">총 예상 합계</span>
                                <span className="text-4xl font-extrabold text-foreground tracking-tight">
                                    {grandTotal.toLocaleString()}<span className="text-2xl text-muted-foreground font-medium ml-1">원</span>
                                </span>
                            </div>

                            {/* Main Actions */}
                            <div className="space-y-3">
                                <Button
                                    onClick={handleSave}
                                    variant={editingId ? "default" : "default"} // Can differ if needed
                                    className={`w-full py-6 text-lg rounded-xl shadow-lg transition-transform active:scale-95 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                    <Save className="mr-2 h-5 w-5" />
                                    {editingId ? '수정사항 저장' : '계산 및 저장하기'}
                                </Button>

                                <Button
                                    onClick={handleCopy}
                                    disabled={!canCopy}
                                    variant="secondary"
                                    className="w-full py-6 text-lg rounded-xl shadow-md bg-purple-600 text-white hover:bg-purple-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-purple-600/60 disabled:hover:bg-purple-600/60"
                                >
                                    <Copy className="mr-2 h-5 w-5" /> 안내문 복사
                                </Button>

                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Error Modal (Legacy implementation for now, or could use Dialog) */}
                <Modal isOpen={!!errorMsg} onClose={() => setErrorMsg(null)} title="알림">
                    <div className="flex flex-col items-center gap-4 p-4">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                        <p className="whitespace-pre-wrap text-foreground text-center font-medium">{errorMsg}</p>
                    </div>
                    <div className="mt-4 flex justify-center w-full">
                        <Button onClick={() => setErrorMsg(null)}>확인</Button>
                    </div>
                </Modal>

                <Dialog open={isClipboardHistoryOpen} onOpenChange={setIsClipboardHistoryOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>최근 안내문</DialogTitle>
                            <DialogDescription>최근 {CLIPBOARD_HISTORY_LIMIT}건까지 보관됩니다.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                            {clipboardHistory.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                                    저장된 안내문이 없습니다.
                                </div>
                            ) : (
                                clipboardHistory.map((entry) => (
                                    <div key={entry.id || entry.createdAt} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-foreground">{entry.studentName || "-"}</div>
                                            <div className="truncate text-sm text-muted-foreground">{formatHistoryMeta(entry)}</div>
                                        </div>
                                        <Button size="sm" onClick={() => handleCopyHistory(entry)}>복사</Button>
                                    </div>
                                ))
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsClipboardHistoryOpen(false)}>
                                닫기
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <HistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    onSelect={() => {}}
                    onEdit={handleLoadHistory}
                    editingId={editingId}
                    calendarMinDate={calendarRange.minDate || undefined}
                    calendarMaxDate={calendarRange.maxDate || undefined}
                />

            </div>
        </div>
    </div>
    );
};

export default StudentForm;
