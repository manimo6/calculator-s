import { courseInfo, weekdayName } from './data.js';
import { getEndDate, getScheduleWeeks, normalizeBreakRanges, normalizeSkipWeeks } from './calculatorLogic.js';

const TUITION_ACCOUNT = `⚠️주의사항⚠️
✅ 계좌이체 시 **반드시 학생이름으로 입금** 부탁드립니다.
🚫 부모님 성함으로 입금 시, 시스템상 입금 확인이 불가능하여 등록이 지연될 수 있습니다.
✅ 납부 후, 현금영수증 발급받으실 휴대폰/사업자 번호를 알려주시기 바랍니다.
[수강료 입금 계좌]
신한은행 140-009-205058
(예금주: 세한아카데미외국어학원)`;

const TEXTBOOK_ACCOUNT = `[교재비 입금 계좌]
신한은행 110-378-431090
(예금주: 세한어학연구소)`;

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

function pad2(value) {
    return String(value).padStart(2, '0');
}

function parseDateOnly(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
}

function formatDateWithWeekday(value) {
    const date = parseDateOnly(value);
    if (!date) return '';
    return `${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}(${weekdayName[date.getDay()]})`;
}

function formatRecordingDates(dates) {
    if (!dates || dates.length === 0) return '';
    return dates
        .map((d) => {
            const date = new Date(d);
            if (isNaN(date.getTime())) return d;
            return formatDateWithWeekday(date);
        })
        .join(', ');
}

function normalizeCourseDays(days) {
    if (!Array.isArray(days)) return [];
    return Array.from(
        new Set(
            days.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        )
    ).sort((a, b) => a - b);
}

function resolveEndDay(info) {
    const endDays = Array.isArray(info?.endDays) ? info.endDays : [];
    if (endDays.length && Number.isInteger(endDays[0])) return endDays[0];
    if (Number.isInteger(info?.endDay)) return info.endDay;
    return 5;
}

function getWeekIndex(start, date) {
    const startDate = parseDateOnly(start);
    const target = parseDateOnly(date);
    if (!startDate || !target) return null;
    const diffDays = Math.floor((target.getTime() - startDate.getTime()) / DAY_MS);
    return Math.floor(diffDays / 7) + 1;
}

function buildSkipWeekBlocks(skipWeeks) {
    if (!Array.isArray(skipWeeks) || skipWeeks.length === 0) return [];
    const sorted = [...skipWeeks].sort((a, b) => a - b);
    const blocks = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i += 1) {
        const cur = sorted[i];
        if (cur === prev + 1) {
            prev = cur;
            continue;
        }
        blocks.push({ startWeek: start, endWeek: prev });
        start = cur;
        prev = cur;
    }
    blocks.push({ startWeek: start, endWeek: prev });
    return blocks;
}

function buildSkipPeriodLines(startDate, skipWeeks) {
    if (!startDate || !Array.isArray(skipWeeks) || skipWeeks.length === 0) return [];
    const base = startDate instanceof Date ? startDate : new Date(startDate);
    if (isNaN(base.getTime())) return [];

    return buildSkipWeekBlocks(skipWeeks).map((block) => {
        const blockStart = addDays(base, (block.startWeek - 1) * 7);
        const blockEnd = addDays(base, block.endWeek * 7 - 1);
        const weeks = block.endWeek - block.startWeek + 1;
        return `※ 미등록기간: ${formatDateWithWeekday(blockStart)}~${formatDateWithWeekday(blockEnd)} ${weeks}주`;
    });
}

function buildTermBreakLines({ startDate, endDate, courseDays, breakRanges }) {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    if (!start || !end || start > end) return [];

    const normalizedRanges = normalizeBreakRanges(breakRanges);
    if (!normalizedRanges.length) return [];

    const days = normalizeCourseDays(courseDays);
    const daySet = new Set(days.length ? days : ALL_WEEK_DAYS);
    const lines = [];

    for (const range of normalizedRanges) {
        const rangeStart = range.start > start ? range.start : start;
        const rangeEnd = range.end < end ? range.end : end;
        if (rangeStart > rangeEnd) continue;

        const weekSet = new Set();
        let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
        while (cursor <= rangeEnd) {
            if (daySet.has(cursor.getDay())) {
                const weekIndex = getWeekIndex(start, cursor);
                if (weekIndex) weekSet.add(weekIndex);
            }
            cursor = addDays(cursor, 1);
        }

        if (weekSet.size > 0) {
            lines.push(
                `※ 텀브레이크: ${formatDateWithWeekday(rangeStart)}~${formatDateWithWeekday(rangeEnd)} ${weekSet.size}주`
            );
        }
    }

    return lines;
}

function stripDuplicateSuffix(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '';
    const match = trimmed.match(/^(.+?)([A-Za-z]+)$/);
    if (!match) return trimmed;
    const base = match[1].trim();
    if (!base || !/[가-힣]/.test(base)) return trimmed;
    return base;
}

const TEXTBOOK_OPTIONS = new Set(['none', 'tbd', 'amount']);

function resolveTextbookForItem(item, fallback) {
    const rawOption = item?.textbookOption ?? fallback.option;
    const option = TEXTBOOK_OPTIONS.has(rawOption) ? rawOption : 'none';
    const rawAmount = item?.textbookAmount ?? fallback.amount;
    let amount = Number(rawAmount || 0);
    if (!Number.isFinite(amount) || option !== 'amount') {
        amount = 0;
    }
    const rawNote =
        item?.customNote !== undefined && item?.customNote !== null
            ? item.customNote
            : fallback.note;
    const note = typeof rawNote === 'string' ? rawNote.trim() : '';
    return { option, amount, note };
}

