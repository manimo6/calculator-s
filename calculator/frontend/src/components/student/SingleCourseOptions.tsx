import React, { useState, useEffect, useMemo } from 'react';
import { weekdayName, timeTable, recordingAvailable, type CourseInfo, type TimeTableEntry } from '../../utils/data';
import { getAvailableRecordingDates, getScheduleWeeks, normalizeSkipWeeks } from '../../utils/calculatorLogic';
import { Calendar as CalendarIcon, Clock, MapPin, Monitor, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DateValue, DatesRangeValue } from '@mantine/dates';

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DateInput = string | number | Date | null | undefined
type CheckedState = boolean | 'indeterminate'

type CourseInputs = {
    period?: number | string
    startDate?: string
    skipWeeks?: Array<number | string>
    skipWeeksEnabled?: boolean
    courseType?: string
    selectedDynamicTime?: string
    selectedSatCampus?: string
    drwLevel?: string
    recordingEnabled?: boolean
    recordingDates?: string[]
    excludeMath?: boolean
}

type DynamicOption = { label: string; time: string }
type CourseInfoMap = Record<string, CourseInfo | undefined>

const areArraysEqual = (a: Array<string | number> = [], b: Array<string | number> = []) =>
    a.length === b.length && a.every((v, i) => v === b[i]);
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_MS = 24 * 60 * 60 * 1000;
const isStringEntry = (entry: [string, unknown]): entry is [string, string] => typeof entry[1] === 'string';
const parseDateOnly = (value: DateInput) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

