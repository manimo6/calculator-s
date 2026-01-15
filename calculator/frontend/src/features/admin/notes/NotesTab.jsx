import React, { useCallback } from "react"
import { useCourseNotes } from "./useCourseNotes"
import NotesLayout from "./NotesLayout"

export default function NotesTab({ user, onNoteRead, noteReadMap }) {
  const notesProps = useCourseNotes()
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
        selectNote={handleSelectNote}
        noteReadMap={noteReadMap}
        currentUser={user}
      />
    </div>
  )
}
