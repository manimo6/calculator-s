import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { apiClient } from '../../api-client';
import { courseConfigSetName } from '../../utils/data';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Edit2,
    FileText,
    Loader2,
    RotateCcw,
    Search,
    Trash2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

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
    transferFromId?: string
    withdrawnAt?: string | Date
} & Record<string, unknown>

type HistoryModalProps = {
    isOpen: boolean
    onClose: () => void
    onSelect?: (item: HistoryItem) => void
    onEdit?: (item: HistoryItem) => void
    onTransfer?: (item: HistoryItem) => void
    onTransferCancel?: (item: HistoryItem) => void
    onDataLoaded?: (items: HistoryItem[]) => void
    editingId?: string | number | null
}

const HistoryModal = ({
    isOpen,
    onClose,
    onSelect,
    onEdit,
    onTransfer,
    onTransferCancel,
    onDataLoaded,
    editingId,
}: HistoryModalProps) => {
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'load' | 'transfer'>('load');
    const normalizedCourseConfigSetName = String(courseConfigSetName || '').trim();

    useEffect(() => {
        if (isOpen) {
            fetchHistory(1);
            setActiveTab('load');
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
                const results = response.results || [];
                setHistoryData(results);
                setPage(response.currentPage || 1);
                setTotalPages(response.totalPages || 1);
                setTotalResults(response.totalResults || 0);
                onDataLoaded?.(results);
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
        if (!item || !onTransfer) return;
        if (item.withdrawnAt) return;
        // 전반된 항목은 체인 최종(재전반)만 허용
        if (item.transferToId) return;
        onTransfer(item);
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

    const renderSearchBar = () => (
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
    );

    // 체인 최종 결과물: 전반으로 생성되었고(transferFromId 있음), 더 전반하지 않음(transferToId 없음)
    const isLastInChain = (item: HistoryItem) => {
        return !!item.transferFromId && !item.transferToId && !item.withdrawnAt;
    };

    const renderHistoryList = (mode: 'load' | 'transfer') => (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            {historyData.map((item) => {
                const isTransferred = !!item.transferToId;
                const isWithdrawn = !!item.withdrawnAt;
                const isEditing = Boolean(editingId && String(editingId) === String(item.id));
                const lastInChain = isLastInChain(item);
                const hasTransferRelation = !!item.transferFromId || !!item.transferToId;
                return (
                    <div
                        key={item.id}
                        className={`p-4 bg-white border rounded-xl transition-all ${
                            isEditing
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
                                    <div className="flex items-center gap-1.5">
                                        {lastInChain && onTransferCancel ? (
                                            <button
                                                onClick={() => onTransferCancel(item)}
                                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                전반취소
                                            </button>
                                        ) : null}
                                        <button
                                            disabled={isWithdrawn || (isTransferred && !lastInChain)}
                                            onClick={() => handleSelectTransfer(item)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                                isWithdrawn || (isTransferred && !lastInChain)
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : lastInChain
                                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            {isWithdrawn || (isTransferred && !lastInChain) ? '전반 불가' : lastInChain ? '재전반' : '전반 선택'}
                                        </button>
                                    </div>
                                ) : hasTransferRelation ? (
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 border border-gray-100 bg-gray-50">
                                            전반 이력 있음 · 수정/삭제 불가
                                        </span>
                                    </div>
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

    const renderEmptyState = (message: string) => (
        <div className="flex flex-col items-center justify-center h-[240px] text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <span>{message}</span>
        </div>
    );

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center h-[240px] text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span>로딩 중...</span>
        </div>
    );

    const renderListContent = (mode: 'load' | 'transfer') => (
        <div className="space-y-3 min-h-[240px]">
            {loading
                ? renderLoading()
                : historyData.length === 0
                    ? renderEmptyState(mode === 'transfer' ? '전반할 기록이 없습니다.' : '기록이 없습니다.')
                    : renderHistoryList(mode)}
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
                    {onTransfer ? <TabsTrigger value="transfer">전반</TabsTrigger> : null}
                </TabsList>

                <TabsContent value="load" className="space-y-3">
                    {renderSearchBar()}
                    {renderListContent('load')}
                    {renderPagination()}
                    <div className="text-xs text-gray-400 text-center">
                        전체 {totalResults}건
                    </div>
                </TabsContent>

                {onTransfer ? (
                    <TabsContent value="transfer" className="space-y-3">
                        {renderSearchBar()}
                        {renderListContent('transfer')}
                        {renderPagination()}
                    </TabsContent>
                ) : null}
            </Tabs>
        </Modal>
    );
};

export default HistoryModal;
