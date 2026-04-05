const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermissions } = require('../middleware/permissionMiddleware');

const router = express.Router();

// GET /api/courses
router.get('/', authMiddleware(), requirePermissions('tabs.courses'), async (req, res) => {
  try {
    const row = await prisma.courseConfig.findUnique({ where: { key: 'courses' } });
    res.json(row?.data || {});
  } catch (error) {
    console.error('Error reading course data:', error);
    res.status(500).json({ status: '실패', message: '수업 데이터를 불러오는 과정에서 오류가 발생했습니다.' });
  }
});

// courseTree에서 val→label 맵 생성
type CourseTreeItem = { val: string; label: string };
type CourseTreeGroup = { cat: string; items: CourseTreeItem[] };
function buildLabelMap(courseTree: CourseTreeGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of courseTree || []) {
    for (const item of group.items || []) {
      if (item.val && item.label) map.set(item.val, item.label);
    }
  }
  return map;
}

// POST /api/courses
router.post('/', authMiddleware(), requirePermissions('tabs.courses'), async (req, res) => {
  try {
    const newData = req.body;
    const courseConfigSetName = String(newData?.courseConfigSetName || '').trim();

    // 기존 데이터 로드 (이름 변경 감지용)
    const oldRow = await prisma.courseConfig.findUnique({ where: { key: 'courses' } });
    const oldData = (oldRow?.data || {}) as Record<string, unknown>;
    const oldTree = Array.isArray(oldData.courseTree) ? oldData.courseTree as CourseTreeGroup[] : [];
    const newTree = Array.isArray(newData?.courseTree) ? newData.courseTree as CourseTreeGroup[] : [];

    // 저장
    await prisma.courseConfig.upsert({
      where: { key: 'courses' },
      create: { key: 'courses', data: newData },
      update: { data: newData },
    });

    // 이름 변경 감지 및 등록 업데이트
    if (courseConfigSetName && oldTree.length > 0 && newTree.length > 0) {
      const oldLabels = buildLabelMap(oldTree);
      const newLabels = buildLabelMap(newTree);
      const renames: Array<{ from: string; to: string }> = [];

      for (const [val, newLabel] of newLabels) {
        const oldLabel = oldLabels.get(val);
        if (oldLabel && oldLabel !== newLabel) {
          renames.push({ from: oldLabel, to: newLabel });
        }
      }

      if (renames.length > 0) {
        // registrations.course 일괄 업데이트
        for (const { from, to } of renames) {
          const updated = await prisma.registration.updateMany({
            where: { course: from, courseConfigSetName },
            data: { course: to },
          });
          if (updated.count > 0) {
            console.log(`[과목명 변경] "${from}" → "${to}" (${updated.count}건 업데이트)`);
          }
        }

        // courseConfigSet(presets) 테이블의 courseTree도 동기화
        const preset = await prisma.courseConfigSet.findUnique({ where: { name: courseConfigSetName } });
        if (preset?.data) {
          const presetData = preset.data as Record<string, unknown>;
          const presetTree = Array.isArray(presetData.courseTree) ? presetData.courseTree as CourseTreeGroup[] : [];
          let changed = false;
          for (const group of presetTree) {
            for (const item of group.items || []) {
              const newLabel = newLabels.get(item.val);
              if (newLabel && item.label !== newLabel) {
                item.label = newLabel;
                changed = true;
              }
            }
          }
          if (changed) {
            await prisma.courseConfigSet.update({
              where: { name: courseConfigSetName },
              data: { data: { ...presetData, courseTree: presetTree } },
            });
            console.log(`[과목명 변경] 설정 세트 "${courseConfigSetName}" courseTree 동기화 완료`);
          }
        }
      }
    }

    console.log(`[${new Date().toISOString()}] 수업 데이터 업데이트 완료`);
    res.json({ status: '성공', message: '수업 데이터가 업데이트되었습니다.' });
  } catch (error) {
    console.error('Error writing course data:', error);
    res.status(500).json({ status: '실패', message: '수업 데이터를 저장하는 과정에서 오류가 발생했습니다.' });
  }
});

module.exports = router;
