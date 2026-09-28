import { AppNotification, NotificationEntity } from "./types";

const targets: Record<NotificationEntity, { label: string; href: (id: string) => string }> = {
  TICKET: { label: "View ticket", href: (id) => `/tickets/${id}` },
  REQUEST: { label: "View request", href: (id) => `/requests?focus=${id}` },
  SCHEDULE: { label: "View schedule", href: (id) => `/schedule?focus=${id}` },
  EQUIPMENT: { label: "View equipment", href: (id) => `/equipment/${id}` },
};

export function notificationLink(notification: Pick<AppNotification, "entityType" | "entityId">) {
  const target = notification.entityType && targets[notification.entityType];
  if (!target || !notification.entityId) return null;
  return { label: target.label, href: target.href(encodeURIComponent(notification.entityId)) };
}
