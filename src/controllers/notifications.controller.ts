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