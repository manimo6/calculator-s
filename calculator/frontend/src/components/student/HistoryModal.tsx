import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import { apiClient } from '../../api-client';
import { courseConfigSetName, courseTree } from '../../utils/data';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Edit2,
    FileText,
    Loader2,
    Search,
    Trash2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const COURSE_ID_PREFIX = '__courseid__';
const COURSE_NAME_PREFIX = '__coursename__';

type HistoryItem = {
    id?: string
    name?: string
    course?: string
    courseId?: string
    startDate?: string
    endDate?: string
    weeks?: number | string
    timestamp?: string | Date
    transferToId?: string
    withdrawnAt?: string | Date
} & Record<string, unknown>

type CourseOption = { value: string; label: string }
type CourseGroup = { label: string; items: CourseOption[] }

type HistoryModalProps = {
    isOpen: boolean
    onClose: () => void
    onSelect?: (item: HistoryItem) => void
    onEdit?: (item: HistoryItem) => void
    editingId?: string | number | null
    calendarMinDate?: Date
    calendarMaxDate?: Date
}

function normalizeCourseValue(value: unknown) {
    return String(value || '').trim();
}

function makeCourseValue(courseId?: string, courseName?: string) {
    const id = normalizeCourseValue(courseId);
    if (id) return `${COURSE_ID_PREFIX}${id}`;
    const name = normalizeCourseValue(courseName);
    return name ? `${COURSE_NAME_PREFIX}${name}` : '';
}

function parseCourseValue(value: string) {
    const raw = normalizeCourseValue(value);
    if (raw.startsWith(COURSE_ID_PREFIX)) {
        return { type: 'id', value: raw.slice(COURSE_ID_PREFIX.length) };
    }
    if (raw.startsWith(COURSE_NAME_PREFIX)) {
        return { type: 'name', value: raw.slice(COURSE_NAME_PREFIX.length) };
    }
    return { type: 'name', value: raw };
}

