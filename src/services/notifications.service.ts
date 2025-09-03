const webPush = require("web-push");
import { prisma } from "../prisma";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY as string;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY as string;

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

webPush.setVapidDetails(
  "mailto:navinnitt2006@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

let subscriptions: any[] = [];

export function addSubscription(subscription: any) {
  subscriptions.push(subscription);
}

export async function sendNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: NotificationPayload
) {
  try {
    const data = JSON.stringify(payload);
    // ✅ use sendNotification (correct function)
    await webPush.sendNotification(subscription, data);
  } catch (err) {
    console.error("❌ Push error:", err);
  }
}

// Send notification to all subscriptions of a user
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
) {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
  });

  await Promise.all(
    subscriptions.map((sub: any) =>
      sendNotification(
    {
      endpoint: sub.endpoint,
      keys: sub.keys, // directly use the JSON column
    },
    payload
  )
    )
  );
}
