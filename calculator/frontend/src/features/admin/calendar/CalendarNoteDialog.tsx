import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { apiClient } from "../../../api-client";
import { Loader2, Trash2, X, Plus } from "lucide-react";

/**
 * Apple Style Glassmorphism Note Dialog
 */
const CalendarNoteDialog = ({
    isOpen,
    onClose,
    date,
    notes = [],
    onNoteSaved,
    onNoteDeleted,
    user
}) => {
    const [newNoteContent, setNewNoteContent] = useState<any>("");
    const [isSubmitting, setIsSubmitting] = useState<any>(false);
    const [editingNoteId, setEditingNoteId] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            setNewNoteContent("");
            setEditingNoteId(null);
        }
    }, [isOpen, date]);

    const handleSubmit = async () => {
        if (!newNoteContent.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingNoteId) {
                const updated = await apiClient.updateCalendarNote(editingNoteId, { content: newNoteContent });
                onNoteSaved(updated?.note || updated);
            } else {
                const dateStr = date ? format(date, "yyyy-MM-dd") : "";
                const created = await apiClient.createCalendarNote({
                    date: dateStr,
                    content: newNoteContent,
                    author: user?.username || "Unknown"
                });
                onNoteSaved(created?.note || created);
            }

            setNewNoteContent("");
            setEditingNoteId(null);
        } catch (error) {
            console.error("Failed to save note", error);
            // Simple visual feedback instead of alert
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (noteId) => {
        if (!confirm("메모를 삭제하시겠습니까?")) return;
        try {
            await apiClient.deleteCalendarNote(noteId);
            onNoteDeleted(noteId);
            if (editingNoteId === noteId) {
                setEditingNoteId(null);
                setNewNoteContent("");
            }
        } catch (error) {
            console.error("Failed to delete note", error);
        }
    };

    const startEdit = (note) => {
        setEditingNoteId(note.id);
        setNewNoteContent(note.content);
    };

    const cancelEdit = () => {
        setEditingNoteId(null);
        setNewNoteContent("");
    };

    const formattedDate = date ? format(date, "yyyy.MM.dd (E)", { locale: ko }) : "";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* 
              Apple-style Dialog Content:
              - No default border
              - High blurring
              - Rounded corners
              - Clean typography
            */}
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-none shadow-2xl rounded-2xl gap-0 ring-1 ring-black/5">

                {/* Header */}
                <div className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-foreground/90">
                        {formattedDate}
                    </DialogTitle>
                </div>

                <div className="p-6 space-y-6">
                    {/* Input Area (Always visible, focused) */}
                    <div className="relative group">
                        <Textarea
                            placeholder="새로운 메모를 입력하세요..."
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            className="w-full min-h-[100px] bg-secondary/50 border-transparent rounded-xl resize-none text-[15px] focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 p-4"
                        />
                        <div className="flex justify-end mt-2 gap-2">
                            {editingNoteId && (
                                <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-muted-foreground h-8 rounded-full px-3 text-xs hover:bg-secondary">
                                    취소
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !newNoteContent.trim()}
                                className="h-8 rounded-full px-4 text-xs font-medium bg-[#007AFF] hover:bg-[#0060df] text-white shadow-none"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                {editingNoteId ? "수정" : "추가"}
                            </Button>
                        </div>
                    </div>

                    {/* Events List */}
                    {notes.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">메모 목록</h4>
                            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 -mr-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-secondary">
                                {notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="group flex items-start justify-between gap-3 p-3 rounded-xl bg-white border border-border/40 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 cursor-pointer"
                                        onClick={() => startEdit(note)}
                                    >
                                        <div className="flex gap-3 min-w-0">
                                            {/* Apple-style color dot */}
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-2 shrink-0 opacity-80" />
                                            <div className="space-y-1">
                                                <p className="text-sm text-foreground/90 break-words leading-relaxed">{note.content}</p>
                                                <p className="text-[11px] text-muted-foreground font-medium">{format(new Date(note.createdAt), "a h:mm", { locale: ko })}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-secondary text-muted-foreground" onClick={(e) => { e.stopPropagation(); startEdit(note); }}>
                                                <span className="sr-only">수정</span>
                                                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71455 8.57829C3.64582 8.64703 3.58314 8.71899 3.52748 8.79312L1.92616 10.9282C1.72483 11.1966 1.70889 11.5546 1.88602 11.7317C2.06315 11.9088 2.42115 11.8929 2.68953 11.6916L4.82463 10.0902C4.89877 10.0346 4.97072 9.97191 5.03946 9.90318L12.4713 2.47132C12.6665 2.27606 12.6665 1.95948 12.4713 1.76421L11.8536 1.14645ZM11.2071 2.5L11.5 2.79289L12.2071 2.08579L11.9142 1.79289L11.2071 2.5ZM2.94644 11.3197L3.03714 11.1988L4.31499 10.2404L9.58579 4.96967L10.0303 5.41421L4.75953 10.685L3.80112 11.9629L3.68021 12.0536L2.94644 11.3197Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-red-100 hover:text-red-500 text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CalendarNoteDialog;



