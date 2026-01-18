import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useCourseNotes } from "./useCourseNotes"
import NotesLayout from "./NotesLayout"

export default function NotesTab({ user, onNoteRead, noteReadMap }) {
  const notesProps = useCourseNotes()
  const [noteScope, setNoteScope] = useState("all")
  const username = user?.username || ""

  const normalizeDate = (value) => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date
  }

  const filterNotesBySearch = useCallback((list, query) => {
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
      const readAt = normalizeDate(readMap[note.id])
      return !readAt || updatedAt > readAt
    })
    return list.slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
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
    (note) => {
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
