const { prisma } = require('../db/prisma');

const ROLE_NAMES = ['master', 'admin', 'teacher', 'parttime'];

const PERMISSIONS = [
  { key: 'tabs.calendar', description: 'Calendar tab access', scopeType: 'tab' },
  { key: 'tabs.courses', description: 'Courses tab access', scopeType: 'tab' },
  { key: 'tabs.registrations', description: 'Registrations tab access', scopeType: 'tab' },
  { key: 'tabs.attendance', description: 'Attendance tab access', scopeType: 'tab' },
  { key: 'tabs.course_notes', description: 'Course notes tab access', scopeType: 'tab' },
  { key: 'registrations.merges.manage', description: 'Merge manager button', scopeType: 'button' },
  { key: 'registrations.installments.view', description: 'Installment board button', scopeType: 'button' },
  { key: 'registrations.transfers.manage', description: 'Transfer button', scopeType: 'button' },
];

async function main() {
  await prisma.role.createMany({
    data: ROLE_NAMES.map((name) => ({ name, isSystem: true })),
    skipDuplicates: true,
  });

  await prisma.permission.createMany({
    data: PERMISSIONS,
    skipDuplicates: true,
  });

  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const roleByName = new Map(
    roles.map((role: { id: string; name: string }) => [role.name, role.id])
  );
  const permissions = await prisma.permission.findMany({
    select: { id: true, key: true },
  });

  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  const userRoleRows = users
    .map((user: { id: string; role: string }) => ({
      userId: user.id,
      roleId: roleByName.get(user.role),
    }))
    .filter(
      (row: { userId: string; roleId?: string | undefined }): row is { userId: string; roleId: string } =>
        Boolean(row.roleId)
    );

  if (userRoleRows.length > 0) {
    await prisma.userRole.createMany({ data: userRoleRows, skipDuplicates: true });
  }

  const rolePermissionRows = roles.flatMap((role: { id: string }) =>
    permissions.map((permission: { id: string }) => ({
      roleId: role.id,
      permissionId: permission.id,
    }))
  );

  if (rolePermissionRows.length > 0) {
    await prisma.rolePermission.createMany({
      data: rolePermissionRows,
      skipDuplicates: true,
    });
  }

  console.log('[seedPermissions] roles:', ROLE_NAMES.length);
  console.log('[seedPermissions] permissions:', PERMISSIONS.length);
  console.log('[seedPermissions] user_roles:', userRoleRows.length);
  console.log('[seedPermissions] role_permissions:', rolePermissionRows.length);
}

main()
  .catch((err) => {
    console.error('[seedPermissions] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
