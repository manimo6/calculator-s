import { useCallback, useState } from "react"

export function useRegistrationFilterState({
  setSelectedCourseConfigSet,
}: {
  setSelectedCourseConfigSet: (value: string) => void
}) {
  const [simulationDate, setSimulationDate] = useState<Date | null>(null)
  const [categoryFilter, setCategoryFilter] = useState("")
  const [courseFilter, setCourseFilter] = useState("")
  const [search, setSearch] = useState("")
  const [variantFilter, setVariantFilter] = useState("")

  const selectCourseConfigSet = useCallback((courseConfigSetName: string) => {
    setSelectedCourseConfigSet(courseConfigSetName)
    setCategoryFilter("")
    setCourseFilter("")
    setSearch("")
    setVariantFilter("")
  }, [setSelectedCourseConfigSet])

  const changeCategoryFilter = useCallback((nextCategory: string) => {
    setCategoryFilter(nextCategory)
    setCourseFilter("")
  }, [])

  return {
    simulationDate,
    setSimulationDate,
    categoryFilter,
    changeCategoryFilter,
    courseFilter,
    setCourseFilter,
    search,
    setSearch,
    variantFilter,
    setVariantFilter,
    selectCourseConfigSet,
  }
}
