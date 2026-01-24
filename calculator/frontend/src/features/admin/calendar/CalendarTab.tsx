import React, { useState, useEffect, useMemo } from 'react';
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react';
import { createViewMonthGrid } from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import 'temporal-polyfill/global';
import '@schedule-x/theme-default/dist/index.css';

import { apiClient } from "../../../api-client";
import CalendarNoteDialog from "./CalendarNoteDialog";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const toDateString = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
        return value.split(" ")[0].split("T")[0];
    }
    if (typeof value === "object" && typeof value.toString === "function") {
        return value.toString().split("T")[0];
    }
    return String(value).split("T")[0];
};

const toJsDate = (value) => {
    const dateStr = toDateString(value);
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length < 3) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

const toPlainDate = (value) => {
    const dateStr = toDateString(value);
    if (!dateStr) return null;
    const temporal = typeof globalThis !== "undefined" ? globalThis.Temporal : undefined;
    if (temporal && temporal.PlainDate) {
        try {
            return temporal.PlainDate.from(dateStr);
        } catch (e) {
            return dateStr;
        }
    }
    return dateStr;
};

const toDateKey = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
        const trimmed = value.trim();
        const dateStr = trimmed.split("T")[0].split(" ")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return format(parsed, "yyyy-MM-dd");
};

