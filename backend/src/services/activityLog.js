export function logActivity(client, { entityType = "Student", action, entityId, details, actor }) {
  return client.activityLog.create({
    data: {
      entityType,
      action,
      entityId,
      details,
      // Snapshot the actor so the log stays meaningful even if the user is
      // later deleted (userId may dangle; email/role are frozen at write time).
      userId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? null,
    },
  });
}
