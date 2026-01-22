import { useCallback, useEffect, useMemo, useState } from "react"
import { apiClient } from "@/api-client"
import {
  extractCategoriesFromCourseTree,
  extractCourseTreeFromCourseConfigSet,
  extractCoursesFromCourseConfigSet,
  normalizeCourseConfigSets,
  type CourseConfigSet,
} from "../courseConfigSets/utils"

export type CourseNote = {
  id?: string | number
  category?: string
  courses?: string[]
  title?: string
  content?: string
  updatedAt?: string | Date
  author?: string
  updatedBy?: string
  createdBy?: string
  created_by?: string
  writer?: string
  writer_id?: string
  userId?: string
  user_id?: string
  username?: string
  owner?: string
  tags?: string[]
  user?: { username?: string; id?: string }
  account?: { username?: string }
} & Record<string, unknown>

export function useCourseNotes() {
  const [courseConfigSetLoading, setCourseConfigSetLoading] = useState(true)
  const [courseConfigSetError, setCourseConfigSetError] = useState("")
  const [courseConfigSets, setCourseConfigSets] = useState<CourseConfigSet[]>([])
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState("")

  const selectedCourseConfigSetObj = useMemo(
    () =>
      courseConfigSets.find((s) => s.name === selectedCourseConfigSet) || null,
    [courseConfigSets, selectedCourseConfigSet]
  )
  const courseConfigSetTree = useMemo(
    () => extractCourseTreeFromCourseConfigSet(selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )
  const courseConfigSetCourses = useMemo(
    () => extractCoursesFromCourseConfigSet(selectedCourseConfigSetObj),
    [selectedCourseConfigSetObj]
  )
  const courseConfigSetCourseSet = useMemo(
    () => new Set(courseConfigSetCourses),
    [courseConfigSetCourses]
  )
  const courseConfigSetCategories = useMemo(
    () => extractCategoriesFromCourseTree(courseConfigSetTree),
    [courseConfigSetTree]
  )
  const courseConfigSetCategorySet = useMemo(
    () => new Set(courseConfigSetCategories),
    [courseConfigSetCategories]
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notes, setNotes] = useState<CourseNote[]>([])
  const [allNotes, setAllNotes] = useState<CourseNote[]>([])

  const [categoryFilter, setCategoryFilter] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [search, setSearch] = useState("")

  // 3단 레이아웃용 상태
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // 폼 상태
  const [formCategory, setFormCategory] = useState("")
  const [formCourses, setFormCourses] = useState<string[]>([])
  const [formTitle, setFormTitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formUpdatedBy, setFormUpdatedBy] = useState("") // 작성자/수정자 추가

  const loadCourseConfigSets = useCallback(async () => {
    setCourseConfigSetLoading(true)
    setCourseConfigSetError("")
    try {
      const raw = await apiClient.listCourseConfigSets()
      const list = normalizeCourseConfigSets(raw).sort((a, b) => {
        const aName = a?.name ?? ""
        const bName = b?.name ?? ""
        return bName.localeCompare(aName, "ko-KR")
      })
      setCourseConfigSets(list)
    } catch (e) {
      const message = e instanceof Error ? e.message : "설정 세트를 불러오지 못했습니다."
      setCourseConfigSetError(message)
      setCourseConfigSets([])
    } finally {
      setCourseConfigSetLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourseConfigSets()
  }, [loadCourseConfigSets])

  const loadNotes = useCallback(async () => {
    if (!selectedCourseConfigSet) return
    setLoading(true)
    setError("")
    try {
      const params: Record<string, string> = {}
      if (categoryFilter) params.category = categoryFilter
      if (courseFilter) params.course = courseFilter
      if (search.trim()) params.search = search.trim()
      params.courseConfigSetName = selectedCourseConfigSet

      const res = await apiClient.listCourseNotes(params)
      const results = Array.isArray(res?.results)
        ? (res.results as CourseNote[])
        : []
      const isOverallView = !categoryFilter && !courseFilter
      const filtered = results.filter((n) => {
        const courses = Array.isArray(n.courses) ? n.courses : []
        const category = String(n?.category || "").trim()

        if (isOverallView) {
          return courses.length === 0 && !category
        }
        if (courses.length > 0) {
          return courses.some((c) => courseConfigSetCourseSet.has(c))
        }
        if (category) return courseConfigSetCategorySet.has(category)
        return false
      })
      setNotes(filtered)
    } catch (e) {
      const message = e instanceof Error ? e.message : "메모를 불러오지 못했습니다."
      setError(message)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [
    categoryFilter,
    courseFilter,
    courseConfigSetCourseSet,
    courseConfigSetCategorySet,
    search,
    selectedCourseConfigSet,
  ])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const loadAllNotes = useCallback(async () => {
    if (!selectedCourseConfigSet) {
      setAllNotes([])
      return
    }
    try {
      const res = await apiClient.listCourseNotes({
        courseConfigSetName: selectedCourseConfigSet,
      })
      const results = Array.isArray(res?.results)
        ? (res.results as CourseNote[])
        : []
      const filtered = results.filter((n) => {
        const courses = Array.isArray(n.courses) ? n.courses : []
        const category = String(n?.category || "").trim()
        if (courses.length > 0) {
          return courses.some((c) => courseConfigSetCourseSet.has(c))
        }
        if (category) return courseConfigSetCategorySet.has(category)
        return true
      })
      setAllNotes(filtered)
    } catch (e) {
      setAllNotes([])
    }
  }, [
    courseConfigSetCourseSet,
    courseConfigSetCategorySet,
    selectedCourseConfigSet,
  ])

  useEffect(() => {
    loadAllNotes()
  }, [loadAllNotes])

  // 필터가 바뀌면 선택 초기화
  useEffect(() => {
    setSelectedNoteId(null)
    setIsCreating(false)
  }, [categoryFilter, courseFilter, search, selectedCourseConfigSet])

  const courseOptions = useMemo(
    () =>
      courseConfigSetCourses.slice().sort((a, b) => a.localeCompare(b, "ko-KR")),
    [courseConfigSetCourses]
  )

  const visibleNotes = useMemo(() => {
    return (notes || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() -
          new Date(a.updatedAt || 0).getTime()
      )
  }, [notes])

  // 설정 세트 선택 시
  const selectCourseConfigSet = useCallback((courseConfigSetName: string) => {
    setSelectedCourseConfigSet(courseConfigSetName)
    setCategoryFilter("")
    setCourseFilter("")
    setSearch("")
  }, [])

  // 새 메모 시작
  const startNewNote = useCallback(() => {
    setError("")
    setSelectedNoteId(null)
    setIsCreating(true)

    // 폼 초기화
    setFormCategory(categoryFilter || "")
    setFormCourses(courseFilter ? [courseFilter] : [])
    setFormTitle("")
    setFormContent("")
    setFormUpdatedBy("") // 초기화
  }, [categoryFilter, courseFilter])

  // 기존 메모 선택
  const selectNote = useCallback((note: CourseNote) => {
    setError("")
    setIsCreating(false)
    const nextId = note.id != null ? String(note.id) : null
    setSelectedNoteId(nextId)

    // 폼 채우기
    setFormCategory(note?.category || "")
    setFormCourses(Array.isArray(note?.courses) ? note.courses : [])
    setFormTitle(note?.title || "")
    setFormContent(note?.content || "")
    // 디버깅: 선택된 노트 데이터 확인

    // 수정자 정보: 가능한 모든 필드 패턴 확인
    const modifier = String(
      note?.createdBy ||
        note?.created_by ||
        note?.writer ||
        note?.writer_id ||
        note?.author ||
        note?.userId ||
        note?.user_id ||
        note?.username ||
        note?.owner ||
        note?.updatedBy ||
        note?.updated_by ||
        note?.user?.username ||
        note?.user?.id ||
        note?.account?.username ||
        ""
    )
    setFormUpdatedBy(modifier)
  }, [])

  const saveNote = useCallback(async () => {
    setError("")
    if (!selectedCourseConfigSet) {
      setError("설정 세트를 먼저 선택하세요.")
      return
    }

    const title = formTitle.trim()
    const category = String(formCategory || "").trim()
    const courses = (formCourses || []).filter(Boolean)
    const hasCourses = courses.length > 0
    if (!title) {
      setError("제목은 필수입니다.")
      return
    }
    if (!hasCourses && !category) {
      if (categoryFilter || courseFilter) {
        setError("전체 메모는 전체 메모 탭에서만 작성할 수 있습니다.")
        return
      }
    }
    if (hasCourses) {
      const invalid = courses.find((c) => !courseConfigSetCourseSet.has(c))
      if (invalid) {
        setError("선택한 과정에 포함되지 않는 과목이 있습니다.")
        return
      }
    }

    const payload = {
      category,
      courses,
      ...(hasCourses ? { course: courses[0] } : {}),
      title,
      content: formContent || "",
      courseConfigSetName: selectedCourseConfigSet,
    }
    try {
      if (selectedNoteId && !isCreating) {
        // Update
        await apiClient.updateCourseNote(selectedNoteId, payload)
        await loadNotes() // 목록 갱신
        await loadAllNotes()
      } else {
        // Create
        const res = await apiClient.createCourseNote(payload)
        await loadNotes()
        await loadAllNotes()
        setIsCreating(false)
      if (res && res.id) {
        setSelectedNoteId(String(res.id))
      }
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "저장에 실패했습니다."
    setError(message)
  }
  }, [
    selectedNoteId,
    isCreating,
    categoryFilter,
    courseFilter,
    formCategory,
    formContent,
    formCourses,
    formTitle,
    loadAllNotes,
    loadNotes,
    courseConfigSetCourseSet,
    selectedCourseConfigSet,
  ])

  const deleteNote = useCallback(async () => {
    const id = selectedNoteId
    if (!id || isCreating) return
    if (!confirm("삭제하시겠습니까?")) return
    try {
      await apiClient.deleteCourseNote(id, { courseConfigSetName: selectedCourseConfigSet })
      setSelectedNoteId(null) // 선택 해제
      await loadNotes()
      await loadAllNotes()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "삭제에 실패했습니다."
      setError(message)
    }
  }, [selectedNoteId, isCreating, loadAllNotes, loadNotes, selectedCourseConfigSet])

  return {
    courseConfigSetLoading,
    courseConfigSetError,
    courseConfigSets,
    selectedCourseConfigSet,
    selectCourseConfigSet,
    courseConfigSetCategories,
    courseConfigSetTree,
    courseOptions,
    courseConfigSetCourseSet,
    loadCourseConfigSets,

    loading,
    error,
    notes,
    allNotes,
    visibleNotes,
    loadNotes,

    categoryFilter,
    setCategoryFilter,
    courseFilter,
    setCourseFilter,
    search,
    setSearch,

    selectedNoteId,
    isCreating,
    startNewNote,
    selectNote,

    formCategory,
    setFormCategory,
    formCourses,
    setFormCourses,
    formTitle,
    setFormTitle,
    formContent,
    setFormContent,
    formUpdatedBy, // Return added

    saveNote,
    deleteNote,
  }
}

