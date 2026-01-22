import React, { useEffect, useMemo, useState } from 'react';
import AccountsTab from '../features/admin/accounts/AccountsTab';
import AttendanceTab from '../features/admin/attendance/AttendanceTab';
import CoursesTab from '../features/admin/courses/CoursesTab';
import SettingsTab from '../features/admin/settings/SettingsTab';
import NotesTab from '../features/admin/notes/NotesTab';
import RegistrationsTab from '../features/admin/registrations/RegistrationsTab';
import AdminShell from '../features/admin/components/AdminShell';
import { useAuth } from '../auth-context';
import NoticesTab from '../features/admin/notices/NoticesTab';
import { ADMIN_TABS } from '../features/admin/constants';
import { PERMISSION_KEYS, hasPermission } from '../permissions';
import { useUnreadBadges } from '../features/admin/useUnreadBadges';

import CalendarTab from '../features/admin/calendar/CalendarTab';

// Placeholder components for tabs
const DashboardHome = () => (
    <div style={{ padding: '20px' }}>
        <h2>관리자 홈</h2>
        <p>좌측 메뉴에서 항목을 선택하세요.</p>
    </div>
);

const AdminDashboard = () => {
    const { user, loading, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<any>('dashboard');
    const [mountedTabs, setMountedTabs] = useState<any>(() => new Set(['dashboard']));
    const [coursesResetKey, setCoursesResetKey] = useState<any>(0);
    const [coursesDirty, setCoursesDirty] = useState<any>(false);

    const visibleTabs = useMemo(() => {
        if (!user) return [];
        const tabPermissionMap = {
            calendar: PERMISSION_KEYS.tabs.calendar,
            courses: PERMISSION_KEYS.tabs.courses,
            registrations: PERMISSION_KEYS.tabs.registrations,
            attendance: PERMISSION_KEYS.tabs.attendance,
            notes: PERMISSION_KEYS.tabs.courseNotes,
        };
        return ADMIN_TABS.filter((tab) => {
            const key = tabPermissionMap[tab.id];
            if (!key) return true;
            return hasPermission(user, key);
        });
    }, [user]);
    const visibleTabIds = useMemo(
        () => new Set(visibleTabs.map((tab) => tab.id)),
        [visibleTabs]
    );
    const fallbackTab = visibleTabs[0]?.id || 'dashboard';
    const {
        unread,
        markNoticesRead,
        markCourseNoteRead,
        courseNoteReadMap,
    } = useUnreadBadges({
        user,
        enableNotices: visibleTabIds.has('notices'),
        enableNotes: visibleTabIds.has('notes'),
    });

    const tabsWithUnread = useMemo(
        () =>
            visibleTabs.map((tab) => ({
                ...tab,
                hasUnread:
                    tab.id === 'notices'
                        ? unread.notices
                        : tab.id === 'notes'
                            ? unread.notes
                            : false,
            })),
        [unread.notes, unread.notices, visibleTabs]
    );


    const handleTabChange = (nextTab) => {
        if (activeTab === 'courses' && nextTab !== 'courses' && coursesDirty) {
            const ok = confirm("현재 변경사항이 저장되지 않았습니다. 탭을 이동해도 저장되지는 않습니다. 계속할까요?");
            if (!ok) return;
            setCoursesResetKey((prev) => prev + 1);
            setCoursesDirty(false);
        }
        if (nextTab === 'notices') {
            markNoticesRead();
        }
        setMountedTabs((prev) => {
            if (prev.has(nextTab)) return prev;
            const next = new Set(prev);
            next.add(nextTab);
            return next;
        });
        setActiveTab(nextTab);
    };

    useEffect(() => {
        setMountedTabs((prev) => {
            if (prev.has(activeTab)) return prev;
            const next = new Set(prev);
            next.add(activeTab);
            return next;
        });
    }, [activeTab]);

    useEffect(() => {
        if (!user) return;
        if (!visibleTabIds.has(activeTab)) {
            setActiveTab(fallbackTab);
        }
    }, [activeTab, fallbackTab, user, visibleTabIds]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const raf = window.requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
        });
        return () => window.cancelAnimationFrame(raf);
    }, [activeTab]);

    if (loading) {
        return <div style={{ padding: 20 }}>불러오는 중...</div>;
    }

    if (!user) return null;

    const tabPanels = [
        { id: 'notices', element: <NoticesTab user={user} /> },
        { id: 'calendar', element: <CalendarTab user={user} isActive={activeTab === 'calendar'} /> },
        { id: 'courses', element: <CoursesTab user={user} onDirtyChange={setCoursesDirty} /> },
        { id: 'registrations', element: <RegistrationsTab user={user} /> },
        { id: 'attendance', element: <AttendanceTab user={user} /> },
        {
            id: 'notes',
            element: (
                <NotesTab
                    user={user}
                    onNoteRead={markCourseNoteRead}
                    noteReadMap={courseNoteReadMap}
                />
            ),
        },
        { id: 'accounts', element: <AccountsTab user={user} /> },
        { id: 'settings', element: <SettingsTab /> },
        { id: 'dashboard', element: <DashboardHome /> },
    ];

    return (
        <AdminShell
            user={user}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onLogout={logout}
            tabs={tabsWithUnread}
        >
            {tabPanels.map(({ id, element }) => {
                if (id !== 'dashboard' && !visibleTabIds.has(id)) return null;
                if (!mountedTabs.has(id)) return null;
                const key = id === 'courses' ? `${id}-${coursesResetKey}` : id;
                const panelClassName = activeTab === id
                    ? id === 'calendar'
                        ? 'block h-full'
                        : 'block'
                    : 'hidden';
                return (
                    <div key={key} className={panelClassName}>
                        {element}
                    </div>
                );
            })}
        </AdminShell>
    );
};

export default AdminDashboard;
