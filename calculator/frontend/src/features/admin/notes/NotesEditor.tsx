import React, { useState } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
    ChevronDown,
    Trash2,
    Save,
    MoreHorizontal,
    Folder,
    BookOpen
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const CATEGORY_NONE = "__note_category_none__"

type NotesEditorProps = {
    selectedNoteId: string | null
    isCreating: boolean
    courseConfigSetCategories?: string[]
    courseOptions?: string[]
    formCategory: string
    onFormCategoryChange: (value: string) => void
    formCourses: string[]
    onFormCoursesChange: (value: string[]) => void
    formTitle: string
    onFormTitleChange: (value: string) => void
    formContent: string
    onFormContentChange: (value: string) => void
    formUpdatedBy?: string | null
    onSave: () => void
    onDelete: () => void
}

export default function NotesEditor({
    selectedNoteId,
    isCreating,

    courseConfigSetCategories = [],
    courseOptions = [],

    formCategory,
    onFormCategoryChange,
    formCourses,
    onFormCoursesChange,
    formTitle,
    onFormTitleChange,
    formContent,
    onFormContentChange,

    formUpdatedBy,

    onSave,
    onDelete,
}: NotesEditorProps) {
    // --- Course MultiSelect Logic (Same as before) ---
    const safeCourseOptions = Array.isArray(courseOptions) ? courseOptions : []
    const selectedCourses = Array.isArray(formCourses) ? formCourses : []
    const selectedCourseSet = new Set(selectedCourses)

    const selectedSummary =
        selectedCourses.length === 0
            ? "과목 선택"
            : selectedCourses.length === 1
                ? selectedCourses[0]
                : `${selectedCourses.length}개 과목`

    const allSelected =
        safeCourseOptions.length > 0 &&
        safeCourseOptions.every((course) => selectedCourseSet.has(course))

    const handleCourseToggle = (course: string) => {
        const nextSet = new Set(selectedCourses)
        if (nextSet.has(course)) {
            nextSet.delete(course)
        } else {
            nextSet.add(course)
        }
        const nextList = safeCourseOptions.filter((opt) => nextSet.has(opt))
        for (const opt of nextSet) {
            if (!safeCourseOptions.includes(opt)) nextList.push(opt)
        }
        onFormCoursesChange(nextList)
    }

    const handleToggleAllCourses = () => {
        if (allSelected) {
            onFormCoursesChange([])
        } else {
            onFormCoursesChange([...safeCourseOptions])
        }
    }
    // --------------------------------

    if (!selectedNoteId && !isCreating) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground/40 bg-background">
                <BookOpen className="h-16 w-16 mb-4 opacity-20" />
                <div className="text-xl font-medium text-foreground/80">메모를 선택하세요</div>
                <p className="text-sm mt-2">새로운 메모를 작성하거나 목록에서 선택하세요.</p>
            </div>
        )
    }

    const currentDate = new Date()
    const dateString = format(currentDate, "yyyy년 M월 d일 a h:mm", { locale: ko })

    return (
        <div className="flex h-full flex-col bg-background">
            {/* 1. Minimal Toolbar */}
            <div className="flex items-center justify-between px-6 py-2 shrink-0">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {/* Category Picker (Minimal) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 font-normal text-muted-foreground hover:text-foreground">
                                <Folder className="h-4 w-4" />
                                <span className="truncate max-w-[100px]">
                                    {formCategory || "카테고리 없음"}
                                </span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <DropdownMenuItem onClick={() => onFormCategoryChange("")}>
                                카테고리 없음
                            </DropdownMenuItem>
                            {courseConfigSetCategories.map((c) => (
                                <DropdownMenuItem key={c} onClick={() => onFormCategoryChange(c)}>
                                    {c}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="text-border">|</span>

                    {/* Course Picker (Minimal Popover) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 font-normal text-muted-foreground hover:text-foreground">
                                <BookOpen className="h-4 w-4" />
                                <span className="truncate max-w-[120px]">
                                    {selectedSummary}
                                </span>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                                <span className="text-xs font-medium">과목 선택</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={handleToggleAllCourses}
                                >
                                    {allSelected ? "해제" : "전체"}
                                </Button>
                            </div>
                            <ScrollArea className="h-60">
                                <div className="p-1.5 space-y-0.5">
                                    {safeCourseOptions.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-muted-foreground">목록 없음</div>
                                    ) : (
                                        safeCourseOptions.map((course) => (
                                            <div
                                                key={course}
                                                onClick={() => handleCourseToggle(course)}
                                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                                            >
                                                <Checkbox checked={selectedCourseSet.has(course)} id={`course-${course}`} />
                                                <label htmlFor={`course-${course}`} className="text-sm cursor-pointer flex-1 pt-0.5">{course}</label>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-1">
                    {!isCreating && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onDelete}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                            title="삭제"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSave}
                        className="h-8 w-8 text-primary hover:bg-primary/10 transition-colors"
                        title="저장"
                    >
                        <Save className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* 2. Document Area */}
            <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto px-8 py-6 pb-20 flex flex-col min-h-[500px]">

                    {/* Main Title */}
                        <Input
                        value={formTitle}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onFormTitleChange(e.target.value)
                        }
                        placeholder="제목"
                        className="text-4xl font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto py-2 leading-tight tracking-tight bg-transparent"
                    />

                    <div className="flex flex-col gap-1 mt-2 mb-8 text-muted-foreground/60 text-sm pl-1">
                        <span>{dateString}</span>
                        {!isCreating && formUpdatedBy && (
                            <span className="text-xs text-muted-foreground/40">
                                작성자: {formUpdatedBy}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <Textarea
                        value={formContent}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            onFormContentChange(e.target.value)
                        }
                        placeholder="내용을 입력하세요..."
                        className="flex-1 resize-none border-none px-1 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30 p-0 text-lg leading-relaxed text-foreground/90 bg-transparent"
                        spellCheck={false}
                    />
                </div>
            </ScrollArea>
        </div>
    )
}
