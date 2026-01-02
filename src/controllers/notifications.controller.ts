import { Request, Response } from 'express';
import { prisma } from '../prisma';

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


export const postNotifications = async (req: Request, res: Response) : Promise<void> => { 
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized", data: null });
    return;
  }

  const sub = req.body;

  // Basic payload validation to avoid runtime errors
  if (!sub || typeof sub !== "object" || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    res.status(400).json({ error: "Invalid subscription payload", data: null });
    return;
  }

  try {
    // Ensure idempotency: remove any existing identical subscription for this user
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: req.userId!,
        endpoint: sub.endpoint,
      },
    });

    const created = await prisma.pushSubscription.create({
      data: {
        userId: req.userId!,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });

    res.status(201).json({ success: true, data: { id: created.id } });
  } catch (error) {
    res.status(500).json({ error: "Failed to save subscription", data: null });
  }
}
export const deleteNotifications = async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized", data: null });
    return;
  }

  const userId = req.userId!;
  const { endpoint } = req.query as { endpoint?: string };

  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        ...(endpoint ? { endpoint } : {}),
      },
    });

    res.json({
      data: null,
      error: null,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete subscription(s)", data: null });
  }
}