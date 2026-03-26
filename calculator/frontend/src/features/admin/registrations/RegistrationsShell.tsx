import RegistrationsHeader from "./RegistrationsHeader"
import RegistrationsShellLayout from "./RegistrationsShellLayout"
import RegistrationsShellOverlays from "./RegistrationsShellOverlays"

export default function RegistrationsShell(props: any) {
  const {
    courseConfigSetLoading,
    courseConfigSets,
    selectedCourseConfigSet,
    selectCourseConfigSet,
    courseConfigSetCategories,
    categoryFilter,
    changeCategoryFilter,
    search,
    setSearch,
    loading,
    loadRegistrations,
    mergeManagerOpen,
    canManageMerges,
    setMergeManagerOpen,
    installmentMode,
    canViewInstallments,
    setInstallmentMode,
  } = props

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col -m-6 sm:-m-8">
      <RegistrationsHeader
        courseConfigSetLoading={courseConfigSetLoading}
        courseConfigSets={courseConfigSets}
        selectedCourseConfigSet={selectedCourseConfigSet}
        onSelectCourseConfigSet={selectCourseConfigSet}
        courseConfigSetCategories={courseConfigSetCategories}
        categoryFilter={categoryFilter}
        onCategoryChange={changeCategoryFilter}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        onRefresh={loadRegistrations}
        mergeManagerOpen={mergeManagerOpen}
        onToggleMergeManager={
          canManageMerges ? () => setMergeManagerOpen((value: boolean) => !value) : undefined
        }
        showMergeManager={canManageMerges}
        installmentMode={installmentMode}
        onToggleInstallmentMode={
          canViewInstallments ? () => setInstallmentMode((value: boolean) => !value) : undefined
        }
        showInstallmentToggle={canViewInstallments}
      />

      <RegistrationsShellLayout {...props} />
      <RegistrationsShellOverlays {...props} />
    </div>
  )
}