const SingleCourseOptions = ({
    selectedCourseKey,
    courseInfo,
    inputs,
    onChange,
    onRecordingChange,
    calendarMinDate,
    calendarMaxDate
}: {
    selectedCourseKey: string
    courseInfo: CourseInfoMap
    inputs: CourseInputs
    onChange: (field: keyof CourseInputs | string, value: unknown) => void
    onRecordingChange: (dates: string[]) => void
    calendarMinDate?: Date
    calendarMaxDate?: Date
}) => {
    const c = courseInfo[selectedCourseKey];
    if (!c) return null;

    const courseLabel = c?.name || selectedCourseKey;
    const timeData: TimeTableEntry | undefined = timeTable[selectedCourseKey] || timeTable[courseLabel];

    const allowedStartDays = useMemo(() => {
        const raw = Array.isArray(c.startDays) ? c.startDays : [];
        return raw
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    }, [c.startDays]);

    const disabledStartDays = useMemo(() => {
        if (!allowedStartDays.length) return null;
        const all = [0, 1, 2, 3, 4, 5, 6];
        return all.filter((d) => !allowedStartDays.includes(d));
    }, [allowedStartDays]);

    const timeMeta = useMemo(() => {
        if (!timeData) {
            return {
                isOnOff: false,
                isDynamic: false,
                dynamicOptions: [] as DynamicOption[]
            };
        }

        if (typeof timeData === 'object') {
            const timeMap = timeData as Record<string, unknown> & { type?: string; options?: DynamicOption[] };
            const keys = Object.keys(timeMap || {});
            const hasOnOffKeys =
                keys.includes('온라인') ||
                keys.includes('오프라인') ||
                keys.includes('online') ||
                keys.includes('offline');

            if (timeMap.type === 'onoff' || hasOnOffKeys) {
                return {
                    isOnOff: true,
                    isDynamic: false,
                    dynamicOptions: [] as DynamicOption[]
                };
            }

            if (timeMap.type === 'dynamic') {
                const opts = Array.isArray(timeMap.options) ? timeMap.options : [];
                return {
                    isOnOff: false,
                    isDynamic: true,
                    dynamicOptions: opts.filter((o) => o && o.label)
                };
            }

            const opts: DynamicOption[] = Object.entries(timeMap as Record<string, unknown>)
                .filter(isStringEntry)
                .map(([label, time]) => ({ label, time }))
                .filter((o) => o.label);

            if (opts.length > 0) {
                return {
                    isOnOff: false,
                    isDynamic: true,
                    dynamicOptions: opts
                };
            }
        }

        return {
            isOnOff: false,
            isDynamic: false,
            dynamicOptions: []
        };
    }, [c.dynamicTime, timeData]);

    const hasMathOptionFlag = c?.hasMathOption;
    const shouldShowMathExclude =
        hasMathOptionFlag === true ||
        (hasMathOptionFlag == null && Number(c?.mathExcludedFee) > 0) ||
        ['sat_1500', 'sat_1400', 'sat_bridge'].includes(selectedCourseKey);

    useEffect(() => {
        if (shouldShowMathExclude) return;
        if (inputs.excludeMath) {
            onChange('excludeMath', false);
        }
    }, [inputs.excludeMath, onChange, shouldShowMathExclude]);

    // Options for dropdowns
    const durationOptions = useMemo(() => {
        if (!c.minDuration && !c.maxDuration) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const opts = [];
        const min = c.minDuration || 1;
        const max = c.maxDuration || 12;
        for (let i = min; i <= max; i++) opts.push(i);
        return opts;
    }, [c]);

    const periodValue = Number(inputs.period) || 0;
    const rawSkipWeeks = Array.isArray(inputs.skipWeeks) ? inputs.skipWeeks : [];
    const recordingDates = Array.isArray(inputs.recordingDates) ? inputs.recordingDates : [];
    const skipWeeksEnabled = Boolean(inputs.skipWeeksEnabled || rawSkipWeeks.length > 0);
    const endDay = Array.isArray(c.endDays) && c.endDays.length > 0 ? c.endDays[0] : c.endDay;
    const selectedStartDate = useMemo(
        () => (inputs.startDate ? parseDateOnly(inputs.startDate) : null),
        [inputs.startDate]
    );
    const calendarDefaultDate = selectedStartDate || calendarMinDate || undefined;
    const calendarKey = calendarMinDate ? calendarMinDate.toISOString() : "calendar-default";
    const scheduleMeta = useMemo(() => {
        const scheduleInput: Parameters<typeof getScheduleWeeks>[0] = {
            startDate: inputs.startDate,
            durationWeeks: periodValue,
            skipWeeks: skipWeeksEnabled ? rawSkipWeeks : [],
            courseDays: c.days || [1, 2, 3, 4, 5],
            endDayOfWeek: endDay,
            breakRanges: c.breakRanges
        };
        return getScheduleWeeks(scheduleInput);
    }, [c.breakRanges, c.days, endDay, inputs.startDate, periodValue, rawSkipWeeks, skipWeeksEnabled]);
    const normalizedSkipWeeks = useMemo(
        () => (skipWeeksEnabled ? scheduleMeta.skipWeeks || normalizeSkipWeeks(rawSkipWeeks, periodValue) : []),
        [periodValue, rawSkipWeeks, scheduleMeta.skipWeeks, skipWeeksEnabled]
    );
    const scheduleWeeks = scheduleMeta.scheduleWeeks || periodValue + normalizedSkipWeeks.length;
    const weekChips = useMemo(
        () => Array.from({ length: scheduleWeeks }, (_, idx) => idx + 1),
        [scheduleWeeks]
    );

    const recordingMeta = useMemo(() => {
        const raw = recordingAvailable[selectedCourseKey] ?? recordingAvailable[courseLabel];
        if (!raw) return { kind: 'none', enabled: false, online: false, offline: false };
        if (typeof raw === 'boolean') return { kind: 'boolean', enabled: raw, online: raw, offline: raw };
        if (typeof raw === 'object') {
            const online = !!(raw['온라인'] ?? raw.online);
            const offline = !!(raw['오프라인'] ?? raw.offline);
            return { kind: 'byType', enabled: online || offline, online, offline };
        }
        return { kind: 'boolean', enabled: !!raw, online: !!raw, offline: !!raw };
    }, [courseLabel, selectedCourseKey]);

    const isRecordingAvailableForSelection = useMemo(() => {
        if (!recordingMeta.enabled) return false;
        if (recordingMeta.kind !== 'byType') return true;

        const rawType = String(inputs.courseType || '').trim();
        const normalizedType = rawType.includes('온라인')
            ? '온라인'
            : rawType.includes('오프라인')
                ? '오프라인'
                : rawType;

        if (normalizedType === '온라인') return recordingMeta.online;
        if (normalizedType === '오프라인') return recordingMeta.offline;
        return false;
    }, [inputs.courseType, recordingMeta.enabled, recordingMeta.kind, recordingMeta.offline, recordingMeta.online]);

    useEffect(() => {
        if (isRecordingAvailableForSelection) return;

        const hasRecordingDates = recordingDates.length > 0;
        if (!inputs.recordingEnabled && !hasRecordingDates) return;

        onChange('recordingEnabled', false);
        onRecordingChange([]);
    }, [inputs.recordingDates, inputs.recordingEnabled, isRecordingAvailableForSelection, onChange, onRecordingChange]);

    useEffect(() => {
        if (!skipWeeksEnabled) {
            if (rawSkipWeeks.length) {
                onChange('skipWeeks', []);
            }
            return;
        }
        if (areArraysEqual(normalizedSkipWeeks, rawSkipWeeks)) return;
        onChange('skipWeeks', normalizedSkipWeeks);
    }, [normalizedSkipWeeks, onChange, rawSkipWeeks, skipWeeksEnabled]);

    // Derived state for recording calendar
    const [calendarDates, setCalendarDates] = useState<string[]>([]);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        // Generate calendar grid if recording is enabled and dates are selected
        if (inputs.recordingEnabled && inputs.startDate && periodValue) {
            const allowedDays = c.days || [1, 2, 3, 4, 5];
            const dates = getAvailableRecordingDates(
                inputs.startDate,
                scheduleWeeks,
                allowedDays,
                normalizedSkipWeeks,
                c.breakRanges
            );
            setCalendarDates(dates);

            const selected = Array.isArray(inputs.recordingDates) ? inputs.recordingDates : [];
            const filtered = selected.filter((d) => dates.includes(d));
            if (!areArraysEqual(selected, filtered)) {
                onRecordingChange(filtered);
            }
        } else {
            setCalendarDates([]);
        }
    }, [
        inputs.recordingEnabled,
        inputs.startDate,
        periodValue,
        scheduleWeeks,
        normalizedSkipWeeks,
        recordingDates,
        c,
        onRecordingChange
    ]);
    const calendarWeeks = useMemo(() => {
        if (!inputs.startDate || calendarDates.length === 0) return [];
        const start = parseDateOnly(inputs.startDate);
        if (!start) return [];
        const dateSet = new Set(calendarDates);
        const weekSet = new Set<number>();

        for (const dateStr of calendarDates) {
            const date = parseDateOnly(dateStr);
            if (!date) continue;
            const diffDays = Math.floor((date.getTime() - start.getTime()) / DAY_MS);
            const weekIndex = Math.floor(diffDays / 7) + 1;
            weekSet.add(weekIndex);
        }

        const weekIndices = Array.from(weekSet)
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b);
        return weekIndices.map((weekIndex) => {
            const weekStart = new Date(start.getTime() + (weekIndex - 1) * 7 * DAY_MS);
            const weekStartDow = weekStart.getDay();
            const cells = WEEKDAY_ORDER.map((weekday) => {
                const offset = (weekday - weekStartDow + 7) % 7;
                const date = new Date(weekStart.getTime() + offset * DAY_MS);
                const dateKey = date.toISOString().slice(0, 10);
                return {
                    dateKey,
                    selectable: dateSet.has(dateKey)
                };
            });
            return {
                weekIndex,
                cells
            };
        });
    }, [calendarDates, inputs.startDate]);

    const weekdayLabels = WEEKDAY_ORDER.map((dayIndex) => weekdayName[dayIndex]);

    const handleSkipWeekToggle = (weekIndex: number) => {
        if (!skipWeeksEnabled) return;
        if (weekIndex === 1) return;
        const nextSet = new Set(normalizedSkipWeeks);
        if (nextSet.has(weekIndex)) {
            nextSet.delete(weekIndex);
        } else {
            nextSet.add(weekIndex);
        }
        const next = Array.from(nextSet).sort((a, b) => a - b);
        onChange('skipWeeks', next);
    };

    const handleSkipWeeksEnabledChange = (checked: CheckedState) => {
        const enabled = Boolean(checked);
        onChange('skipWeeksEnabled', enabled);
        if (!enabled && rawSkipWeeks.length) {
            onChange('skipWeeks', []);
        }
    };

    const handleDateClick = (dateStr: string) => {
        // Toggle date in recordingDates
        const current = Array.isArray(inputs.recordingDates) ? inputs.recordingDates : [];
        let nextDates;
        if (current.includes(dateStr)) {
            nextDates = current.filter(d => d !== dateStr);
        } else {
            nextDates = [...current, dateStr].sort();
        }
        onRecordingChange(nextDates);
    };

    const getDayLabel = (dateStr: string) => {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()}(${weekdayName[d.getDay()]})`;
    };

    const getWeekRangeLabel = (weekIndex: number) => {
        if (!inputs.startDate) return "";
        const start = parseDateOnly(inputs.startDate);
        if (!start) return "";
        const weekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (weekIndex - 1) * 7);
        const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
        const rawDays =
            Array.isArray(c.days) && c.days.length > 0
                ? c.days
                : allowedStartDays;
        const classDays = (Array.isArray(rawDays) ? rawDays : [])
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
            .sort((a, b) => a - b);

        let classDates: Date[] = [];
        if (classDays.length > 0) {
            classDates = classDays
                .map((day) => {
                    const offset = (day - weekStart.getDay() + 7) % 7;
                    const date = new Date(
                        weekStart.getFullYear(),
                        weekStart.getMonth(),
                        weekStart.getDate() + offset
                    );
                    return date >= weekStart && date <= weekEnd ? date : null;
                })
                .filter((date): date is Date => Boolean(date))
                .sort((a, b) => a.getTime() - b.getTime());
        }

        const rangeStart = classDates.length ? classDates[0] : weekStart;
        const rangeEnd = classDates.length ? classDates[classDates.length - 1] : weekEnd;
        const startLabel = format(rangeStart, "M/d(eee)", { locale: ko });
        const endLabel = format(rangeEnd, "M/d(eee)", { locale: ko });
        return startLabel === endLabel ? startLabel : `${startLabel} ~ ${endLabel}`;
    };

    const handleCalendarSelect = (value: DateValue | DatesRangeValue<DateValue> | DateValue[] | undefined) => {
        if (value instanceof Date) {
            onChange('startDate', format(value, 'yyyy-MM-dd'));
            setIsCalendarOpen(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Start Date & Duration Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="flex items-center text-sm font-semibold text-muted-foreground">
                        <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
                        수강 시작일
                    </Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-between text-left font-normal h-12 rounded-xl",
                                    !inputs.startDate && "text-muted-foreground"
                                )}
                            >
                                {inputs.startDate
                                    ? format(new Date(inputs.startDate), "PPP", { locale: ko })
                                    : "날짜를 선택하세요"}
                                <CalendarIcon className="mr-2 h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto border-none bg-transparent p-0 shadow-none"
                            align="start"
                        >
                            <Calendar
                                key={calendarKey}
                                mode="single"
                                selected={inputs.startDate ? new Date(inputs.startDate) : undefined}
                                onSelect={handleCalendarSelect}
                                minDate={calendarMinDate || undefined}
                                maxDate={calendarMaxDate || undefined}
                                defaultDate={calendarDefaultDate}
                                initialFocus
                                disabled={disabledStartDays ? { dayOfWeek: disabledStartDays } : undefined}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center text-sm font-semibold text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2 text-primary" />
                        수강 기간
                    </Label>
                    <Select
                        value={String(inputs.period)}
                        onValueChange={(val) => onChange('period', parseInt(val))}
                    >
                        <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="기간 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {durationOptions.map(w => (
                                <SelectItem key={w} value={String(w)}>{w}주</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Dynamic Time Options */}
            {timeMeta.isDynamic && timeMeta.dynamicOptions.length > 0 && (
                <div className="space-y-3">
                    <Label className="text-sm font-semibold text-primary">시간 선택</Label>
                    <RadioGroup
                        value={inputs.selectedDynamicTime}
                        onValueChange={(val) => onChange('selectedDynamicTime', val)}
                        className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                        {timeMeta.dynamicOptions.map((opt, idx) => (
                            <div key={`${opt.label}-${idx}`}>
                                <RadioGroupItem value={opt.label} id={`dyn-${idx}`} className="peer sr-only" />
                                <Label
                                    htmlFor={`dyn-${idx}`}
                                    className="flex items-center justify-between p-4 border-2 border-muted bg-white rounded-xl cursor-pointer transition-all hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary"
                                >
                                    <div>
                                        <div className="font-semibold">{opt.label}</div>
                                        <div className="text-sm text-muted-foreground">{opt.time}</div>
                                    </div>
                                    {inputs.selectedDynamicTime === opt.label ? (
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground/30" />
                                    )}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            )}

            {/* Dynamic Campus Options (e.g. SAT) */}
            {c.dynamicOptions && (
                <div className="space-y-3">
                    <Label className="flex items-center text-sm font-semibold text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                        캠퍼스 선택
                    </Label>
                    <RadioGroup
                        value={inputs.selectedSatCampus}
                        onValueChange={(val) => onChange('selectedSatCampus', val)}
                        className="grid grid-cols-3 gap-3"
                    >
                        {Object.keys(c.dynamicOptions).map(campus => (
                            <div key={campus}>
                                <RadioGroupItem value={campus} id={campus} className="peer sr-only" />
                                <Label
                                    htmlFor={campus}
                                    className="flex flex-col items-center justify-center p-3 border-2 border-muted bg-white rounded-xl cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary"
                                >
                                    <span className="font-semibold">{campus}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            )}

            {/* DRW Level Selection */}
            {['drw_morning', 'drw_a', 'drw_b'].includes(selectedCourseKey) && (
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">레벨 선택</Label>
                    <Select
                        value={inputs.drwLevel || ''}
                        onValueChange={(val) => onChange('drwLevel', val)}
                    >
                        <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="레벨을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Lv.1">Lv.1</SelectItem>
                            <SelectItem value="Lv.2">Lv.2</SelectItem>
                            <SelectItem value="Lv.3">Lv.3</SelectItem>
                            <SelectItem value="Lv.4">Lv.4</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Math Exclusion & Online Type Row */}
            <div className="grid grid-cols-1 gap-6">
                {/* Math Exclusion */}
                {shouldShowMathExclude && (
                    <div className="flex items-center space-x-2 p-4 border border-yellow-200 bg-yellow-50 rounded-xl">
                        <Checkbox
                            id="excludeMath"
                            checked={inputs.excludeMath}
                            onCheckedChange={(checked: CheckedState) => onChange('excludeMath', checked === true)}
                            className="border-yellow-600 text-yellow-600 data-[state=checked]:bg-yellow-600 data-[state=checked]:text-white"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor="excludeMath"
                                className="text-sm font-semibold text-yellow-900 cursor-pointer"
                            >
                                수학 수업 제외
                            </Label>
                            <p className="text-sm text-yellow-700">
                                수강료가 차감됩니다
                            </p>
                        </div>
                    </div>
                )}

                {/* Online/Offline Toggle */}
                {(timeMeta.isOnOff || ['sat_1500', 'sat_1400', 'sat_bridge', 'toefl_l1', 'toefl_l2', 'dm_alg2'].includes(selectedCourseKey)) && (
                    <div className="space-y-3">
                        <Label className="flex items-center text-sm font-semibold text-muted-foreground">
                            <Monitor className="w-4 h-4 mr-2 text-primary" />
                            수업 형태
                        </Label>
                        <RadioGroup
                            value={inputs.courseType}
                            onValueChange={(val) => onChange('courseType', val)}
                            className="grid grid-cols-2 gap-3"
                        >
                            {['온라인', '오프라인'].map(type => (
                                <div key={type}>
                                    <RadioGroupItem value={type} id={`type-${type}`} className="peer sr-only" />
                                    <Label
                                        htmlFor={`type-${type}`}
                                        className="flex items-center justify-center p-3 border-2 border-muted bg-white rounded-xl cursor-pointer transition-all hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary font-medium"
                                    >
                                        {type}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                )}
            </div>

            {/* Skip Weeks */}
            <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="skipWeeksEnabled"
                            checked={skipWeeksEnabled}
                            onCheckedChange={handleSkipWeeksEnabledChange}
                        />
                        <Label htmlFor="skipWeeksEnabled" className="font-semibold text-base cursor-pointer">
                            휴강 주차
                        </Label>
                    </div>
                    {skipWeeksEnabled ? (
                        <span className="text-xs text-muted-foreground">1주차 휴강 불가</span>
                    ) : null}
                </div>

                {skipWeeksEnabled && (
                    <div className="bg-secondary/20 rounded-2xl p-5 border border-border animate-in slide-in-from-top-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
                            <span>수강 {periodValue}주</span>
                            <span>+ 휴강 {normalizedSkipWeeks.length}주</span>
                            <span>= 총 {scheduleWeeks}주 일정</span>
                        </div>
                        <TooltipProvider delayDuration={180}>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {weekChips.map((week) => {
                                    const isSkipped = normalizedSkipWeeks.includes(week);
                                    const isDisabled = week === 1;
                                    const rangeLabel = getWeekRangeLabel(week);
                                    return (
                                        <Tooltip key={week}>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isDisabled}
                                                        aria-pressed={isSkipped}
                                                        onClick={() => handleSkipWeekToggle(week)}
                                                        className={cn(
                                                            "h-8 rounded-full px-3 text-xs font-semibold transition",
                                                            isSkipped
                                                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                                : "bg-background",
                                                            isDisabled ? "opacity-40" : "hover:bg-accent"
                                                        )}
                                                        data-state={isSkipped ? "on" : "off"}
                                                    >
                                                        {week}주차
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            {rangeLabel ? (
                                                <TooltipContent>{rangeLabel}</TooltipContent>
                                            ) : null}
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </TooltipProvider>
                        <p className="mt-2 text-xs text-muted-foreground">
                            마지막 주차를 휴강으로 선택하면 다음 주차가 자동으로 추가됩니다.
                        </p>
                    </div>
                )}
            </div>

            {/* Recording Toggle */}
            {isRecordingAvailableForSelection && (
                <div className="pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="recordingEnabled"
                                checked={inputs.recordingEnabled}
                                onCheckedChange={(checked: CheckedState) => onChange('recordingEnabled', checked === true)}
                            />
                            <Label htmlFor="recordingEnabled" className="font-semibold text-base cursor-pointer">
                                녹화강의 신청
                            </Label>
                        </div>
                    </div>

                    {inputs.recordingEnabled && (
                        <div className="bg-secondary/20 rounded-2xl p-5 border border-border animate-in slide-in-from-top-2">
                            <div className="text-sm text-muted-foreground mb-3 flex justify-between items-center">
                                <span>녹화로 수강할 날짜를 선택하세요:</span>
                                <span className="font-semibold text-primary">
                                    {recordingDates.length || 0}일 선택됨
                                </span>
                            </div>

                            {!inputs.startDate ? (
                                <div className="text-destructive text-sm font-medium bg-destructive/10 p-3 rounded-lg text-center">
                                    ⚠️ 시작일을 먼저 선택해주세요.
                                </div>
                            ) : (
                                <div className="overflow-x-auto no-scrollbar">
                                    <div className="min-w-[600px] space-y-2">
                                        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-2 text-xs text-muted-foreground">
                                            <div className="text-center font-semibold text-muted-foreground/70">주차</div>
                                            {weekdayLabels.map((label, index) => (
                                                <div key={`${label}-${index}`} className="text-center font-semibold">
                                                    {label}
                                                </div>
                                            ))}
                                        </div>
                                        {calendarWeeks.map((week) => (
                                            <div
                                                key={`week-${week.weekIndex}`}
                                                className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-2"
                                            >
                                                <div className="flex items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground">
                                                    {week.weekIndex}주차
                                                </div>
                                                {week.cells.map((cell) =>
                                                    cell.selectable ? (
                                                        <button
                                                            key={cell.dateKey}
                                                            type="button"
                                                            onClick={() => handleDateClick(cell.dateKey)}
                                                            className={cn(
                                                                "px-2 py-2 text-[11px] leading-tight rounded-lg transition-all font-medium border",
                                                                recordingDates.includes(cell.dateKey)
                                                                    ? "bg-primary border-primary text-primary-foreground shadow-md transform scale-105"
                                                                    : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                                                            )}
                                                        >
                                                            {getDayLabel(cell.dateKey)}
                                                        </button>
                                                    ) : (
                                                        <div
                                                            key={`empty-${cell.dateKey}`}
                                                            className="h-8 rounded-lg border border-dashed border-border/50 bg-muted/30"
                                                            aria-hidden="true"
                                                        />
                                                    )
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SingleCourseOptions;
