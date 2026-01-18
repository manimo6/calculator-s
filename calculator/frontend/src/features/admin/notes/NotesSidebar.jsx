import React from "react"
import {
    Folder,
    FolderOpen,
    Layers,
    Bell,
    FileText,
    ChevronRight,
    Library
} from "lucide-react"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
// CourseConfigSetPicker는 유지
import CourseConfigSetPicker from "../courseConfigSets/CourseConfigSetPicker"

export default function NotesSidebar({
    courseConfigSetLoading,
    courseConfigSets,
    selectedCourseConfigSet,
    onSelectCourseConfigSet,
    courseConfigSetTree,
    categoryFilter,
    onCategoryChange,
    courseFilter,
    onCourseChange,
    noteScope,
    onNoteScopeChange,
    hasUnreadNotes,
    className
}) {
    const hasTree = courseConfigSetTree && courseConfigSetTree.length > 0
    const showUnreadTab = Boolean(hasUnreadNotes)
    const isUnreadSelected = noteScope === "unread"
    const isOverallSelected = !isUnreadSelected && !categoryFilter && !courseFilter

    return (
        <div className={cn("flex h-full flex-col bg-secondary/30", className)}>
            {/* 설정 세트 선택 영역 */}
            <div className="p-3 pb-2">
                <CourseConfigSetPicker
                    className="w-full bg-background border-transparent hover:bg-background/80 shadow-none transition-colors"
                    courseConfigSetList={courseConfigSets.map((p) => p.name)}
                    selectedCourseConfigSet={selectedCourseConfigSet}
                    onSelectCourseConfigSet={onSelectCourseConfigSet}
                    disabled={courseConfigSetLoading}
                />
            </div>

            <ScrollArea className="flex-1 px-3 py-2">

                {/* 1. 전체 메모 (All Notes) */}
                <div className="mb-6">
                    <Button
                        variant={isOverallSelected ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start gap-2 h-9 px-2 font-medium text-sm transition-colors",
                            isOverallSelected ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => {
                            onNoteScopeChange?.("all")
                            onCategoryChange("")
                            onCourseChange("")
                        }}
                    >
                        <Layers className="h-4 w-4" />
                        전체 메모
                    </Button>
                </div>

                {/* 2. 카테고리 트리 */}
                {showUnreadTab ? (
                    <div className="mb-6">
                        <Button
                            variant={isUnreadSelected ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-2 h-9 px-2 font-medium text-sm transition-colors",
                                isUnreadSelected
                                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => {
                                onNoteScopeChange?.("unread")
                                onCategoryChange("")
                                onCourseChange("")
                            }}
                        >
                            <Bell className="h-4 w-4" />
                            안읽은 메모
                        </Button>
                    </div>
                ) : null}

                {hasTree ? (
                    <div className="space-y-1">
                        <div className="px-2 text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-2">
                            Folders
                        </div>
                        <Accordion type="single" collapsible className="w-full space-y-1">
                            {courseConfigSetTree.map((group) => {
                                const isCategorySelected = !isUnreadSelected && categoryFilter === group.cat && !courseFilter
                                const isAnyChildSelected = !isUnreadSelected && categoryFilter === group.cat && courseFilter

                                return (
                                    <AccordionItem key={group.cat} value={group.cat} className="border-none">
                                        <AccordionTrigger
                                            className={cn(
                                                "py-1.5 px-2 text-sm hover:no-underline rounded-md transition-colors",
                                                isCategorySelected
                                                    ? "bg-primary/10 text-primary font-semibold"
                                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                                isAnyChildSelected && "text-foreground font-medium"
                                            )}
                                            onClick={(e) => {
                                                // 여기서는 카테고리만 선택
                                                onNoteScopeChange?.("all")
                                                onCategoryChange(group.cat)
                                                onCourseChange("")
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isCategorySelected || isAnyChildSelected
                                                    ? <FolderOpen className="h-4 w-4 shrink-0 transition-transform" />
                                                    : <Folder className="h-4 w-4 shrink-0 transition-transform" />
                                                }
                                                <span className="truncate">{group.cat}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-1 pt-0.5">
                                            <div className="flex flex-col ml-4 border-l border-border/50 pl-2 mt-1 space-y-0.5">
                                                {group.items.map((item) => {
                                                    const isCourseSelected = !isUnreadSelected && courseFilter === item.label
                                                    return (
                                                        <Button
                                                            key={item.label}
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                                "justify-start h-8 w-full gap-2 text-sm font-normal px-2",
                                                                isCourseSelected
                                                                    ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onNoteScopeChange?.("all")
                                                                onCategoryChange(group.cat)
                                                                onCourseChange(item.label)
                                                            }}
                                                        >
                                                            <FileText className="h-3.5 w-3.5 opacity-70" />
                                                            <span className="truncate">{item.label}</span>
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    </div>
                ) : (
                    <div className="px-2 py-4">
                        {!selectedCourseConfigSet && (
                            <div className="flex flex-col items-center gap-2 text-center text-muted-foreground/60 p-4 border border-dashed rounded-lg bg-background/50">
                                <Library className="h-8 w-8 opacity-20" />
                                <span className="text-xs">상단에서 설정 세트를<br />선택해주세요.</span>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
