import { courseInfo, timeTable, recordingAvailable, getCourseName, weekdayName } from './data';
import type { BreakRangeInput, TimeTableDynamicOption } from './data';

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

type DateInput = string | number | Date | null | undefined;

type NormalizedBreakRange = {
    start: Date;
    end: Date;
    startDate: string;
    endDate: string;
};

type ScheduleWeeksOptions = {
    startDate?: DateInput;
    endDate?: DateInput;
    durationWeeks?: number | string;
    skipWeeks?: Array<number | string>;
    courseDays?: Array<number | string>;
    endDayOfWeek?: number | null;
    breakRanges?: BreakRangeInput[];
};

type ScheduleWeeksResult = {
    scheduleWeeks: number;
    skipWeeks: number[];
    breakWeekSet: Set<number>;
};

type CourseDetailsOptions = {
    courseKey: string;
    duration: number;
    customStartDate?: DateInput;
    excludeMath?: boolean;
    satCampus?: string | null;
    dynamicTime?: string | null;
    courseType?: string | null;
    scheduleWeeks?: number | null;
};

type CourseDetailsResult = {
    durationStr: string;
    timeStr: string;
    totalFee: number;
    rawStartDate: Date | null;
    rawEndDate: Date | null;
};

type SingleCourseInputs = {
    period: number;
    startDate?: string;
    courseType?: string;
    drwLevel?: string;
    selectedSatCampus?: string;
    selectedDynamicTime?: string;
    skipWeeks?: Array<number | string>;
    recordingDates?: string[];
    excludeMath?: boolean;
};

type CalculateTotalFeeInputs = {
    mainCourseKey: string;
    discount: number;
    singleCourseInputs: SingleCourseInputs;
};

type CalculateTotalFeeResult = {
    totalFee: number;
    details?: CourseDetailsResult;
    error?: string;
};

type CartItem = {
    mainCourseKey: string;
    singleCourseInputs: SingleCourseInputs;
};

type CartInputs = CalculateTotalFeeInputs & { studentName: string };

