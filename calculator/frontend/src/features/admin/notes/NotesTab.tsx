import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useCourseNotes, type CourseNote } from "./useCourseNotes"
import NotesLayout from "./NotesLayout"
import type { AuthUser } from "@/auth-routing"

export default function NotesTab({
  user,
  onNoteRead,
  noteReadMap,
}: {
  user: AuthUser | null
  onNoteRead?: (note: CourseNote) => void
  noteReadMap?: Record<string, string>
}) {
  const notesProps = useCourseNotes()
  const [noteScope, setNoteScope] = useState("all")
  const username = user?.username || ""

  const normalizeDate = (value: unknown) => {
    if (!value) return null
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value
    }
    if (typeof value !== "string" && typeof value !== "number") return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const filterNotesBySearch = useCallback((list: CourseNote[], query: string) => {
    const q = String(query || "").trim().toLowerCase()
    if (!q) return list
    return (list || []).filter((note) => {
      const tags = Array.isArray(note?.tags) ? note.tags.join(" ") : ""
      const hay = `${note?.title || ""} ${note?.content || ""} ${tags}`.toLowerCase()
      return hay.includes(q)
    })
  }, [])

  const unreadNotes = useMemo(() => {
    const readMap = noteReadMap || {}
    const list = (notesProps.allNotes || []).filter((note) => {
      if (!note?.id) return false
      const author = String(note.author || "").trim()
      const updatedBy = String(note.updatedBy || "").trim()
      if (username && (author === username || updatedBy === username)) {
        return false
      }
      const updatedAt = normalizeDate(note.updatedAt)
      if (!updatedAt) return false
      const readAt = normalizeDate(readMap[String(note.id)])
      return !readAt || updatedAt > readAt
    })
    return list
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
      )
  }, [noteReadMap, notesProps.allNotes, username])

  const hasUnreadNotes = unreadNotes.length > 0
  const unreadVisibleNotes = useMemo(
    () => filterNotesBySearch(unreadNotes, notesProps.search),
    [filterNotesBySearch, notesProps.search, unreadNotes]
  )
  const visibleNotes = noteScope === "unread" ? unreadVisibleNotes : notesProps.visibleNotes

  useEffect(() => {
    setNoteScope("all")
  }, [notesProps.selectedCourseConfigSet])

  useEffect(() => {
    if (noteScope === "unread" && !hasUnreadNotes) {
      setNoteScope("all")
    }
  }, [hasUnreadNotes, noteScope])

  const handleSelectNote = useCallback(
    (note: CourseNote) => {
      notesProps.selectNote(note)
      if (note && typeof onNoteRead === "function") {
        onNoteRead(note)
      }
    },
    [notesProps.selectNote, onNoteRead]
  )

  return (
    <div className="h-full">
      <NotesLayout
        {...notesProps}
        visibleNotes={visibleNotes}
        selectNote={handleSelectNote}
        noteReadMap={noteReadMap}
        currentUser={user}
        noteScope={noteScope}
        onNoteScopeChange={setNoteScope}
        hasUnreadNotes={hasUnreadNotes}
      />
    </div>
  )
}
