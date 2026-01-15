import React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Download, Save, Trash2 } from "lucide-react"

import CourseConfigSetPicker from "../courseConfigSets/CourseConfigSetPicker"

export default function CourseConfigSetToolbar({
  courseConfigSetList,
  selectedCourseConfigSet,
  onCourseConfigSetChange,
  storageScope,
  canDelete = true,
  actionsDisabled = false,
  onSaveCourseConfigSet,
  onOverwriteCourseConfigSet,
  onDeleteCourseConfigSet,
}) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">설정 세트</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <CourseConfigSetPicker
          className="min-w-[220px] flex-1"
          courseConfigSetList={courseConfigSetList}
          selectedCourseConfigSet={selectedCourseConfigSet}
          onSelectCourseConfigSet={onCourseConfigSetChange}
          storageScope={storageScope}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            title="새 이름으로 저장"
            aria-label="새 이름으로 저장"
            onClick={onSaveCourseConfigSet}
            disabled={actionsDisabled}
          >
            <Download className="h-4 w-4" />
            새 이름으로 저장
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            title="현재 세트 덮어쓰기"
            aria-label="현재 세트 덮어쓰기"
            onClick={onOverwriteCourseConfigSet}
            disabled={!selectedCourseConfigSet || actionsDisabled}
          >
            <Save className="h-4 w-4" />
            현재 세트 덮어쓰기
          </Button>
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="삭제"
              aria-label="설정 세트 삭제"
              className="text-destructive hover:text-destructive"
              onClick={onDeleteCourseConfigSet}
              disabled={!selectedCourseConfigSet || actionsDisabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
