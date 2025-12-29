import webpush from "web-push";
import { prisma } from "../prisma";

export const sendNotification = async (
  userIds: string[],
  payload: string
) => {
  if (!userIds.length) return;

  // Remove duplicates
  const uniqueUserIds = [...new Set(userIds)];

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: {
        in: uniqueUserIds,
      },
    },
  });

  if (!subscriptions.length) return;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      } catch (err: any) {
        // Clean up invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        } else {
          console.error("Push error:", err);
        }
      }
    })
  );
};