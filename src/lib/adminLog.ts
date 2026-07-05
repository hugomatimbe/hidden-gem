// Shared helper for writing to the admin_actions audit table (see lib/db.ts)
// — kept in one place so every admin route logs actions in the same shape.
export function logAdminAction(
  db: any,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: string
) {
  const id = `action_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  db.prepare(
    `INSERT INTO admin_actions (id, adminId, action, targetType, targetId, details, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, adminId, action, targetType, targetId, details || null, new Date().toISOString());
}
