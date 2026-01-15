import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  Settings,
  StickyNote,
  Users,
} from "lucide-react"

export const ADMIN_TABS = [
  { id: "notices", label: "공지사항", icon: Megaphone },
  { id: "calendar", label: "캘린더", icon: Calendar },
  { id: "courses", label: "수업 목록", icon: BookOpen },
  { id: "registrations", label: "등록현황", icon: ClipboardList },
  { id: "attendance", label: "출석부", icon: CheckCircle2 },
  { id: "notes", label: "과목별 메모", icon: StickyNote },
  { id: "accounts", label: "계정 관리", icon: Users },
  { id: "settings", label: "설정", icon: Settings },
]
