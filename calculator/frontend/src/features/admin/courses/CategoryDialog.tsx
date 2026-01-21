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

type CategoryDialogProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, previousName?: string) => void
  editingCategory?: string
}

export default function CategoryDialog(props: CategoryDialogProps) {
  const {
    isOpen,
    onClose,
    onSave,
    editingCategory,
  } = props || {}
  const [catName, setCatName] = useState("")

  useEffect(() => {
    if (!isOpen) return
    setCatName(editingCategory || "")
  }, [editingCategory, isOpen])

  function handleSubmit(e: React.FormEvent) {
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCatName(e.target.value)}
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

