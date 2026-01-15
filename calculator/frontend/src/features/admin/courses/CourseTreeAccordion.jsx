import React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"

function stopAccordionToggle(e) {
  e.preventDefault()
  e.stopPropagation()
}

export default function CourseTreeAccordion({
  courseTree,
  courseInfo,
  onEditCategory,
  onDeleteCategory,
  onEditCourse,
  onDeleteCourse,
}) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/60">
      <Accordion type="multiple" className="divide-y divide-border/60">
        {(courseTree || []).map((group) => {
          const items = Array.isArray(group.items) ? group.items : []
          const value = String(group.cat || "")
          return (
            <AccordionItem key={value} value={value} className="border-0">
              <AccordionPrimitive.Header className="flex items-center justify-between gap-3 px-4 py-3">
                <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between gap-3 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="truncate font-semibold">{group.cat}</div>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionPrimitive.Trigger>
                <div
                  className="flex items-center gap-1"
                  onClick={stopAccordionToggle}
                  onPointerDown={stopAccordionToggle}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="카테고리 수정"
                    aria-label="카테고리 수정"
                    onClick={() => onEditCategory(group.cat)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="카테고리 삭제"
                    aria-label="카테고리 삭제"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDeleteCategory(group.cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </AccordionPrimitive.Header>
              <AccordionContent className="px-4 pb-4">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background px-4 py-6 text-sm text-muted-foreground">
                    등록된 수업이 없습니다.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {items.map((item) => {
                      const info = courseInfo[item.val] || {}
                      return (
                        <div
                          key={item.val}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold">
                              {item.label}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {Number(info.fee || 0).toLocaleString()}원 ·{" "}
                              {info.days ? info.days.length : 0}일
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onEditCourse(group.cat, item)}
                            >
                              수정
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onDeleteCourse(item.val)}
                            >
                              삭제
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </Card>
  )
}

