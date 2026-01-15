import React from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Plus, Search, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export default function NotesList({
    search,
    onSearchChange,
    notes,
    selectedNoteId,
    onSelectNote,
    onNewNote,
    noteReadMap,
    currentUser,
    categoryFilter,
    courseFilter,
    className
}) {
    const username = currentUser?.username || ""
    const normalizeDate = (value) => {
        if (!value) return null
        const date = value instanceof Date ? value : new Date(value)
        if (Number.isNaN(date.getTime())) return null
        return date
    }

    const canCreate = Boolean(categoryFilter && courseFilter)


    return (
        <div className={cn("flex h-full flex-col", className)}>
            {/* Header with Search */}
            <div className="flex flex-col gap-3 p-4 pb-2">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-bold tracking-tight text-foreground/80">메모</h2>
                    {canCreate ? (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={onNewNote}
                        >
                            <Plus className="h-5 w-5" />
                            <span className="sr-only">새 메모</span>
                        </Button>
                    ) : null}
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
                    <Input
                        placeholder="검색"
                        className="pl-9 h-9 rounded-xl bg-background/40 border-none shadow-sm focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/50"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 px-3">
                <div className="flex flex-col gap-2 pb-4">
                    {notes.length === 0 ? (
                        <div className="py-12 text-center flex flex-col items-center gap-3 text-muted-foreground/50">
                            <FileText className="h-10 w-10 opacity-10" />
                            <span className="text-xs font-medium">메모가 없습니다.</span>
                        </div>
                    ) : (
                        notes.map((note) => {
                            const isSelected = selectedNoteId === note.id
                            // 날짜 포맷: 오늘이면 시간, 아니면 날짜
                            const dateObj = new Date(note.updatedAt)
                            const now = new Date()
                            const isToday = dateObj.toDateString() === now.toDateString()
                            const dateDisplay = isToday
                                ? format(dateObj, "a h:mm", { locale: ko })
                                : format(dateObj, "yyyy. M. d.", { locale: ko })
                            const readAt = noteReadMap ? noteReadMap[note.id] : null
                            const updatedAt = normalizeDate(note.updatedAt)
                            const readDate = normalizeDate(readAt)
                            const isUnread = updatedAt && (!readDate || updatedAt > readDate)
                            const isSelf = username && (note.author === username || note.updatedBy === username)
                            const showUnreadDot = Boolean(isUnread && !isSelf)


                            return (
                                <button
                                    key={note.id}
                                    className={cn(
                                        "relative group flex flex-col items-start gap-1 p-3.5 text-left transition-all duration-200 ease-out rounded-xl border border-transparent",
                                        isSelected
                                            ? "bg-background shadow-md shadow-black/5 ring-1 ring-black/5 scale-[1.02] z-10"
                                            : "hover:bg-white/40 hover:shadow-sm hover:border-white/50 active:scale-[0.98]"
                                    )}
                                    onClick={() => onSelectNote(note)}
                                >
                                    {showUnreadDot ? (
                                        <span
                                            className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    {/* Title & Date Row */}
                                    <div className="flex items-baseline justify-between w-full gap-2 pr-4">
                                        <div className={cn(
                                            "font-bold text-sm leading-tight truncate transition-colors",
                                            isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
                                        )}>
                                            {note.title || "새로운 메모"}
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className={cn(
                                                "text-[11px] font-medium whitespace-nowrap transition-colors",
                                                isSelected ? "text-primary/80" : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
                                            )}>
                                                {dateDisplay}
                                            </span>
                                            {/* 작성자 ID 표시 */}
                                            {(note.author || note.createdBy || note.writer || note.userId || note.username || note.updatedBy) && (
                                                <span className={cn(
                                                    "text-[10px] truncate max-w-[80px]",
                                                    isSelected ? "text-primary/60" : "text-muted-foreground/30 group-hover:text-muted-foreground/50"
                                                )}>
                                                    {note.author || note.createdBy || note.writer || note.userId || note.username || note.updatedBy}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Preview */}
                                    <div className={cn(
                                        "text-xs line-clamp-2 w-full break-all transition-colors leading-relaxed",
                                        isSelected ? "text-muted-foreground" : "text-muted-foreground/50 group-hover:text-muted-foreground/70"
                                    )}>
                                        {note.content || "추가 텍스트 없음"}
                                    </div>

                                    {/* Badge/Tags Row (Optional) */}
                                    {(Array.isArray(note.courses) && note.courses.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-1.5 opacity-90">
                                            {note.courses.slice(0, 2).map(c => (
                                                <span key={c} className={cn(
                                                    "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors",
                                                    isSelected
                                                        ? "bg-secondary text-secondary-foreground"
                                                        : "bg-muted/50 text-muted-foreground group-hover:bg-white/50"
                                                )}>
                                                    {c}
                                                </span>
                                            ))}
                                            {note.courses.length > 2 && (
                                                <span className="text-[10px] text-muted-foreground self-center">+{note.courses.length - 2}</span>
                                            )}
                                        </div>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
