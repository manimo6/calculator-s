import { useEffect, useReducer, useState } from "react"

import {
  buildCourseFormStatePayload,
  courseFormReducer,
  initialCourseFormState,
  type CourseData,
  type TextbookState,
} from "./courseDialogState"

const CATEGORY_PLACEHOLDER = "__course_category_placeholder__"

export function useCourseDialogForm({
  isOpen,
  hasCategories,
  editingCourseId,
  courseData,
}: {
  isOpen: boolean
  hasCategories: boolean
  editingCourseId?: string
  courseData?: CourseData
}) {
  const [state, dispatch] = useReducer(courseFormReducer, initialCourseFormState)
  const [breakPickerOpen, setBreakPickerOpen] = useState<string | null>(null)

  const handleTextbookOptionChange =
    (optionKey: keyof TextbookState, amountKey: keyof TextbookState) =>
    (value: string) => {
      dispatch({ type: "SET_TEXTBOOK", key: optionKey, value })
      if (value !== "amount") {
        dispatch({ type: "SET_TEXTBOOK", key: amountKey, value: 0 })
      }
    }

  const handleTextbookAmountChange = (
    key: "defaultAmount" | "onlineAmount" | "offlineAmount",
    value: number
  ) => {
    dispatch({ type: "SET_TEXTBOOK", key, value })
  }

  useEffect(() => {
    if (!isOpen || !hasCategories) return

    if (editingCourseId && courseData) {
      dispatch({
        type: "RESET",
        payload: buildCourseFormStatePayload(courseData),
      })
    } else {
      dispatch({
        type: "RESET",
        payload: { ...initialCourseFormState, category: "" },
      })
      dispatch({ type: "ADD_DYNAMIC_TIME" })
    }
  }, [courseData, editingCourseId, hasCategories, isOpen])

  return {
    state,
    dispatch,
    breakPickerOpen,
    setBreakPickerOpen,
    handleTextbookOptionChange,
    handleTextbookAmountChange,
    categoryValue: state.category || CATEGORY_PLACEHOLDER,
    categoryPlaceholder: CATEGORY_PLACEHOLDER,
  }
}