function parseDateOnly(value: DateInput) {
    if (!value) return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateOnly(date: Date | null | undefined) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeCourseDays(days: Array<number | string> | null | undefined) {
    if (!Array.isArray(days)) return [];
    return Array.from(
        new Set(days.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
    ).sort((a, b) => a - b);
}

export function normalizeBreakRanges(ranges: BreakRangeInput[] | null | undefined) {
    if (!Array.isArray(ranges)) return [];
    return ranges
        .map((range) => {
            const startRaw = range?.startDate ?? range?.start ?? '';
            const endRaw = range?.endDate ?? range?.end ?? '';
            const start = parseDateOnly(startRaw);
            const end = parseDateOnly(endRaw);
            if (!start || !end) return null;
            const [s, e] = start <= end ? [start, end] : [end, start];
            return { start: s, end: e, startDate: formatDateOnly(s), endDate: formatDateOnly(e) };
        })
        .filter((range): range is NormalizedBreakRange => Boolean(range))
        .sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());
}

export function getBreakDateSet(options: ScheduleWeeksOptions = {}) {
    const { startDate, endDate, courseDays, breakRanges } = options;
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    if (!start || !end || start > end) return new Set<string>();

    const normalizedBreaks = normalizeBreakRanges(breakRanges);
    if (!normalizedBreaks.length) return new Set<string>();

    const days = normalizeCourseDays(courseDays);
    const daySet = new Set(days.length ? days : ALL_WEEK_DAYS);
    const result = new Set<string>();

    for (const range of normalizedBreaks) {
        const rangeStart = range.start > start ? range.start : start;
        const rangeEnd = range.end < end ? range.end : end;
        if (rangeStart > rangeEnd) continue;

        let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
        while (cursor <= rangeEnd) {
            if (daySet.has(cursor.getDay())) {
                result.add(formatDateOnly(cursor));
            }
            cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
        }
    }

    return result;
}

export function getBreakWeekSet(options: ScheduleWeeksOptions = {}) {
    const { startDate, endDate, courseDays, breakRanges } = options;
    const start = parseDateOnly(startDate);
    if (!start) return new Set<number>();

    const breakDates = getBreakDateSet({ startDate, endDate, courseDays, breakRanges });
    const weeks = new Set<number>();

    for (const dateKey of breakDates) {
        const date = parseDateOnly(dateKey);
        if (!date) continue;
        const diffDays = Math.floor((date.getTime() - start.getTime()) / DAY_MS);
        const weekIndex = Math.floor(diffDays / 7) + 1;
        if (weekIndex >= 1) weeks.add(weekIndex);
    }

    return weeks;
}

function computeEndDateByWeeks(startDate: DateInput, durationWeeks: number | string, endDayOfWeek?: number | null) {
    const start = parseDateOnly(startDate);
    if (!start) return null;
    const weeks = Number(durationWeeks);
    if (!Number.isFinite(weeks) || weeks <= 0) return null;

    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    end.setDate(end.getDate() + (weeks - 1) * 7);

    const currentDay = end.getDay();
    const targetDay = Number.isInteger(endDayOfWeek) ? Number(endDayOfWeek) : 5;

    if (currentDay <= targetDay) {
        end.setDate(end.getDate() + (targetDay - currentDay));
    } else {
        end.setDate(end.getDate() + (7 - currentDay + targetDay));
    }

    return end;
}

export function getScheduleWeeks(options: ScheduleWeeksOptions = {}): ScheduleWeeksResult {
    const {
        startDate,
        durationWeeks,
        skipWeeks = [],
        courseDays = [],
        endDayOfWeek,
        breakRanges = []
    } = options;
    const baseWeeks = Number(durationWeeks);
    if (!Number.isFinite(baseWeeks) || baseWeeks <= 0) {
        return { scheduleWeeks: 0, skipWeeks: [], breakWeekSet: new Set<number>() };
    }

    const normalizedSkipWeeks = normalizeSkipWeeks(skipWeeks, baseWeeks);
    const skipWeekSet = new Set(normalizedSkipWeeks);
    let scheduleWeeks = baseWeeks + skipWeekSet.size;

    const start = parseDateOnly(startDate);
    const normalizedBreaks = normalizeBreakRanges(breakRanges);
    if (!start || !normalizedBreaks.length) {
        return { scheduleWeeks, skipWeeks: normalizedSkipWeeks, breakWeekSet: new Set<number>() };
    }

    const normalizedDays = normalizeCourseDays(courseDays);
    const days = normalizedDays.length ? normalizedDays : ALL_WEEK_DAYS;
    const endDay = Number.isInteger(endDayOfWeek) ? endDayOfWeek : 5;

    let breakWeekSet = new Set<number>();
    let prevBreakCount = -1;
    for (let i = 0; i < 12; i += 1) {
        const endDate = computeEndDateByWeeks(start, scheduleWeeks, endDay);
        if (!endDate) break;

        const nextBreakWeekSet = getBreakWeekSet({
            startDate: start,
            endDate,
            courseDays: days,
            breakRanges: normalizedBreaks
        });
        const nextBreakCount = Array.from(nextBreakWeekSet).filter((week) => !skipWeekSet.has(week)).length;

        if (nextBreakCount === prevBreakCount) {
            breakWeekSet = nextBreakWeekSet;
            break;
        }

        prevBreakCount = nextBreakCount;
        scheduleWeeks = baseWeeks + skipWeekSet.size + nextBreakCount;
        breakWeekSet = nextBreakWeekSet;
    }

    return { scheduleWeeks, skipWeeks: normalizedSkipWeeks, breakWeekSet };
}

// Helper: Calculate end date based on duration and allowed days
export function getEndDate(startDate: DateInput, durationWeeks: number | string, endDayOfWeek?: number | null) {
    return computeEndDateByWeeks(startDate, durationWeeks, endDayOfWeek);
}

export function normalizeSkipWeeks(skipWeeks: Array<number | string> | null | undefined, period: number | string) {
    const paidWeeks = Number(period) || 0;
    if (!Number.isFinite(paidWeeks) || paidWeeks <= 0) return [];

    const raw = Array.isArray(skipWeeks) ? skipWeeks : [];
    let cleaned = raw
        .map((w) => Number(w))
        .filter((w) => Number.isInteger(w) && w > 1);

    cleaned = Array.from(new Set(cleaned));

    let prevLen;
    do {
        prevLen = cleaned.length;
        const maxWeek = paidWeeks + cleaned.length;
        cleaned = cleaned.filter((w) => w <= maxWeek);
    } while (cleaned.length !== prevLen);

    return cleaned.sort((a, b) => a - b);
}

// Helper: Calculate total days considering week boundary crossing (e.g., Sat->Sun)
export function calculateTotalDays(courseDays: number[], endDay: number | undefined, period: number): number {
    if (!courseDays.length || period <= 0) return 0;

    if (endDay !== undefined) {
        // Use index-based calculation to handle week boundary crossing (e.g., days=[6,0], endDay=0)
        const endDayIndex = courseDays.indexOf(endDay);
        const daysInLastWeek = endDayIndex >= 0 ? endDayIndex + 1 : courseDays.length;
        return (period > 1) ? (period - 1) * courseDays.length + daysInLastWeek : daysInLastWeek;
    }

    return period * courseDays.length;
}

// Helper: Get available recording dates based on start, duration, and allowed days
export function getAvailableRecordingDates(
    startDateStr: string,
    durationWeeks: number,
    allowedDays: number[],
    skipWeeks: Array<number | string> = [],
    breakRanges: BreakRangeInput[] = []
) {
    if (!startDateStr || !durationWeeks) return [];

    const startDate = new Date(startDateStr);
    let selectableDates = [];
    let currentDate = new Date(startDate);
    let endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (durationWeeks * 7) - 1);
    const skipSet = new Set(
        (Array.isArray(skipWeeks) ? skipWeeks : [])
            .map((w) => Number(w))
            .filter((w) => Number.isInteger(w) && w > 1 && w <= durationWeeks)
    );
    const breakDateSet = getBreakDateSet({
        startDate,
        endDate,
        courseDays: allowedDays,
        breakRanges
    });

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const weekIndex = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        const dateStr = currentDate.toISOString().split('T')[0];
        if (allowedDays.includes(dayOfWeek) && !skipSet.has(weekIndex) && !breakDateSet.has(dateStr)) {
            selectableDates.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return selectableDates;
}

// Core Logic: Get detailed course info (fee, duration string, etc.)
export function getCourseDetails({
    courseKey,
    duration,
    customStartDate,
    excludeMath = false,
    // Dynamic contexts
    satCampus = null,
    dynamicTime = null,
    courseType = null, // '온라인' | '오프라인'
    scheduleWeeks = null
}: CourseDetailsOptions): CourseDetailsResult | null {
    const c = courseInfo[courseKey];
    if (!c) return null;

    let timeStr = "";
    let durationStr = "";
    let weeklyFee = Number(c.fee ?? 0);

    // Dynamic Options
    if (c.dynamicOptions) {
        if (satCampus) {
            const dynamicCourseKey = c.dynamicOptions[satCampus];
            const dynamicCourse = dynamicCourseKey ? courseInfo[dynamicCourseKey] : undefined;
            if (dynamicCourse) {
                weeklyFee = Number(dynamicCourse.fee ?? weeklyFee);

                const dynamicName = dynamicCourse.name;
                const tData =
                    (dynamicCourseKey ? timeTable[dynamicCourseKey] : undefined) ||
                    (dynamicName ? timeTable[dynamicName] : undefined);

                if (tData) {
                    if (typeof tData === 'object') {
                        const record = tData as Record<string, unknown>;
                        if (record.type === 'onoff') {
                            const online = record.online;
                            if (typeof online === 'string') {
                                timeStr = online + " (한국시간)";
                            }
                        } else {
                            const onlineText = record['온라인'];
                            if (typeof onlineText === 'string') {
                                timeStr = onlineText + " (한국시간)";
                            }
                        }
                    } else {
                        timeStr = tData + " (한국시간)";
                    }
                }
            }
        }
    }

    if (excludeMath) {
        if (c.mathExcludedFee) {
            weeklyFee = c.mathExcludedFee;
        } else if (['sat_1500', 'sat_1400', 'sat_bridge'].includes(courseKey)) {
            weeklyFee -= 120000;
        }
    }

    let totalFee = weeklyFee * duration;

    let rawStartDate: Date | null = null;
    let rawEndDate: Date | null = null;

    const normalizedScheduleWeeks =
        typeof scheduleWeeks === 'number' && Number.isFinite(scheduleWeeks) && scheduleWeeks > 0
            ? scheduleWeeks
            : duration;
    const durationLabel = normalizedScheduleWeeks > duration
        ? `${duration}주 수강 / 총 ${normalizedScheduleWeeks}주 일정`
        : `${duration}주`;

    if (customStartDate) {
        let start = new Date(customStartDate);
        let end = getEndDate(customStartDate, normalizedScheduleWeeks, c.endDays ? c.endDays[0] : (c.endDay !== undefined ? c.endDay : 5));
        if (!(end instanceof Date)) end = null;

        let sm = start.getMonth() + 1, sd = start.getDate(), sw = weekdayName[start.getDay()];
        let em = end ? end.getMonth() + 1 : 0, ed = end ? end.getDate() : 0, ew = end ? weekdayName[end.getDay()] : '';
        durationStr = `${sm}.${sd}(${sw}) ~ ${em}.${ed}(${ew}) (${durationLabel})`;
        rawStartDate = start;
        rawEndDate = end;
    } else {
        durationStr = `기간 미정 (${durationLabel})`;
    }

    // Time String Logic
    const baseName = c.name;
    const tData = timeTable[courseKey] || (baseName ? timeTable[baseName] : undefined);

    if (tData) {
        if (typeof tData === 'object') {
            const record = tData as Record<string, unknown>;
            if (record.type === 'dynamic') {
                const options = record.options as TimeTableDynamicOption[] | undefined;
                if (dynamicTime && Array.isArray(options)) {
                    const option = options.find((o) => o.label === dynamicTime);
                    if (option?.time) {
                        timeStr = option.time + " (한국시간)";
                    }
                }
            } else if (record.type === 'onoff') {
                if (courseType === '온라인') {
                    const online = record.online;
                    if (typeof online === 'string') {
                        timeStr = online + " (한국시간)";
                    }
                } else if (courseType === '오프라인') {
                    const offline = record.offline;
                    if (typeof offline === 'string') {
                        timeStr = offline + " (한국시간)";
                    }
                }
            } else {
                if (c.dynamicTime && dynamicTime) {
                    const dynamicValue = record[dynamicTime];
                    if (typeof dynamicValue === 'string') {
                        timeStr = dynamicValue + " (한국시간)";
                    }
                } else if (courseType) {
                    const typeValue = record[courseType];
                    if (typeof typeValue === 'string') {
                        timeStr = typeValue + " (한국시간)";
                    }
                }
            }
        } else if (typeof tData === 'string') {
            timeStr = tData + " (한국시간)";
        }
    }

    return { durationStr, timeStr, totalFee, rawStartDate, rawEndDate };
}

// Logic: Calculate Recording Fee
export function calculateRecordingFee(baseFee: number, totalDays: number, recordingDays: number, discount: number) {
    const normalDays = totalDays - recordingDays;
    const dailyFee = baseFee / totalDays;

    const recordingCost = dailyFee * recordingDays * 0.4;
    const normalCost = dailyFee * normalDays * (1 - discount);

    return {
        recording: Math.round(recordingCost),
        normal: Math.round(normalCost),
        total: Math.round(recordingCost + normalCost)
    };
}

// Logic: Calculate Full Fee (Wrapper)
export function calculateTotalFee(inputs: CalculateTotalFeeInputs): CalculateTotalFeeResult {
    const { mainCourseKey, discount, singleCourseInputs } = inputs;
    const c = courseInfo[mainCourseKey];

    if (!mainCourseKey || !c) return { totalFee: 0 };

    const { period, recordingDates = [], skipWeeks: rawSkipWeeks = [] } = singleCourseInputs;
    if (!period) return { totalFee: 0 };

    const recordingDays = recordingDates.length;
    const endDay = c.endDays ? c.endDays[0] : (c.endDay !== undefined ? c.endDay : 5);
    const courseDays = c.days || [1, 2, 3, 4, 5];
    const scheduleMeta = getScheduleWeeks({
        startDate: singleCourseInputs.startDate,
        durationWeeks: period,
        skipWeeks: rawSkipWeeks,
        courseDays,
        endDayOfWeek: endDay,
        breakRanges: c.breakRanges
    });
    const skipWeeks = scheduleMeta.skipWeeks || normalizeSkipWeeks(rawSkipWeeks, period);
    const scheduleWeeks = scheduleMeta.scheduleWeeks || period + skipWeeks.length;
    const totalDays = calculateTotalDays(courseDays, endDay, period);

    if (recordingDays > 0 && recordingDays >= totalDays) {
        return { totalFee: 0, error: "All days cannot be recording" };
    }

    const details = getCourseDetails({
        courseKey: mainCourseKey,
        duration: period,
        customStartDate: singleCourseInputs.startDate,
        excludeMath: singleCourseInputs.excludeMath,
        satCampus: singleCourseInputs.selectedSatCampus,
        dynamicTime: singleCourseInputs.selectedDynamicTime,
        courseType: singleCourseInputs.courseType,
        scheduleWeeks
    });

    if (!details) return { totalFee: 0 };

    let resultFee = 0;
    if (recordingDays > 0) {
        resultFee = calculateRecordingFee(details.totalFee, totalDays, recordingDays, discount).total;
    } else {
        resultFee = Math.round(details.totalFee * (1 - discount));
    }

    return { totalFee: resultFee, details };
}

// React-friendly Helper: Create Cart Item Object
export function createCartItem(inputs: CartInputs, currentCart: CartItem[] = []) {
    const { studentName, mainCourseKey, discount, singleCourseInputs } = inputs;
    const normalizedStudentName = (studentName || "").trim();
    const c = courseInfo[mainCourseKey];

    if (!normalizedStudentName) throw new Error('학생 이름을 입력해주세요.');
    if (!mainCourseKey || !c) throw new Error('과목을 선택하세요.');

    // Validation
    const { startDate, period, courseType, drwLevel, selectedSatCampus, selectedDynamicTime, skipWeeks: rawSkipWeeks = [] } = singleCourseInputs;
    const validationErrors: string[] = [];

    if (!startDate) validationErrors.push('수강 시작일을 입력하세요.');

    const allowedStartDays = Array.isArray(c.startDays)
        ? c.startDays
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [];

    if (startDate && allowedStartDays.length > 0) {
        const startDateObj = new Date(`${startDate}T00:00:00`);
        if (Number.isNaN(startDateObj.getTime())) {
            validationErrors.push('수강 시작일 형식이 올바르지 않습니다.');
        } else if (!allowedStartDays.includes(startDateObj.getDay())) {
            validationErrors.push('수업 시작일은 시작 가능 요일로만 선택할 수 있습니다.');
        }
    }

    const baseName = c.name;
    const tData = timeTable[mainCourseKey] || (baseName ? timeTable[baseName] : undefined);
    const tRecord = tData && typeof tData === 'object' ? (tData as Record<string, unknown>) : null;
    if (tRecord) {
        const isOnOff =
            tRecord.type === 'onoff' ||
            Object.prototype.hasOwnProperty.call(tRecord, '온라인') ||
            Object.prototype.hasOwnProperty.call(tRecord, '오프라인') ||
            Object.prototype.hasOwnProperty.call(tRecord, 'online') ||
            Object.prototype.hasOwnProperty.call(tRecord, 'offline');

        const isDynamic =
            tRecord.type === 'dynamic' || (!tRecord.type && !isOnOff && Object.keys(tRecord).length > 0);

        if (isOnOff && !courseType) {
            validationErrors.push('수업 형태를 선택하세요.');
        } else if (isDynamic && !selectedDynamicTime) {
            validationErrors.push('시간 옵션을 선택하세요.');
        }
    }

    if (['sat_1500', 'sat_1400', 'sat_bridge', 'toefl_l1', 'toefl_l2', 'dm_alg2'].includes(mainCourseKey) && !courseType) {
        if (!validationErrors.includes('수업 형태를 선택하세요.')) validationErrors.push('수업 형태를 선택하세요.');
    }

    if (['drw_morning', 'drw_a', 'drw_b'].includes(mainCourseKey) && !drwLevel)
        validationErrors.push('레벨을 선택하세요.');

    const recordingDates = singleCourseInputs.recordingDates || [];
    const recordingDays = recordingDates.length;
    const endDay = c.endDays ? c.endDays[0] : (c.endDay !== undefined ? c.endDay : 5);
    const courseDays = c.days || [1, 2, 3, 4, 5];
    const scheduleMeta = getScheduleWeeks({
        startDate,
        durationWeeks: period,
        skipWeeks: rawSkipWeeks,
        courseDays,
        endDayOfWeek: endDay,
        breakRanges: c.breakRanges
    });
    const normalizedSkipWeeks = scheduleMeta.skipWeeks || normalizeSkipWeeks(rawSkipWeeks, period);

    if (recordingDays > 0) {
        const config =
            recordingAvailable[mainCourseKey] ??
            (baseName ? recordingAvailable[baseName] : undefined) ??
            recordingAvailable[getCourseName(mainCourseKey)];

        let allowed = false;
        if (typeof config === 'boolean') {
            allowed = config;
        } else if (config && typeof config === 'object') {
            const configRecord = config as Record<string, boolean | undefined>;
            const rawType = String(courseType || '').trim();
            const normalizedType = rawType.includes('온라인')
                ? '온라인'
                : rawType.includes('오프라인')
                    ? '오프라인'
                    : rawType;

            if (normalizedType && typeof configRecord[normalizedType] === 'boolean') {
                allowed = Boolean(configRecord[normalizedType]);
            } else if (normalizedType === '온라인') {
                allowed = !!(configRecord['온라인'] ?? configRecord.online);
            } else if (normalizedType === '오프라인') {
                allowed = !!(configRecord['오프라인'] ?? configRecord.offline);
            }
        } else {
            allowed = !!config;
        }

        if (!allowed) {
            validationErrors.push('선택한 수업 형태에서는 녹화강의 신청이 불가능합니다.');
        }
    }

    const totalDays = calculateTotalDays(courseDays, endDay, period);

    if (recordingDays > 0 && recordingDays >= totalDays) {
        validationErrors.push('최소 1일은 실시간 수업으로 진행되어야 합니다.');
    }

    if (Array.isArray(rawSkipWeeks) && rawSkipWeeks.map(Number).includes(1)) {
        validationErrors.push('1주차는 휴강할 수 없습니다.');
    }

    if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
    }

    // Duplicate Check
    const isDuplicate = currentCart.some((item) => {
        const itemInputs = item.singleCourseInputs;
        const itemSkipWeeks = normalizeSkipWeeks(itemInputs.skipWeeks, itemInputs.period);
        return (
            item.mainCourseKey === mainCourseKey &&
            itemInputs.startDate === startDate &&
            itemInputs.courseType === courseType &&
            itemSkipWeeks.length === normalizedSkipWeeks.length &&
            itemSkipWeeks.every((w, idx) => w === normalizedSkipWeeks[idx])
        );
    });

    if (isDuplicate) {
        throw new Error("이미 목록에 추가된 과목입니다.");
    }

    // Calculation
    const scheduleWeeks = scheduleMeta.scheduleWeeks || period + normalizedSkipWeeks.length;

    const details = getCourseDetails({
        courseKey: mainCourseKey,
        duration: period,
        customStartDate: startDate,
        excludeMath: singleCourseInputs.excludeMath,
        satCampus: selectedSatCampus,
        dynamicTime: selectedDynamicTime,
        courseType: courseType,
        scheduleWeeks
    });
    if (!details) {
        throw new Error('과목 정보를 불러오지 못했습니다.');
    }

    let finalFee = 0;
    let normalFee = 0;
    let recordingFee = 0;
    const hasRecording = recordingDays > 0;

    if (hasRecording) {
        const fees = calculateRecordingFee(details.totalFee, totalDays, recordingDays, discount);
        normalFee = fees.normal;
        recordingFee = fees.recording;
        finalFee = fees.total;
    } else {
        finalFee = Math.round(details.totalFee * (1 - discount));
        normalFee = finalFee;
        recordingFee = 0;
    }

    let displayCourseName = getCourseName(mainCourseKey);

    // Name formatting
    if (tRecord && tRecord.type === 'dynamic' && selectedDynamicTime) {
        displayCourseName += ' (' + selectedDynamicTime + ')';
    } else if (c.dynamicOptions && selectedSatCampus) {
        displayCourseName += ' (' + selectedSatCampus + ')';
    } else if (c.dynamicTime && selectedDynamicTime) {
        displayCourseName += ' (' + selectedDynamicTime + ')';
    }

    if (['drw_morning', 'drw_a', 'drw_b'].includes(mainCourseKey)) {
        if (mainCourseKey === 'drw_morning') displayCourseName = `겨울특강 DRW 미주 ${drwLevel}`;
        else if (mainCourseKey === 'drw_a') displayCourseName = `겨울특강 DRW ${drwLevel}A`;
        else if (mainCourseKey === 'drw_b') displayCourseName = `겨울특강 DRW ${drwLevel}B`;
    }

    const courseTypeLabel = String(courseType || '').trim();
    if (courseTypeLabel && !displayCourseName.includes(courseTypeLabel)) {
        displayCourseName = `${displayCourseName} ${courseTypeLabel}`;
    }

    return {
        id: Date.now(),
        studentName: normalizedStudentName,
        mainCourseKey,
        discount,
        singleCourseInputs: { ...singleCourseInputs },
        selectedRecordingDates: [...recordingDates],
        displayCourseName,
        finalFee,
        normalFee,
        recordingFee,
        details,
        totalDays,
        recordingDays
    };
}
