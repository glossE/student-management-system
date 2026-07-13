export function logActivity(client, { action, entityId, details }) {
  return client.activityLog.create({
    data: { entityType: "Student", action, entityId, details },
  });
}
