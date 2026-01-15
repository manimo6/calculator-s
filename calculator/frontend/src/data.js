// data.js 파일

// 초기값은 빈 상태로 시작, fetchCourseData()를 통해 서버에서 로드됨
let weekdayName = ['일', '월', '화', '수', '목', '금', '토']; // 요일은 고정이어도 무방하지만 일관성을 위해
let courseTree = [];
let courseToCatMap = {};
let courseInfo = {};
let timeTable = {};
let recordingAvailable = {};

// API URL (환경 변수 또는 하드코딩)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 서버에서 수업 데이터 가져오기
async function fetchCourseData() {
  try {
    const response = await fetch(`${API_URL}/api/courses`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // 데이터 업데이트 - 재할당 대신 배열/객체 내용을 직접 수정
    if (data.weekdayName) {
      weekdayName.length = 0;
      weekdayName.push(...data.weekdayName);
    }

    courseTree.length = 0;
    if (data.courseTree) {
      courseTree.push(...data.courseTree);
    }

    // 객체는 기존 키를 삭제하고 새 키를 추가
    Object.keys(courseInfo).forEach(key => delete courseInfo[key]);
    Object.assign(courseInfo, data.courseInfo || {});

    Object.keys(timeTable).forEach(key => delete timeTable[key]);
    Object.assign(timeTable, data.timeTable || {});

    Object.keys(recordingAvailable).forEach(key => delete recordingAvailable[key]);
    Object.assign(recordingAvailable, data.recordingAvailable || {});

    // courseToCatMap 재생성
    Object.keys(courseToCatMap).forEach(key => delete courseToCatMap[key]);
    for (const group of courseTree) {
      for (const item of group.items) {
        courseToCatMap[item.val] = group.cat;
      }
    }

    console.log('Course data loaded successfully:', courseTree.length, 'categories');
    return true;
  } catch (error) {
    console.error('Failed to fetch course data:', error);
    alert('수업 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
    return false;
  }
}

// 과목 키로 과목 이름 가져오기 (courseTree에서 검색)
function getCourseName(courseKey) {
  for (const group of courseTree) {
    const item = group.items.find(i => i.val === courseKey);
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
  fetchCourseData, // Export fetch function
  getCourseName // Export helper function
};
