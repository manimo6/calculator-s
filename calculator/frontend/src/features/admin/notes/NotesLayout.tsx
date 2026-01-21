import React from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

import NotesSidebar from "./NotesSidebar"
import NotesList from "./NotesList"
import NotesEditor from "./NotesEditor"
import type { AuthUser } from "@/auth-routing"
import type { CourseConfigSet } from "../courseConfigSets/utils"
import type { CourseNote } from "./useCourseNotes"

type NotesLayoutProps = {
    courseConfigSetLoading: boolean
    courseConfigSets: CourseConfigSet[]
    selectedCourseConfigSet: string
    selectCourseConfigSet: (value: string) => void
    courseConfigSetTree: Array<{ cat?: string; items?: Array<{ label?: string }> }>

    courseConfigSetCategories: string[]
    courseOptions: string[]

    categoryFilter: string
    setCategoryFilter: (value: string) => void
    courseFilter: string
    setCourseFilter: (value: string) => void

    search: string
    setSearch: (value: string) => void

    notes: CourseNote[]
    visibleNotes: CourseNote[]
    loadNotes: () => void

    noteScope: string
    onNoteScopeChange: (value: string) => void
    hasUnreadNotes: boolean

    selectedNoteId: string | null
    isCreating: boolean
    startNewNote: () => void
    selectNote: (note: CourseNote) => void

    formCategory: string
    setFormCategory: (value: string) => void
    formCourses: string[]
    setFormCourses: (value: string[]) => void
    formTitle: string
    setFormTitle: (value: string) => void
    formContent: string
    setFormContent: (value: string) => void
    formUpdatedBy: string

    saveNote: () => void
    deleteNote: () => void
    noteReadMap?: Record<string, string>
    currentUser: AuthUser | null
}

export default function NotesLayout({
    // useCourseNotes 훅에서 반환된 모든 props를 받음
    courseConfigSetLoading,
    courseConfigSets,
    selectedCourseConfigSet,
    selectCourseConfigSet,
    courseConfigSetTree,

    courseConfigSetCategories,
    courseOptions,

    categoryFilter,
    setCategoryFilter,
    courseFilter,
    setCourseFilter,

    search,
    setSearch,

    notes,
    visibleNotes,
    loadNotes, // Refresh용

    noteScope,
    onNoteScopeChange,
    hasUnreadNotes,

    selectedNoteId,
    isCreating,
    startNewNote,
    selectNote,

    formCategory,
    setFormCategory,
    formCourses,
    setFormCourses,
    formTitle,
    setFormTitle,
    formContent,
    setFormContent,
    formUpdatedBy,

    saveNote,
    deleteNote,
    noteReadMap,
    currentUser,
}: NotesLayoutProps) {
    return (
        <div className="h-full w-full bg-secondary/30 p-2">
            <ResizablePanelGroup direction="horizontal">

                {/* 좌측: 네비게이션 */}
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-transparent">
                    <NotesSidebar
                        courseConfigSetLoading={courseConfigSetLoading}
                        courseConfigSets={courseConfigSets}
                        selectedCourseConfigSet={selectedCourseConfigSet}
                        onSelectCourseConfigSet={selectCourseConfigSet}
                        courseConfigSetTree={courseConfigSetTree}
                        categoryFilter={categoryFilter}
                        onCategoryChange={setCategoryFilter}
                        courseFilter={courseFilter}
                        onCourseChange={setCourseFilter}
                        noteScope={noteScope}
                        onNoteScopeChange={onNoteScopeChange}
                        hasUnreadNotes={hasUnreadNotes}
                        className="bg-transparent"
                    />
                </ResizablePanel>

                {/* Sidebar - List 구분: 아주 옅은 선 (점선 대신 실선 유지하되 매우 옅게) */}
                <ResizableHandle className="w-[1px] bg-black/5" />

                {/* 중앙: 리스트 */}
                <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="bg-transparent">
                    <NotesList
                        search={search}
                        onSearchChange={setSearch}
                        notes={visibleNotes}
                        selectedNoteId={selectedNoteId}
                        onSelectNote={selectNote}
                        onNewNote={startNewNote}
                        noteReadMap={noteReadMap}
                        currentUser={currentUser}
                        selectedCourseConfigSet={selectedCourseConfigSet}
                        className="bg-transparent"
                    />
                </ResizablePanel>

                {/* List - Editor 구분: 선 대신 넓은 투명 여백 (Gap) - 핵심 변경점 */}
                <ResizableHandle className="w-3 bg-transparent shrink-0" />

                {/* 우측: 에디터 (완전히 독립된 플로팅 카드) - 핵심 변경점 */}
                <ResizablePanel defaultSize={50} minSize={30} className="bg-background rounded-2xl shadow-sm border border-border/10 overflow-hidden">
                    <NotesEditor
                        selectedNoteId={selectedNoteId}
                        isCreating={isCreating}

                        courseConfigSetCategories={courseConfigSetCategories}
                        courseOptions={courseOptions}

                        formCategory={formCategory}
                        onFormCategoryChange={setFormCategory}
                        formCourses={formCourses}
                        onFormCoursesChange={setFormCourses}
                        formTitle={formTitle}
                        onFormTitleChange={setFormTitle}
                        formContent={formContent}
                        onFormContentChange={setFormContent}
                        formUpdatedBy={formUpdatedBy}

                        onSave={saveNote}
                        onDelete={deleteNote}
                    />
                </ResizablePanel>

            </ResizablePanelGroup>
        </div>
    )
}
