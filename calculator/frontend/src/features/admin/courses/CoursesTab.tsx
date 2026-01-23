import React, { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

import { BookOpen, FolderPlus, PencilLine, Plus } from "lucide-react"

import { courseInfo, recordingAvailable, timeTable } from "@/utils/data"

import CategoryDialog from "./CategoryDialog"
import CourseDialog from "./CourseDialog"
import CourseNameBulkDialog from "./CourseNameBulkDialog"
import CourseTreeAccordion from "./CourseTreeAccordion"
import CourseConfigSetToolbar from "./CourseConfigSetToolbar"
import Toast from "./Toast"
import { useCourseManager } from "./useCourseManager"
import { useReauthDialog } from "../components/useReauthDialog"

export default function CoursesTab({ user, onDirtyChange }) {
  const {
    loading,
    lastUpdated,
    toast,
    showToast,
    isConfigDirty,
    courseConfigSetList,
    selectedCourseConfigSet,
    handleSelectCourseConfigSet,
    handleSaveCourseConfigSet,
    handleOverwriteCourseConfigSet,
    handleDeleteCourseConfigSet,
    handleSaveCategory,
    handleDeleteCategory,
    handleSaveCourse,
    handleDeleteCourse,
    courseTree,
  } = useCourseManager()
  const { withReauth, dialog: reauthDialog } = useReauthDialog()

  const [modal, setModal] = useState<any>({ type: null, props: {} })
  const [bulkOpen, setBulkOpen] = useState<any>(false)
  const hasSelection = Boolean(selectedCourseConfigSet)

  const handleDeleteCourseConfigSetSecure = async () => {
    const result = await withReauth(() => handleDeleteCourseConfigSet())
    if (!result?.ok) return
  }

  useEffect(() => {
    if (typeof onDirtyChange === "function") {
      onDirtyChange(isConfigDirty)
    }
  }, [isConfigDirty, onDirtyChange])

  return (
    <>
      <div className="space-y-4">
      {/* 헤더 영역 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-400/10 p-6 shadow-lg shadow-black/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/25">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">수업목록 관리</h2>
              <p className="text-sm text-slate-600">카테고리/수업을 관리하고 설정 세트로 저장할 수 있습니다</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkOpen(true)}
              disabled={!hasSelection}
              className="gap-2 rounded-xl border-white/40 bg-white/60 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md"
            >
              <PencilLine className="h-4 w-4" />
              수업명 일괄 변경
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal({ type: "category", props: {} })}
              disabled={!hasSelection}
              className="gap-2 rounded-xl border-white/40 bg-white/60 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:shadow-md"
            >
              <FolderPlus className="h-4 w-4" />
              카테고리 추가
            </Button>
            <Button
              type="button"
              onClick={() => setModal({ type: "course", props: {} })}
              disabled={!hasSelection}
              className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
            >
              <Plus className="h-4 w-4" />
              수업 추가
            </Button>
          </div>
        </div>
      </div>

        <CourseConfigSetToolbar
        courseConfigSetList={courseConfigSetList}
        selectedCourseConfigSet={selectedCourseConfigSet}
        onCourseConfigSetChange={handleSelectCourseConfigSet}
        storageScope={user?.username || ""}
        canDelete={user?.role === "master"}
        actionsDisabled={!hasSelection}
        onSaveCourseConfigSet={handleSaveCourseConfigSet}
        onOverwriteCourseConfigSet={handleOverwriteCourseConfigSet}
          onDeleteCourseConfigSet={handleDeleteCourseConfigSetSecure}
        />

      {!hasSelection ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          설정 세트를 선택하면 수업 목록이 표시됩니다.
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <CourseTreeAccordion
          key={`${selectedCourseConfigSet || "default"}-${lastUpdated}`}
          courseTree={courseTree}
          courseInfo={courseInfo}
          onEditCategory={(cat) =>
            setModal({ type: "category", props: { editingCategory: cat } })
          }
          onDeleteCategory={handleDeleteCategory}
          onEditCourse={(cat, item) =>
            setModal({
              type: "course",
              props: {
                editingCourseId: item.val,
                courseData: {
                  category: cat,
                  name: item.label,
                  info: courseInfo[item.val] || {},
                  timeData: timeTable[item.val] || timeTable[item.label],
                  recording: recordingAvailable[item.val],
                },
              },
            })
          }
          onDeleteCourse={handleDeleteCourse}
        />
      )}

      <CategoryDialog
        isOpen={modal.type === "category"}
        onClose={() => setModal({ type: null, props: {} })}
        onSave={handleSaveCategory}
        {...modal.props}
      />
      <CourseDialog
        isOpen={modal.type === "course"}
        onClose={() => setModal({ type: null, props: {} })}
        onSave={handleSaveCourse}
        categories={courseTree}
        {...modal.props}
      />

      <CourseNameBulkDialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        courseConfigSetName={selectedCourseConfigSet}
        showToast={showToast}
      />

        <Toast message={toast.visible ? toast.message : ""} />
      </div>
      {reauthDialog}
    </>
  )
}
