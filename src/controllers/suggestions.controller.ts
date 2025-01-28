import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { InviteStatus } from '@prisma/client';

export const getSuggestions = async (req: Request, res: Response) => {
  const rides = await prisma.ride.findMany({
    where: {
      status: 'PENDING'
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        }
      },
      receivedInvites: {
        where: {
          status: InviteStatus.ACCEPTED
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  res.json({
    data: rides,
    error: null
  });
}