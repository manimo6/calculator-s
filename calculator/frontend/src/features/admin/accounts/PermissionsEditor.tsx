import React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

import CourseConfigSetPicker from "../courseConfigSets/CourseConfigSetPicker"
import {
  EFFECT_ALLOW,
  EFFECT_DENY,
  EFFECT_INHERIT,
  EFFECT_OPTIONS,
  PERMISSION_LABELS,
} from "./permissionsConstants"

type Permission = { key?: string; description?: string } & Record<string, unknown>
type EffectChange = (value: string) => void

function toDomId(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
}

function EffectChooser({
  value,
  onChange,
  idPrefix,
  disabled,
}: {
  value: string
  onChange: EffectChange
  idPrefix: string
  disabled?: boolean
}) {
  const selected = value || EFFECT_INHERIT
  const prefix = toDomId(idPrefix)

  function handleChange(next: string) {
    if (next === EFFECT_INHERIT) {
      onChange("")
      return
    }
    onChange(next)
  }

  return (
    <RadioGroup
      value={selected}
      onValueChange={handleChange}
      className="grid grid-cols-3 gap-3"
      disabled={disabled}
    >
      {EFFECT_OPTIONS.map((option) => {
        const itemId = `${prefix}-${option.value}`
        return (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem
              id={itemId}
              value={option.value}
              disabled={disabled}
            />
            <Label htmlFor={itemId} className="text-xs text-muted-foreground">
              {option.label}
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  )
}

function PermissionRow({
  title,
  subtitle,
  value,
  onChange,
  idPrefix,
  disabled,
}: {
  title: string
  subtitle?: string
  value: string
  onChange: EffectChange
  idPrefix: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/40 p-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      <EffectChooser
        value={value}
        onChange={onChange}
        idPrefix={idPrefix}
        disabled={disabled}
      />
    </div>
  )
}

export default function PermissionsEditor({
  selectedUsername,
  selectedRoleLabel,
  hasSelectedUser,
  tabPermissions,
  buttonPermissions,
  permissionState,
  registrationsTabDenied,
  registrationChildKeySet,
  disableControls,
  onPermissionEffect,
  courseConfigSetNames,
  selectedCourseConfigSet,
  onSelectCourseConfigSet,
  sortedCategories,
  selectedCategories,
  onCategoryEffect,
  onAllCategoriesEffect,
}: {
  selectedUsername: string
  selectedRoleLabel: string
  hasSelectedUser: boolean
  tabPermissions: Permission[]
  buttonPermissions: Permission[]
  permissionState: Record<string, string>
  registrationsTabDenied: boolean
  registrationChildKeySet: Set<string>
  disableControls: boolean
  onPermissionEffect: (key: string, effect: string) => void
  courseConfigSetNames: string[]
  selectedCourseConfigSet: string
  onSelectCourseConfigSet: (value: string) => void
  sortedCategories: string[]
  selectedCategories: Record<string, string>
  onCategoryEffect: (setName: string, categoryKey: string, effect: string) => void
  onAllCategoriesEffect: (setName: string, effect: string, categoryList: string[]) => void
}) {
  function renderPermissionGroup(list: Permission[]) {
    if (!list.length) {
      return (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          이 그룹에 권한 항목이 없습니다.
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {list.map((perm) => {
          const key = String(perm?.key || "")
          const description = String(perm?.description || "")
          const label = (PERMISSION_LABELS as Record<string, string>)[key] || description || key
          const subtitle = label === key ? "" : key
          const isChildDenied =
            registrationsTabDenied && registrationChildKeySet.has(key)
          const value = isChildDenied ? EFFECT_DENY : permissionState[key] || ""
          return (
            <PermissionRow
              key={key}
              title={label}
              subtitle={subtitle}
              value={value}
              idPrefix={`perm-${key}`}
              disabled={disableControls || isChildDenied}
              onChange={(effect) => {
                void onPermissionEffect(key, effect)
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <div>
          <div className="text-xs text-muted-foreground">선택 계정</div>
          <div className="text-sm font-semibold">
            {selectedUsername || "계정을 선택하세요"}
          </div>
        </div>
        {hasSelectedUser ? (
          <Badge variant="outline">{selectedRoleLabel}</Badge>
        ) : null}
      </div>
      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions">권한</TabsTrigger>
          <TabsTrigger value="categories">카테고리</TabsTrigger>
        </TabsList>
        <TabsContent value="permissions" className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">탭</div>
              <Badge variant="outline">{tabPermissions.length}</Badge>
            </div>
            {renderPermissionGroup(tabPermissions)}
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">버튼</div>
              <Badge variant="outline">{buttonPermissions.length}</Badge>
            </div>
            {renderPermissionGroup(buttonPermissions)}
          </div>
        </TabsContent>
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[260px_1fr] md:items-center">
            <div className="space-y-2">
              <CourseConfigSetPicker
                courseConfigSetList={courseConfigSetNames}
                selectedCourseConfigSet={selectedCourseConfigSet}
                onSelectCourseConfigSet={onSelectCourseConfigSet}
                label="설정 세트"
                placeholder="설정 세트를 선택하세요"
                storageScope="permissions.categoryAccess"
                disabled={courseConfigSetNames.length === 0 || disableControls}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              카테고리 권한은 설정 세트별입니다. 설정이 없으면 모두 표시됩니다.
            </div>
          </div>

          {selectedCourseConfigSet ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disableControls || sortedCategories.length === 0}
                onClick={() => {
                  void onAllCategoriesEffect(
                    selectedCourseConfigSet,
                    EFFECT_ALLOW,
                    sortedCategories
                  )
                }}
              >
                전체 허용
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disableControls || sortedCategories.length === 0}
                onClick={() => {
                  void onAllCategoriesEffect(
                    selectedCourseConfigSet,
                    EFFECT_DENY,
                    sortedCategories
                  )
                }}
              >
                전체 차단
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disableControls || sortedCategories.length === 0}
                onClick={() => {
                  void onAllCategoriesEffect(
                    selectedCourseConfigSet,
                    "",
                    sortedCategories
                  )
                }}
              >
                전체 초기화
              </Button>
            </div>
          ) : null}

          <ScrollArea className="h-[320px] rounded-lg border border-border/60">
            <div className="space-y-3 p-4">
              {selectedCourseConfigSet ? (
                sortedCategories.length ? (
                  sortedCategories.map((categoryKey) => (
                    <PermissionRow
                      key={categoryKey}
                      title={categoryKey}
                      subtitle=""
                      value={selectedCategories[categoryKey] || ""}
                      idPrefix={`category-${selectedCourseConfigSet}-${categoryKey}`}
                      disabled={disableControls}
                      onChange={(effect) => {
                        void onCategoryEffect(
                          selectedCourseConfigSet,
                          categoryKey,
                          effect
                        )
                      }}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                    이 설정 세트에 카테고리가 없습니다.
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                  카테고리 권한을 설정할 설정 세트를 선택하세요.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
