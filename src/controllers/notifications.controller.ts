import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { sendNotification,addSubscription } from "../services/notifications.service";

export const subscribe = async (req: Request, res: Response) => {
  const { subscription, userId } = req.body;

try {
  await prisma.subscription.upsert({
  where: { endpoint: subscription.endpoint },
  update: {
    keys: subscription.keys,   
    userId: userId,            
  },
  create: {
    endpoint: subscription.endpoint,
    keys: subscription.keys,   
    userId: userId,
  },
});

  addSubscription(subscription);
  res.status(201).json({ message: "Subscribed successfully" });
} catch (err: any) {
  console.error("Subscribe error:", err);
  res.status(500).json({
    message: "Failed to save subscription",
    error: err.message,
  });
}
};

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const notifications = await prisma.notification.findMany({
    where: {
      receiverId: userId
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  res.json({
    data: notifications,
    error: null
  });
}