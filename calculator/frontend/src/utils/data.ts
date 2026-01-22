import { apiClient } from '../api-client';

export type BreakRangeInput = {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  start?: string | Date | null;
  end?: string | Date | null;
};

export type CourseTreeItem = {
  val: string;
  label: string;
};

export type CourseTreeGroup = {
  cat: string;
  items: CourseTreeItem[];
};

export type CourseInfo = {
  name?: string;
  fee?: number;
  max?: number;
  mathExcludedFee?: number;
  textbook?: Record<string, unknown>;
  minDuration?: number;
  maxDuration?: number;
  hasMathOption?: boolean;
  installmentEligible?: boolean;
  dynamicOptions?: Record<string, string | undefined>;
  dynamicTime?: boolean;
  endDay?: number;
  endDays?: number[];
  days?: number[];
  startDays?: number[];
  breakRanges?: BreakRangeInput[];
};

export type TimeTableDynamicOption = { label: string; time: string };
export type TimeTableOnOff = { type: 'onoff'; online?: string; offline?: string };
export type TimeTableDynamic = { type: 'dynamic'; options: TimeTableDynamicOption[] };
export type TimeTableMap = Record<string, string>;
export type TimeTableEntry = string | TimeTableOnOff | TimeTableDynamic | TimeTableMap;
export type RecordingAvailability = boolean | Record<string, boolean | undefined>;

export type CourseDataPayload = {
  courseConfigSetName?: string;
  weekdayName?: string[];
  courseTree?: CourseTreeGroup[];
  courseInfo?: Record<string, CourseInfo | undefined>;
  timeTable?: Record<string, TimeTableEntry | undefined>;
  recordingAvailable?: Record<string, RecordingAvailability | undefined>;
};

// data.js 파일

// 초기값은 빈 상태로 시작, fetchCourseData()를 통해 서버에서 로드됨
const DEFAULT_WEEKDAY_NAME = ['일', '월', '화', '수', '목', '금', '토']; // 요일은 고정이어도 무방하지만 일관성을 위해
let weekdayName: string[] = [...DEFAULT_WEEKDAY_NAME];
let courseTree: CourseTreeGroup[] = [];
let courseToCatMap: Record<string, string> = {};
let courseInfo: Record<string, CourseInfo | undefined> = {};
let timeTable: Record<string, TimeTableEntry | undefined> = {};
let recordingAvailable: Record<string, RecordingAvailability | undefined> = {};
let courseConfigSetName = '';

function setCourseConfigSetName(value: unknown) {
  courseConfigSetName = String(value ?? '').trim();
}

function applyCourseConfigSetData(name: string, data: CourseDataPayload | null | undefined) {
  if (!data || typeof data !== 'object') return false;

  setCourseConfigSetName(name);

  const nextWeekdayName = Array.isArray(data.weekdayName) ? data.weekdayName : [];
  weekdayName.length = 0;
  weekdayName.push(...nextWeekdayName);

  courseTree.length = 0;
  if (Array.isArray(data.courseTree)) {
    courseTree.push(...data.courseTree);
  }

  Object.keys(courseInfo).forEach(key => delete courseInfo[key]);
  Object.assign(courseInfo, data.courseInfo || {});

  Object.keys(timeTable).forEach(key => delete timeTable[key]);
  Object.assign(timeTable, data.timeTable || {});

  Object.keys(recordingAvailable).forEach(key => delete recordingAvailable[key]);
  Object.assign(recordingAvailable, data.recordingAvailable || {});

  Object.keys(courseToCatMap).forEach(key => delete courseToCatMap[key]);
  for (const group of courseTree) {
    for (const item of group.items || []) {
      courseToCatMap[item.val] = group.cat;
    }
  }

  return true;
}

function resetCourseConfigSetData() {
  setCourseConfigSetName('');

  weekdayName.length = 0;
  weekdayName.push(...DEFAULT_WEEKDAY_NAME);

  courseTree.length = 0;

  Object.keys(courseInfo).forEach(key => delete courseInfo[key]);
  Object.keys(timeTable).forEach(key => delete timeTable[key]);
  Object.keys(recordingAvailable).forEach(key => delete recordingAvailable[key]);
  Object.keys(courseToCatMap).forEach(key => delete courseToCatMap[key]);
}

// 서버에서 수업 데이터 가져오기
async function fetchCourseData() {
  try {
    const data = await apiClient.getCourses();
    if (!data || typeof data !== 'object') return false;
    const payload = data as CourseDataPayload;

    setCourseConfigSetName(payload.courseConfigSetName || '');

    // 데이터 업데이트 - 재할당 대신 배열/객체 내용을 직접 수정
    if (payload.weekdayName) {
      weekdayName.length = 0;
      weekdayName.push(...payload.weekdayName);
    }

    courseTree.length = 0;
    if (payload.courseTree) {
      courseTree.push(...payload.courseTree);
    }

    // 객체는 기존 키를 삭제하고 새 키를 추가
    Object.keys(courseInfo).forEach(key => delete courseInfo[key]);
    Object.assign(courseInfo, payload.courseInfo || {});

    Object.keys(timeTable).forEach(key => delete timeTable[key]);
    Object.assign(timeTable, payload.timeTable || {});

    Object.keys(recordingAvailable).forEach(key => delete recordingAvailable[key]);
    Object.assign(recordingAvailable, payload.recordingAvailable || {});

    // courseToCatMap 재생성
    Object.keys(courseToCatMap).forEach(key => delete courseToCatMap[key]);
    for (const group of courseTree) {
      const items = Array.isArray(group.items) ? group.items : [];
      for (const item of items) {
        courseToCatMap[item.val] = group.cat;
      }
    }


    console.log('Course data loaded successfully:', courseTree.length, 'categories');
    return true;
  } catch (error) {
    console.error('Failed to fetch course data:', error);
    console.error('수업 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
    return false;
  }
}

// 과목 키로 과목 이름 가져오기 (courseTree에서 검색)
function getCourseName(courseKey: string) {
  for (const group of courseTree) {
    const items = Array.isArray(group.items) ? group.items : [];
    const item = items.find(i => i.val === courseKey);
    if (item) return item.label;
  }
  // 기존 데이터 호환성: courseInfo에 name이 있으면 사용
  return courseInfo[courseKey]?.name || courseKey;
}


export {
  weekdayName,
  courseTree,
  courseToCatMap,
  courseInfo,
  timeTable,
  recordingAvailable,
  courseConfigSetName,
  setCourseConfigSetName,
  applyCourseConfigSetData,
  resetCourseConfigSetData,
  fetchCourseData, // Export fetch function
  getCourseName // Export helper function
};