/**
 * Generates the formatted reservation info text.
 * @param {Object} params
 * @param {string} params.studentName
 * @param {Array} params.cart - Array of cart items
 * @param {string} params.textbookOption - 'none' | 'tbd' | 'amount'
 * @param {number} params.textbookAmount
 * @param {string} params.customNote
 * @returns {string} Formatted text
 */
export function generateClipboardText({
    studentName,
    cart = [],
    textbookOption = 'none',
    textbookAmount = 0,
    customNote = ''
}) {
    if (!studentName) {
        throw new Error('학생 이름이 없습니다.');
    }

    if (!cart || cart.length === 0) {
        throw new Error('선택된 과목이 없습니다.');
    }

    const displayStudentName = stripDuplicateSuffix(studentName);

    let infoText = `감사합니다. 수강 예약 안내드립니다.

학생이름: ${displayStudentName}
`;

    const hasMultipleCourses = cart.length > 1;
    const textbookFallback = {
        option: textbookOption,
        amount: textbookAmount,
        note: customNote
    };
    let hasTextbookAccount = false;

    // Process Cart Items
    cart.forEach((item, idx) => {
        if (hasMultipleCourses) {
            infoText += `\n[과목 ${idx + 1}]\n`;
        }
        const period = Number(item?.singleCourseInputs?.period) || 0;
        const rawSkipWeeks = item?.singleCourseInputs?.skipWeeks || [];
        const skipWeeks = normalizeSkipWeeks(rawSkipWeeks, period);
        const courseKey = item?.mainCourseKey;
        const courseMeta = courseKey ? courseInfo?.[courseKey] : null;
        const courseDays = normalizeCourseDays(courseMeta?.days);
        const endDay = resolveEndDay(courseMeta);
        const breakRanges = courseMeta?.breakRanges || [];
        const rawStart = item?.details?.rawStartDate || item?.singleCourseInputs?.startDate;
        const scheduleMeta = getScheduleWeeks({
            startDate: rawStart,
            durationWeeks: period,
            skipWeeks,
            courseDays,
            endDayOfWeek: endDay,
            breakRanges
        });
        const scheduleWeeks = scheduleMeta.scheduleWeeks || period + skipWeeks.length;
        const rawEnd =
            item?.details?.rawEndDate ||
            (rawStart && scheduleWeeks > 0
                ? getEndDate(rawStart, scheduleWeeks, endDay)
                : null);
        const startLabel = rawStart ? formatDateWithWeekday(rawStart) : '';
        const endLabel = rawEnd ? formatDateWithWeekday(rawEnd) : '';
        const durationLine =
            startLabel && endLabel && scheduleWeeks > 0
                ? `${startLabel}~${endLabel} ${scheduleWeeks}주`
                : item.details.durationStr;
        const skipLines = buildSkipPeriodLines(rawStart, skipWeeks);
        const breakLines = buildTermBreakLines({
            startDate: rawStart,
            endDate: rawEnd,
            courseDays,
            breakRanges
        });

        const recDates = formatRecordingDates(item.selectedRecordingDates);
        const baseCourseName = String(item?.displayCourseName || '').trim();
        const noticeCourseName =
            baseCourseName &&
            item?.singleCourseInputs?.excludeMath &&
            !baseCourseName.includes('수학제외')
                ? `${baseCourseName} (수학제외)`
                : baseCourseName;
        const detailLines = [
            `• 수강과목: ${noticeCourseName || '-'}`,
            `• 수강기간: ${durationLine || '-'}`
        ];
        if (breakLines.length) {
            detailLines.push(...breakLines);
        }
        if (skipLines.length) {
            detailLines.push(...skipLines);
        }
        if (recDates) {
            detailLines.push(`• 녹화수강일: ${recDates}`);
        }
        detailLines.push(`• 수업시간: ${item.details.timeStr || '-'}`);
        detailLines.push(`• 수강료: ${item.finalFee.toLocaleString()}원`);

        if (hasMultipleCourses) {
            const { option, amount, note } = resolveTextbookForItem(
                item,
                textbookFallback
            );
            if (option === 'tbd') {
                detailLines.push('교재비는 추후 안내 예정입니다.');
            } else if (option === 'amount' && amount > 0) {
                detailLines.push(`교재비: ${amount.toLocaleString()}원`);
                hasTextbookAccount = true;
            }
            if (note) {
                detailLines.push('', note);
            }
        }

        infoText += `${detailLines.join('\n')}`;
        infoText += `\n`;
    });

    if (hasMultipleCourses) {
        const totalFee = cart.reduce((sum, item) => sum + item.finalFee, 0);
        infoText += `\n총 수강료: ${totalFee.toLocaleString()}원\n`;
    } else {
        const { option, amount, note } = resolveTextbookForItem(
            cart[0],
            textbookFallback
        );
        if (option === 'tbd') {
            infoText += `교재비는 추후 안내 예정입니다.\n`;
        } else if (option === 'amount' && amount > 0) {
            infoText += `교재비: ${amount.toLocaleString()}원\n`;
            hasTextbookAccount = true;
        }
        if (note) {
            infoText += `\n${note}\n`;
        }
    }

    // Account Info
    infoText += `\n${TUITION_ACCOUNT}\n`;

    // Append Textbook Account ONLY if textbook fee exists
    if (hasTextbookAccount) {
        infoText += `\n${TEXTBOOK_ACCOUNT}\n`;
    }

    return infoText;
}
