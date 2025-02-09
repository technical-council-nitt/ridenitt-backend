import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { InviteStatus } from '@prisma/client';

export const getSuggestions = async (req: Request, res: Response) => {
  const userId = req.userId;

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
      _count: {
        select: {
          receivedInvites: {
            where: {
              status: InviteStatus.ACCEPTED
            }
          }
        }
      },
      receivedInvites: {
        where: {
          senderId: req.userId
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  const out : any = rides.map((ride: any) => {
    ride.myInvite = ride.receivedInvites.length > 0 ? ride.receivedInvites[0] : null;
    delete ride.receivedInvites;
  })

  res.json({
    data: out,
    error: null
  });
}