const HistoryModal = ({
    isOpen,
    onClose,
    onSelect,
    onEdit,
    editingId,
    calendarMinDate,
    calendarMaxDate
}: HistoryModalProps) => {
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'load' | 'transfer'>('load');
    const [transferTarget, setTransferTarget] = useState<HistoryItem | null>(null);
    const [transferDate, setTransferDate] = useState('');
    const [transferPickerOpen, setTransferPickerOpen] = useState(false);
    const [transferCourseValue, setTransferCourseValue] = useState('');
    const [transferWeeks, setTransferWeeks] = useState('');
    const [transferError, setTransferError] = useState('');
    const [transferSaving, setTransferSaving] = useState(false);
    const normalizedCourseConfigSetName = String(courseConfigSetName || '').trim();

    const { courseGroups, courseOptions } = useMemo(() => {
        const groups: CourseGroup[] = [];
        const list: CourseOption[] = [];
        const seen = new Set<string>();

        for (const group of courseTree || []) {
            const groupLabel = String(group?.cat || '').trim() || '기타';
            const items = [];
            for (const item of group.items || []) {
                const value = makeCourseValue(item?.val, item?.label);
                const label = String(item?.label || '').trim();
                if (!value || !label || seen.has(value)) continue;
                seen.add(value);
                const option = { value, label };
                items.push(option);
                list.push(option);
            }
            if (items.length) {
                items.sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));
                groups.push({ label: groupLabel, items });
            }
        }

        return { courseGroups: groups, courseOptions: list };
    }, [courseTree.length, isOpen]);

    const courseOptionMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const option of courseOptions) {
            map.set(option.value, option.label);
        }
        return map;
    }, [courseOptions]);

    const courseOptionSet = useMemo(
        () => new Set(courseOptions.map((option) => option.value)),
        [courseOptions]
    );

    useEffect(() => {
        if (isOpen) {
            fetchHistory(1);
            setActiveTab('load');
        } else {
            setTransferTarget(null);
            setTransferDate('');
            setTransferPickerOpen(false);
            setTransferCourseValue('');
            setTransferWeeks('');
            setTransferError('');
        }
    }, [isOpen]);

    const fetchHistory = async (pageNum: number, search = searchTerm) => {
        setLoading(true);
        try {
            const response = await apiClient.listStudents({
                page: pageNum,
                searchTerm: search,
                ...(normalizedCourseConfigSetName
                    ? { courseConfigSetName: normalizedCourseConfigSetName }
                    : {}),
            });
            if (response) {
                setHistoryData(response.results || []);
                setPage(response.currentPage || 1);
                setTotalPages(response.totalPages || 1);
                setTotalResults(response.totalResults || 0);
            }
        } catch (e) {
            console.error(e);
            alert('기록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchHistory(1, searchTerm);
    };

    const handleDelete = async (id: string) => {
        if (editingId && String(editingId) === String(id)) return;
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        try {
            await apiClient.deleteStudent(id);
            fetchHistory(page);
        } catch (e) {
            const message = e instanceof Error ? e.message : '삭제 실패: 알 수 없는 오류가 발생했습니다.';
            alert('삭제 실패: ' + message);
        }
    };

    const handleLoadRecord = (item: HistoryItem) => {
        if (onEdit) {
            onEdit(item);
            return;
        }
        if (onSelect) onSelect(item);
    };

    const handleSelectTransfer = (item: HistoryItem) => {
        if (!item) return;
        if (item.transferToId || item.withdrawnAt) return;
        const targetValue = makeCourseValue(item?.courseId, item?.course);
        const hasTargetValue = targetValue && courseOptionSet.has(targetValue);
        setTransferTarget(item);
        setTransferDate(formatDateOnly(new Date()));
        setTransferCourseValue(hasTargetValue ? targetValue : '');
        setTransferWeeks(item?.weeks ? String(item.weeks) : '');
        setTransferError('');
    };

    const handleTransferSave = async () => {
        if (!transferTarget) return;
        if (!transferTarget.id) {
            setTransferError('전반 대상이 올바르지 않습니다.');
            return;
        }
        if (!transferDate) {
            setTransferError('전반일을 선택해 주세요.');
            return;
        }
        if (!normalizedCourseConfigSetName) {
            setTransferError('설정 세트를 불러오지 못했습니다.');
            return;
        }
        const courseValue = String(transferCourseValue || '').trim();
        if (!courseValue) {
            setTransferError('전반 과목을 선택해 주세요.');
            return;
        }

        let weeksValue = undefined;
        if (transferWeeks) {
            const parsedWeeks = Number(transferWeeks);
            if (!Number.isInteger(parsedWeeks) || parsedWeeks <= 0) {
                setTransferError('기간(주)은 1 이상 숫자로 입력해 주세요.');
                return;
            }
            weeksValue = parsedWeeks;
        }

        const parsedCourse = parseCourseValue(courseValue);
        const courseLabel = courseOptionMap.get(courseValue);
        if (!courseLabel) {
            setTransferError('전반 과목을 선택해 주세요.');
            return;
        }

        setTransferSaving(true);
        setTransferError('');
        try {
            await apiClient.transferRegistration(transferTarget.id, {
                transferDate,
                course: courseLabel,
                courseId: parsedCourse.type === 'id' ? parsedCourse.value : '',
                courseConfigSetName: normalizedCourseConfigSetName,
                ...(weeksValue ? { weeks: weeksValue } : {}),
            });
            await fetchHistory(page);
            setTransferTarget(null);
            setTransferCourseValue('');
            setTransferWeeks('');
        } catch (e) {
            const message = e instanceof Error ? e.message : '전반 처리에 실패했습니다.';
            setTransferError(message);
        } finally {
            setTransferSaving(false);
        }
    };

    const formatDate = (dateStr: string | Date | null | undefined) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            return String(dateStr);
        }
    };

    const pad2 = (value: number | string) => String(value).padStart(2, '0');
    const formatDateOnly = (value: string | Date | null | undefined) => {
        if (!value) return '';
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
            date.getDate()
        )}`;
    };

    const renderPagination = () => (
        <div className="flex items-center justify-center gap-2 pt-2">
            <button
                disabled={page <= 1}
                onClick={() => fetchHistory(page - 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-600">
                {page} / {totalPages}
            </span>
            <button
                disabled={page >= totalPages}
                onClick={() => fetchHistory(page + 1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );

    const renderHistoryList = (mode: 'load' | 'transfer') => (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {historyData.map((item) => {
                const isTransferred = !!item.transferToId;
                const isWithdrawn = !!item.withdrawnAt;
                const isSelected =
                    transferTarget && String(transferTarget.id) === String(item.id);
                const isEditing = Boolean(editingId && String(editingId) === String(item.id));
                const isDisabled = isTransferred || isWithdrawn;
                return (
                    <div
                        key={item.id}
                        className={`p-4 bg-white border rounded-xl transition-all ${
                            isSelected || isEditing
                                ? 'border-blue-300 shadow-sm'
                                : 'border-gray-100 hover:border-blue-200'
                        }`}
                    >
                        <div className="flex justify-between items-start gap-3">
                            <div>
                                <div className="font-bold text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <CalendarIcon className="w-3 h-3" />
                                    {formatDate(item.timestamp)}
                                </div>
                                <div className="text-sm text-gray-700 font-medium mt-2">
                                    {item.course}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {item.startDate && item.startDate.split('T')[0]} ~{' '}
                                    {item.endDate && item.endDate.split('T')[0]}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {isTransferred ? (
                                    <span className="text-xs font-semibold text-amber-600">
                                        전반 완료
                                    </span>
                                ) : isWithdrawn ? (
                                    <span className="text-xs font-semibold text-rose-600">
                                        퇴원
                                    </span>
                                ) : null}
                                {mode === 'transfer' ? (
                                    <button
                                        disabled={isDisabled}
                                        onClick={() => handleSelectTransfer(item)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                            isDisabled
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        {isDisabled ? '전반 불가' : '전반 선택'}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleLoadRecord(item)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700"
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                <Edit2 className="w-3 h-3" />
                                                수정
                                            </span>
                                        </button>
                                        <button
                                            disabled={isEditing}
                                            onClick={() => handleDelete(String(item.id || ''))}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                                                isEditing
                                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                <Trash2 className="w-3 h-3" />
                                                삭제
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="기록 조회">
            <Tabs
                value={activeTab}
                onValueChange={(value) => {
                    if (value === 'load' || value === 'transfer') setActiveTab(value)
                }}
                className="space-y-4"
            >
                <TabsList className="w-full">
                    <TabsTrigger value="load">기록 불러오기</TabsTrigger>
                    <TabsTrigger value="transfer">전반</TabsTrigger>
                </TabsList>

                <TabsContent value="load" className="space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSearch();
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2 text-sm"
                                placeholder="학생 이름으로 검색"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                        >
                            검색
                        </button>
                    </div>

                    <div className="space-y-3 min-h-[240px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-[240px] text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <span>로딩 중...</span>
                            </div>
                        ) : historyData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[240px] text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                                <FileText className="w-8 h-8 mb-2 opacity-50" />
                                <span>기록이 없습니다.</span>
                            </div>
                        ) : (
                            renderHistoryList('load')
                        )}
                    </div>

                    {renderPagination()}
                    <div className="text-xs text-gray-400 text-center">
                        전체 {totalResults}건
                    </div>
                </TabsContent>

                <TabsContent value="transfer" className="space-y-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                        {transferTarget ? (
                            <div className="space-y-1">
                                <div className="font-semibold text-gray-900">
                                    {transferTarget?.name || '-'}
                                </div>
                                <div className="text-gray-600">
                                    {transferTarget?.course || '-'}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {transferTarget?.startDate?.split('T')[0]} ~{' '}
                                    {transferTarget?.endDate?.split('T')[0]}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500">
                                아래 목록에서 전반할 기록을 선택해 주세요.
                            </div>
                        )}
                    </div>

                    {transferTarget ? (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">전반일</Label>
                                <Popover
                                    open={transferPickerOpen}
                                    onOpenChange={setTransferPickerOpen}
                                >
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "h-12 w-full justify-between rounded-xl text-left font-normal",
                                            !transferDate && "text-muted-foreground"
                                        )}
                                    >
                                        {transferDate
                                            ? format(new Date(transferDate), 'PPP', {
                                                  locale: ko,
                                              })
                                            : '날짜를 선택해 주세요'}
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto border-none bg-transparent p-0 shadow-none"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={
                                                transferDate
                                                    ? new Date(transferDate)
                                                    : undefined
                                            }
                                            onSelect={(date) => {
                                                if (!(date instanceof Date)) return;
                                                setTransferDate(format(date, 'yyyy-MM-dd'));
                                                setTransferPickerOpen(false);
                                            }}
                                            minDate={calendarMinDate || undefined}
                                            maxDate={calendarMaxDate || undefined}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">전반 과목</Label>
                                <Select
                                    value={transferCourseValue}
                                    onValueChange={setTransferCourseValue}
                                    disabled={courseGroups.length === 0}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-white">
                                        <SelectValue placeholder="전반 과목을 선택해 주세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courseGroups.length === 0 ? (
                                            <SelectItem value="__empty__" disabled>
                                                선택 가능한 과목이 없습니다.
                                            </SelectItem>
                                        ) : (
                                            courseGroups.map((group) => (
                                                <SelectGroup key={group.label}>
                                                    <SelectLabel className="mx-1 my-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                                        카테고리 · {group.label}
                                                    </SelectLabel>
                                                    {group.items.map((course) => (
                                                        <SelectItem
                                                            key={course.value}
                                                            value={course.value}
                                                        >
                                                            {course.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500">기간(주)</Label>
                                <input
                                    type="number"
                                    min="1"
                                    value={transferWeeks}
                                    onChange={(e) => setTransferWeeks(e.target.value)}
                                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                                    placeholder="입력하지 않으면 기존 기간 유지"
                                />
                            </div>
                            {transferError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                                    {transferError}
                                </div>
                            ) : null}
                            <button
                                onClick={handleTransferSave}
                                disabled={transferSaving}
                                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {transferSaving ? '전반 처리 중...' : '전반 처리'}
                            </button>
                        </div>
                    ) : null}

                    <div className="space-y-3 min-h-[240px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-[240px] text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <span>로딩 중...</span>
                            </div>
                        ) : historyData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[240px] text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                                <FileText className="w-8 h-8 mb-2 opacity-50" />
                                <span>전반할 기록이 없습니다.</span>
                            </div>
                        ) : (
                            renderHistoryList('transfer')
                        )}
                    </div>

                    {renderPagination()}
                </TabsContent>
            </Tabs>
        </Modal>
    );
};

export default HistoryModal;
