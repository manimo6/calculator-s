import { useCallback, useEffect, useState } from "react"

import { apiClient } from "@/api-client"
import {
  courseConfigSetName,
  courseInfo,
  courseToCatMap,
  courseTree,
  fetchCourseData,
  recordingAvailable,
  setCourseConfigSetName,
  timeTable,
  weekdayName,
} from "@/utils/data"

import { normalizeCourseConfigSets } from "../courseConfigSets/utils"

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/
const COURSE_CONFIG_SETS_UPDATED_KEY = "courseConfigSets.updatedAt"

function isValidDateKey(value) {
  if (!DATE_KEY_RE.test(value)) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function normalizeBreakRanges(ranges) {
  if (!Array.isArray(ranges)) return { ranges: [], error: "" }

  const cleaned = []
  for (const range of ranges) {
    const startDate = String(range?.startDate || range?.start || "").trim()
    const endDate = String(range?.endDate || range?.end || "").trim()
    if (!startDate && !endDate) continue
    if (!startDate || !endDate) {
      return { ranges: [], error: "휴강 기간의 시작일과 종료일을 모두 입력하세요." }
    }
    if (!isValidDateKey(startDate) || !isValidDateKey(endDate)) {
      return { ranges: [], error: "휴강 기간 날짜 형식을 확인하세요." }
    }
    const [start, end] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
    cleaned.push({ startDate: start, endDate: end })
  }

  cleaned.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
  return { ranges: cleaned, error: "" }
}

const notifyCourseConfigSetsUpdated = () => {
  if (typeof window === "undefined") return
  const updatedAt = String(Date.now())
  try {
    localStorage.setItem(COURSE_CONFIG_SETS_UPDATED_KEY, updatedAt)
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(
    new CustomEvent("course-config-sets:updated", { detail: { updatedAt } })
  )
}

export function useCourseManager() {
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [isConfigDirty, setIsConfigDirty] = useState(false)

  const [toast, setToast] = useState({ visible: false, message: "" })

  const [courseConfigSetList, setCourseConfigSetList] = useState([])
  const [selectedCourseConfigSet, setSelectedCourseConfigSet] = useState("")

  const showToast = useCallback((message) => {
    setToast({ visible: true, message: message || "" })
    setTimeout(() => setToast({ visible: false, message: "" }), 3000)
  }, [])

  const rebuildCourseToCatMap = useCallback(() => {
    Object.keys(courseToCatMap).forEach((k) => delete courseToCatMap[k])
    for (const group of courseTree) {
      for (const item of group.items || []) {
        courseToCatMap[item.val] = group.cat
      }
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await fetchCourseData()
      setLastUpdated(Date.now())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCourseConfigSets = useCallback(async () => {
    try {
      const raw = await apiClient.listCourseConfigSets()
      const list = normalizeCourseConfigSets(raw)
      const names = list
        .map((p) => p.name)
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a, "ko-KR"))
      setCourseConfigSetList(names)
    } catch {
      setCourseConfigSetList([])
    }
  }, [])

  useEffect(() => {
    loadData()
    loadCourseConfigSets()
  }, [loadCourseConfigSets, loadData])

  const handleSaveCategory = useCallback(
    (newName, originalName) => {
      const name = (newName || "").trim()
      if (!name) {
        showToast("카테고리 이름을 입력하세요.")
        return
      }
      const dup = courseTree.find((g) => g.cat === name)
      if (dup && name !== originalName) {
        showToast("이미 존재하는 카테고리입니다.")
        return
      }

      if (originalName) {
        const target = courseTree.find((g) => g.cat === originalName)
        if (target) target.cat = name
      } else {
        courseTree.push({ cat: name, items: [] })
      }

      rebuildCourseToCatMap()
      setIsConfigDirty(true)
      setLastUpdated(Date.now())
    },
    [rebuildCourseToCatMap, setIsConfigDirty, showToast]
  )

  const handleDeleteCategory = useCallback(
    (catName) => {
      const idx = courseTree.findIndex((g) => g.cat === catName)
      if (idx === -1) return
      const group = courseTree[idx]
      const hasItems = Array.isArray(group.items) && group.items.length > 0
      if (hasItems) {
        showToast("하위 수업을 먼저 삭제해야 카테고리를 삭제할 수 있습니다.")
        return
      }
      const ok = confirm(`'${catName}' 카테고리를 삭제할까요?`)
      if (!ok) return

      ;(group.items || []).forEach((item) => {
        const label = item.label
        delete courseInfo[item.val]
        delete recordingAvailable[item.val]
        delete timeTable[item.val]
        if (label) delete timeTable[label]
      })

      courseTree.splice(idx, 1)
      rebuildCourseToCatMap()
      setIsConfigDirty(true)
      setLastUpdated(Date.now())
      showToast("삭제되었습니다.")
    },
    [rebuildCourseToCatMap, setIsConfigDirty, showToast]
  )

  const handleSaveCourse = useCallback(
    (formData, courseId) => {
      const name = (formData?.courseName || "").trim()
      const category = (formData?.category || "").trim()
      if (!name || !category) {
        showToast("카테고리와 수업명을 입력하세요.")
        return false
      }

      const days = Array.isArray(formData?.days) ? formData.days : []
      if (days.length === 0) {
        showToast("수업 요일을 1개 이상 선택하세요.")
        return false
      }

      const endDays = Array.isArray(formData?.endDays) ? formData.endDays : []
      if (endDays.length === 0) {
        showToast("종료 가능 요일을 1개 선택하세요.")
        return false
      }
      if (endDays.length !== 1) {
        showToast("종료 가능 요일은 1개만 선택하세요.")
        return false
      }

      if (!courseId) {
        const startDays = Array.isArray(formData?.startDays) ? formData.startDays : []
        if (startDays.length === 0) {
          showToast("시작 가능 요일을 1개 이상 선택하세요.")
          return false
        }
      }

      const timeType = formData?.timeType || "default"
      if (timeType === "default") {
        const time = (formData?.timeDefault || "").trim()
        if (!time) {
          showToast("수업 시간을 입력하세요.")
          return false
        }
      } else if (timeType === "onoff") {
        const online = (formData?.timeOnline || "").trim()
        const offline = (formData?.timeOffline || "").trim()
        if (!online || !offline) {
          showToast("온라인/오프라인 시간을 모두 입력하세요.")
          return false
        }
      } else if (timeType === "dynamic") {
        const raw = Array.isArray(formData?.dynamicOptions)
          ? formData.dynamicOptions
          : []
        const opts = raw
          .map((opt) => ({
            label: (opt?.label || "").trim(),
            time: (opt?.time || "").trim(),
          }))
          .filter((o) => o.label || o.time)

        if (opts.length === 0) {
          showToast("시간 옵션을 1개 이상 입력하세요.")
          return false
        }
        const invalid = opts.find((o) => !o.label || !o.time)
        if (invalid) {
          showToast("시간 옵션의 라벨과 시간을 모두 입력하세요.")
          return false
        }
        const labels = opts.map((o) => o.label)
        const dupLabel = labels.find((l, i) => labels.indexOf(l) !== i)
        if (dupLabel) {
          showToast("시간 옵션 라벨이 중복되었습니다.")
          return false
        }
      } else {
        showToast("시간 설정 방식을 확인하세요.")
        return false
      }

      const breakRangesResult = normalizeBreakRanges(formData?.breakRanges)
      if (breakRangesResult.error) {
        showToast(breakRangesResult.error)
        return false
      }

      const dupCourse = courseTree
        .flatMap((g) => g.items || [])
        .find((it) => it.label === name && it.val !== courseId)
      if (dupCourse) {
        showToast("이미 존재하는 수업명입니다.")
        return false
      }

      const ensureCategory = (cat) => {
        let group = courseTree.find((g) => g.cat === cat)
        if (!group) {
          group = { cat, items: [] }
          courseTree.push(group)
        }
        return group
      }

      const buildTimeValue = () => {
        const t = formData?.timeType || "default"
        if (t === "onoff") {
          return {
            온라인: (formData?.timeOnline || "").trim(),
            오프라인: (formData?.timeOffline || "").trim(),
          }
        }
        if (t === "dynamic") {
          const obj = {}
          const options = Array.isArray(formData?.dynamicOptions)
            ? formData.dynamicOptions
            : []
          options
            .map((opt) => ({
              label: (opt?.label || "").trim(),
              time: (opt?.time || "").trim(),
            }))
            .filter((o) => o.label && o.time)
            .forEach((o) => {
              obj[o.label] = o.time
            })
          return obj
        }
        return (formData?.timeDefault || "").trim()
      }

      const buildRecordingValue = () => {
        const t = formData?.timeType || "default"
        if (t === "onoff") {
          return { 온라인: !!formData?.isRecordingOnline, 오프라인: !!formData?.isRecordingOffline }
        }
        return !!formData?.isRecordingAvailable
      }

      const buildCourseInfo = (prev) => {
        const next = { ...(prev || {}) }
        next.name = name
        next.fee = Number(formData?.fee || 0)
        next.textbook = formData?.textbook || next.textbook || {}
        next.days = Array.isArray(formData?.days) ? formData.days : []
        next.startDays = Array.isArray(formData?.startDays) ? formData.startDays : []
        next.endDays = Array.isArray(formData?.endDays) ? formData.endDays : []
        next.endDay = next.endDays?.length ? next.endDays[0] : prev?.endDay ?? 5
        next.min = Number(formData?.minDuration || 1)
        next.max = Number(formData?.maxDuration || 12)
        // React UI uses these fields in 일부 컴포넌트
        next.minDuration = next.min
        next.maxDuration = next.max
        const hasMathOption = !!formData?.hasMathOption
        next.hasMathOption = hasMathOption
        next.mathExcludedFee = hasMathOption ? Number(formData?.mathExcludedFee || 0) : 0
        next.installmentEligible = !!formData?.installmentEligible
        next.breakRanges = breakRangesResult.ranges
        if (formData?.timeType === "dynamic") next.dynamicTime = true
        else delete next.dynamicTime
        return next
      }

      if (courseId) {
        let fromGroup = null
        let fromIdx = -1
        for (const g of courseTree) {
          const i = (g.items || []).findIndex((it) => it.val === courseId)
          if (i !== -1) {
            fromGroup = g
            fromIdx = i
            break
          }
        }
        if (!fromGroup || fromIdx === -1) {
          showToast("수업을 찾지 못했습니다.")
          return false
        }
        const oldLabel = fromGroup.items[fromIdx].label
        const targetGroup = ensureCategory(category)
        const item = { ...fromGroup.items[fromIdx], label: name }

        if (fromGroup !== targetGroup) {
          fromGroup.items.splice(fromIdx, 1)
          targetGroup.items.push(item)
        } else {
          fromGroup.items[fromIdx] = item
        }

        courseInfo[courseId] = buildCourseInfo(courseInfo[courseId])
        const nextTime = buildTimeValue()
        delete timeTable[courseId]
        if (oldLabel) delete timeTable[oldLabel]
        timeTable[name] = nextTime
        recordingAvailable[courseId] = buildRecordingValue()
      } else {
        const newId = `course_${Date.now()}`
        const targetGroup = ensureCategory(category)
        targetGroup.items.push({ val: newId, label: name })
        courseInfo[newId] = buildCourseInfo({})
        timeTable[name] = buildTimeValue()
        recordingAvailable[newId] = buildRecordingValue()
      }

      rebuildCourseToCatMap()
      setIsConfigDirty(true)
      setLastUpdated(Date.now())
      return true
    },
    [rebuildCourseToCatMap, setIsConfigDirty, showToast]
  )

  const handleDeleteCourse = useCallback(
    (id) => {
      if (!id) return
      let group = null
      let idx = -1
      for (const g of courseTree) {
        const i = (g.items || []).findIndex((it) => it.val === id)
        if (i !== -1) {
          group = g
          idx = i
          break
        }
      }
      if (!group || idx === -1) return
      const label = group.items[idx].label
      if (!confirm(`'${label || id}' 수업을 삭제할까요?`)) return

      group.items.splice(idx, 1)
      delete courseInfo[id]
      delete recordingAvailable[id]
      delete timeTable[id]
      if (label) delete timeTable[label]

      rebuildCourseToCatMap()
      setIsConfigDirty(true)
      setLastUpdated(Date.now())
      showToast("삭제되었습니다.")
    },
    [rebuildCourseToCatMap, setIsConfigDirty, showToast]
  )

  const handleSaveToServer = useCallback(async () => {
    try {
      const payload = {
        courseConfigSetName,
        weekdayName,
        courseTree,
        courseInfo,
        timeTable,
        recordingAvailable,
      }
      await apiClient.saveCourses(payload)
      showToast("서버에 저장되었습니다.")
      notifyCourseConfigSetsUpdated()
    } catch (e) {
      alert("저장 실패: " + e.message)
    }
  }, [showToast])

  const handleSaveCourseConfigSet = useCallback(async () => {
    const name = prompt("설정 세트 이름을 입력하세요:")
    if (!name) return
    const data = { weekdayName, courseTree, courseInfo, timeTable, recordingAvailable }
    try {
      await apiClient.saveCourseConfigSet(name, data)
      showToast(`설정 세트 '${name}'이(가) 저장되었습니다.`)
      notifyCourseConfigSetsUpdated()
      await loadCourseConfigSets()
    } catch (e) {
      showToast(e.message || "설정 세트 저장 실패")
    }
  }, [loadCourseConfigSets, showToast])

  const applyCourseConfigSetData = useCallback(
    (name, courseConfigSetData) => {
      if (courseConfigSetData.weekdayName) {
        weekdayName.length = 0
        weekdayName.push(...courseConfigSetData.weekdayName)
      }
      courseTree.length = 0
      courseTree.push(...(courseConfigSetData.courseTree || []))
      Object.keys(courseInfo).forEach((k) => delete courseInfo[k])
      Object.assign(courseInfo, courseConfigSetData.courseInfo || {})
      Object.keys(timeTable).forEach((k) => delete timeTable[k])
      Object.assign(timeTable, courseConfigSetData.timeTable || {})
      Object.keys(recordingAvailable).forEach((k) => delete recordingAvailable[k])
      Object.assign(
        recordingAvailable,
        courseConfigSetData.recordingAvailable || {}
      )

      setCourseConfigSetName(name)
      rebuildCourseToCatMap()
      setIsConfigDirty(false)
      setLastUpdated(Date.now())
    },
    [rebuildCourseToCatMap, setIsConfigDirty]
  )

  const loadCourseConfigSetByName = useCallback(
    async (name) => {
      if (!name) return false
      try {
        const raw = await apiClient.listCourseConfigSets()
        const courseConfigSetData =
          raw && typeof raw === "object" && !Array.isArray(raw) ? raw[name] : null
        if (!courseConfigSetData) {
          showToast("설정 세트 데이터를 찾지 못했습니다.")
          return false
        }

        applyCourseConfigSetData(name, courseConfigSetData)
        setSelectedCourseConfigSet(name)
        showToast("설정 세트를 불러왔습니다.")
        return true
      } catch (e) {
        showToast(e.message || "설정 세트 불러오기 실패")
        return false
      }
    },
    [applyCourseConfigSetData, setSelectedCourseConfigSet, showToast]
  )

  const handleOverwriteCourseConfigSet = useCallback(async () => {
    const name = String(selectedCourseConfigSet || "").trim()
    if (!name) {
      showToast("덮어쓸 설정 세트를 선택하세요.")
      return
    }
    if (!confirm(`'${name}' 설정 세트에 현재 설정을 덮어쓸까요?`)) return
    const data = { weekdayName, courseTree, courseInfo, timeTable, recordingAvailable }
    try {
      await apiClient.saveCourseConfigSet(name, data)
      showToast(`설정 세트 '${name}'에 덮어썼습니다.`)
      notifyCourseConfigSetsUpdated()
      setIsConfigDirty(false)
      await loadCourseConfigSets()
    } catch (e) {
      showToast(e.message || "설정 세트 덮어쓰기 실패")
    }
  }, [loadCourseConfigSets, selectedCourseConfigSet, setIsConfigDirty, showToast])

  const handleLoadCourseConfigSet = useCallback(async () => {
    const name = selectedCourseConfigSet
    if (!name) {
      showToast("불러올 설정 세트를 선택하세요.")
      return
    }
    if (
      !confirm(
        `현재 설정이 덮어씌워집니다. '${name}' 설정 세트를 불러오시겠습니까?`
      )
    )
      return
    await loadCourseConfigSetByName(name)
  }, [loadCourseConfigSetByName, selectedCourseConfigSet, showToast])

  const handleSelectCourseConfigSet = useCallback(
    async (name) => {
      const nextName = String(name || "").trim()
      if (!nextName) {
        setSelectedCourseConfigSet("")
        return
      }

      if (nextName === selectedCourseConfigSet) return
      if (isConfigDirty) {
        const ok = confirm(
          `변경사항이 저장되지 않았습니다. '${nextName}' 설정 세트를 불러오시겠습니까?`
        )
        if (!ok) return
      }

      await loadCourseConfigSetByName(nextName)
    },
    [
      isConfigDirty,
      loadCourseConfigSetByName,
      selectedCourseConfigSet,
      setSelectedCourseConfigSet,
    ]
  )

  const handleDeleteCourseConfigSet = useCallback(async () => {
    const name = selectedCourseConfigSet
    if (!name) {
      showToast("삭제할 설정 세트를 선택하세요.")
      return
    }
    if (!confirm(`'${name}' 설정 세트를 삭제하시겠습니까?`)) return
    const typed = prompt(
      `삭제하려면 설정 세트 이름을 입력하세요:\n${name}`
    )
    if (typed === null) return
    if (String(typed).trim() !== String(name).trim()) {
      showToast("이름이 일치하지 않아 삭제를 취소했습니다.")
      return
    }
    try {
      await apiClient.deleteCourseConfigSet(name)
      showToast("설정 세트가 삭제되었습니다.")
      notifyCourseConfigSetsUpdated()
      setSelectedCourseConfigSet("")
      await loadCourseConfigSets()
    } catch (e) {
      if (String(e?.message || "") === "Recent authentication required.") {
        throw e
      }
      showToast(e.message || "설정 세트 삭제 실패")
    }
  }, [loadCourseConfigSets, selectedCourseConfigSet, showToast])

  return {
    loading,
    lastUpdated,
    toast,
    showToast,
    isConfigDirty,

    courseConfigSetList,
    selectedCourseConfigSet,
    setSelectedCourseConfigSet,
    loadCourseConfigSets,

    loadData,

    handleSaveCategory,
    handleDeleteCategory,
    handleSaveCourse,
    handleDeleteCourse,
    handleSaveToServer,

    handleSaveCourseConfigSet,
    handleOverwriteCourseConfigSet,
    handleLoadCourseConfigSet,
    handleSelectCourseConfigSet,
    handleDeleteCourseConfigSet,

    courseTree,
  }
}