const CalendarTab = ({ user, isActive = true }) => {
    const [notes, setNotes] = useState<any>([]);
    const [loading, setLoading] = useState<any>(false);
    const [isDialogOpen, setIsDialogOpen] = useState<any>(false);
    const [selectedDate, setSelectedDate] = useState<any>(new Date());
    const [calendarRenderKey, setCalendarRenderKey] = useState<any>(0);
    const selectedDateNotes = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        return notes.filter((note) => toDateKey(note.date) === dateStr);
    }, [notes, selectedDate]);
    // Schedule-X Setup
    const eventsService = useState<any>(() => createEventsServicePlugin())[0];

    const calendar = useCalendarApp({
        locale: 'ko-KR',
        firstDayOfWeek: 7, // 7 = Sunday per Schedule-X error message
        views: [createViewMonthGrid()],
        defaultView: createViewMonthGrid().name,
        calendars: {
            holiday: {
                colorName: 'holiday',
                lightColors: {
                    main: 'transparent',
                    container: 'transparent',
                    onContainer: '#ff3b30', // Red text
                },
            },
        },
        plugins: [eventsService],
        callbacks: {
            onClickDate: (date) => {
                const clickedDate = toJsDate(date);
                if (clickedDate) {
                    handleDateClick(clickedDate);
                }
            },
            onClickDateTime: (dateTime) => {
                const clickedDate = toJsDate(dateTime);
                if (clickedDate) {
                    handleDateClick(clickedDate);
                }
            },
            onEventClick: (calendarEvent) => {
                // Open dialog for that date
                const clickedDate = toJsDate(calendarEvent.start);
                if (clickedDate) {
                    handleDateClick(clickedDate);
                }
            }
        }
    });

    useEffect(() => {
        const now = new Date();
        fetchNotesForMonth(now);
    }, []);

    useEffect(() => {
        if (!isActive) return;
        setCalendarRenderKey((prev) => prev + 1);
    }, [isActive]);

    const fetchNotesForMonth = async (monthDate) => {
        setLoading(true);
        let mappedEvents = [];
        let didFetch = false;

        try {
            const monthStr = format(monthDate, "yyyy-MM");
            const fetchedNotes = await apiClient.listCalendarNotes({ month: monthStr });
            const noteList = fetchedNotes?.notes || fetchedNotes || [];
            setNotes(noteList);
            didFetch = true;

            // Sync with Schedule-X with VALIDATION
            mappedEvents = (noteList || [])

                .filter(note => note && note.date) // Basic check
                .map(note => {
                    try {
                        // Ensure dateStr is explicitly YYYY-MM-DD string
                        const dateObj = new Date(note.date);
                        if (isNaN(dateObj.getTime())) return null; // Invalid date

                        const dateStr = dateObj.toISOString().split('T')[0];
                        const dateValue = toPlainDate(dateStr);
                        if (!dateValue) return null;
                        return {
                            id: String(note.id), // Ensure ID is string
                            title: note.content || "",
                            start: dateValue,
                            end: dateValue
                        };
                    } catch (err) {
                        return null;
                    }
                })
                .filter(Boolean); // Remove nulls
        } catch (error) {
            console.error("Failed to fetch calendar notes:", error);
        } finally {
            if (didFetch) {
                const currentEvents = eventsService.getAll();
                currentEvents.forEach(e => eventsService.remove(e.id));

                mappedEvents.forEach(e => {
                    try {
                        eventsService.add(e);
                    } catch (err) {
                        // console.error("Schedule-X add error", err); 
                        // Safely ignore if dup or issue, prevents crash
                    }
                });
            }

            // Add Holidays even if notes fail to load
            const holidays = getHolidayEvents();
            holidays.forEach(h => {
                try {
                    // Use a special class or color via calendarId if Schedule-X supports, 
                    // or we rely on the custom CSS we added for .sx__event matching holiday title or id logic? 
                    // Schedule-X custom styles might need calendarId config in useCalendarApp.
                    // For now, let's just add them. We might need a custom event render to style them perfectly in red text.
                    // Or we use the CSS override we added .sx__event--holiday if we can inject class.
                    eventsService.add(h);
                } catch (e) { }
            });

            setLoading(false);
        }
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setIsDialogOpen(true);
    };

    const handleNoteSaved = (savedNote) => {
        setNotes(prev => {
            const idx = prev.findIndex(n => n.id === savedNote.id);
            let next;
            const dateStr = savedNote.date.split('T')[0];
            const dateValue = toPlainDate(dateStr) || dateStr;
            const eventPayload = {
                id: String(savedNote.id),
                title: savedNote.content,
                start: dateValue,
                end: dateValue
            };

            if (idx >= 0) {
                next = [...prev];
                next[idx] = savedNote;
                try { eventsService.update(eventPayload); } catch (e) { }
            } else {
                next = [...prev, savedNote];
                try { eventsService.add(eventPayload); } catch (e) { }
            }
            return next;
        });
    };

    // Korean Holidays (2026-2027) - Comprehensive List
    const HOLIDAYS = [
        // 2026
        { date: '2026-01-01', name: '신정' },
        { date: '2026-02-16', name: '설날 연휴' },
        { date: '2026-02-17', name: '설날' },
        { date: '2026-02-18', name: '설날 연휴' },
        { date: '2026-03-01', name: '삼일절' },
        { date: '2026-03-02', name: '대체공휴일(삼일절)' },
        { date: '2026-05-05', name: '어린이날' },
        { date: '2026-05-24', name: '부처님오신날' },
        { date: '2026-05-25', name: '대체공휴일(부처님오신날)' },
        { date: '2026-06-06', name: '현충일' },
        { date: '2026-08-15', name: '광복절' },
        { date: '2026-08-17', name: '대체공휴일(광복절)' },
        { date: '2026-09-24', name: '추석 연휴' },
        { date: '2026-09-25', name: '추석' },
        { date: '2026-09-26', name: '추석 연휴' },
        { date: '2026-10-03', name: '개천절' },
        { date: '2026-10-05', name: '대체공휴일(개천절)' },
        { date: '2026-10-09', name: '한글날' },
        { date: '2026-12-25', name: '성탄절' },
        // 2027
        { date: '2027-01-01', name: '신정' },
        { date: '2027-02-06', name: '설날 연휴' },
        { date: '2027-02-07', name: '설날' },
        { date: '2027-02-08', name: '설날 연휴' },
        { date: '2027-02-09', name: '대체공휴일(설날)' },
        { date: '2027-03-01', name: '삼일절' },
        { date: '2027-05-05', name: '어린이날' },
        { date: '2027-05-13', name: '부처님오신날' },
        { date: '2027-06-06', name: '현충일' },
        { date: '2027-08-15', name: '광복절' },
        { date: '2027-08-16', name: '대체공휴일(광복절)' },
        { date: '2027-09-14', name: '추석 연휴' },
        { date: '2027-09-15', name: '추석' },
        { date: '2027-09-16', name: '추석 연휴' },
        { date: '2027-10-03', name: '개천절' },
        { date: '2027-10-04', name: '대체공휴일(개천절)' },
        { date: '2027-10-09', name: '한글날' },
        { date: '2027-10-11', name: '대체공휴일(한글날)' },
        { date: '2027-12-25', name: '성탄절' },
    ];

    const handleNoteDeleted = (noteId) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        try { eventsService.remove(String(noteId)); } catch (e) { }
    };

    // Helper to add holiday events
    const getHolidayEvents = () => {
        return HOLIDAYS.map((h, i) => ({
            id: `holiday-${i}`,
            title: h.name,
            start: toPlainDate(h.date) || h.date,
            end: toPlainDate(h.date) || h.date,
            calendarId: 'holiday', // Identifying tag for styling if needed
            description: 'HOLIDAY' // Strong marker that survives sanitization
        }));
    };

    return (
        <div className="calendar-tab h-full w-full flex flex-col bg-background relative">
            <div className="flex-1 w-full h-full">
                <ScheduleXCalendar
                    key={`calendar-${calendarRenderKey}`}
                    calendarApp={calendar}
                    customComponents={{
                        monthGridEvent: CustomMonthGridEvent
                    }}
                />
            </div>

            <CalendarNoteDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                date={selectedDate}
                notes={selectedDateNotes}
                onNoteSaved={handleNoteSaved}
                onNoteDeleted={handleNoteDeleted}
                user={user}
            />
        </div>
    );
};

// Custom Component defined OUTSIDE to prevent re-creation on every render
const CustomMonthGridEvent = ({ calendarEvent }) => {
    // Check for holiday flag - identify via description or calendarId
    const isHoliday = calendarEvent.description === 'HOLIDAY' || calendarEvent.calendarId === 'holiday';

    if (isHoliday) {
        return (
            <div className="w-full text-left pl-1 h-full flex items-center select-none pointer-events-none hover:bg-transparent">
                <span className="text-[#ff3b30] text-[11px] font-extrabold leading-tight">
                    {calendarEvent.title}
                </span>
            </div>
        );
    }

    // Default Note Chip (Apple Style)
    // Removed translate-y adjustment to align better
    return (
        <div className="w-full h-full bg-[#007AFF] text-white rounded-[4px] px-1.5 py-[1px] text-[11px] font-medium flex items-center shadow-sm overflow-hidden truncate">
            {calendarEvent.title}
        </div>
    );
};

export default CalendarTab;















