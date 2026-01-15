import React, { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CategoryDialog({
  isOpen,
  onClose,
  onSave,
  editingCategory,
}) {
  const [catName, setCatName] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setCatName(editingCategory || "")
  }, [editingCategory, isOpen])

  function handleSubmit(e) {
    e.preventDefault()
    onSave(catName, editingCategory)
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCategory ? "카테고리 수정" : "카테고리 추가"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courseCategoryName">카테고리 이름</Label>
            <Input
              id="courseCategoryName"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="예: SAT"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">확인</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

