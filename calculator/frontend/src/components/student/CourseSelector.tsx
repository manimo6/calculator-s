import React, { useState, useMemo } from 'react';
import { courseTree } from '../../utils/data';
import type { CourseTreeGroup } from '../../utils/data';
import { ChevronDown, ChevronUp, Search, BookOpen } from 'lucide-react';

type CourseSelectorProps = {
    onSelect: (courseKey: string) => void;
    selectedCourseKey?: string;
};

type CourseTreeGroupWithExpand = CourseTreeGroup & { _forceExpand?: boolean };

const CourseSelector = ({ onSelect, selectedCourseKey }: CourseSelectorProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

    const toggleCat = (catLabel: string) => {
        setExpandedCats(prev => ({
            ...prev,
            [catLabel]: !prev[catLabel]
        }));
    };

    const filteredTree = useMemo(() => {
        if (!searchTerm) return courseTree as CourseTreeGroupWithExpand[];

        return courseTree
            .map((group) => {
                const filteredItems = group.items.filter(item =>
                    item.label.toLowerCase().includes(searchTerm.toLowerCase())
                );
                if (filteredItems.length > 0) {
                    return { ...group, items: filteredItems, _forceExpand: true };
                }
                return null;
            })
            .filter(Boolean) as CourseTreeGroupWithExpand[];
    }, [searchTerm, courseTree]);

    return (
        <div className="w-full">
            {/* Search Box */}
            <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="수강하고 싶은 과목을 검색해보세요"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium placeholder:text-gray-400"
                />
            </div>

            {/* Course List */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white max-h-[400px] overflow-y-auto no-scrollbar">
                {filteredTree.length === 0 ? (
                    <div className="py-12 flex flex-col items-center text-gray-400">
                        <BookOpen className="h-8 w-8 mb-2 opacity-50" />
                        <span className="text-sm">검색 결과가 없습니다</span>
                    </div>
                ) : (
                    filteredTree.map(group => {
                        const isExpanded = searchTerm || group._forceExpand ? true : expandedCats[group.cat];
                        return (
                            <div key={group.cat} className="border-b border-gray-50 last:border-none">
                                {/* Category Header */}
                                <div
                                    onClick={() => toggleCat(group.cat)}
                                    className="flex items-center justify-between px-5 py-3.5 bg-white hover:bg-gray-50 cursor-pointer transition-colors group select-none"
                                >
                                    <span className="font-semibold text-gray-700 text-sm group-hover:text-gray-900">{group.cat}</span>
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                                    )}
                                </div>

                                {/* Items */}
                                <div
                                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}
                                >
                                    <div className="min-h-0 overflow-hidden">
                                        <div className="bg-gray-50/50 py-1">
                                            {group.items.map(item => (
                                                <div
                                                    key={item.val}
                                                    onClick={() => onSelect(item.val)}
                                                    className={`
                                                        px-5 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between
                                                        ${selectedCourseKey === item.val
                                                            ? 'bg-blue-50 text-blue-700 font-semibold'
                                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                        }
                                                    `}
                                                >
                                                    <span>{item.label}</span>
                                                    {selectedCourseKey === item.val && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CourseSelector;
