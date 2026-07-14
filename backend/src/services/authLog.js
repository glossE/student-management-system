export function logAuthEvent(client, { userId, email, event, req }) {
  return client.authLog.create({
    data: {
      userId: userId ?? null,
      email,
      event,
      ipAddress: req?.ip ?? null,
      userAgent: req?.headers?.["user-agent"] ?? null,
    },
  });
}
