import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const rides = await prisma.ride.findMany({
      where: {
        status: 'PENDING',
        ownerId: {
          not: userId
        },
        latestDeparture: {
          gt: new Date() // Only fetch rides that haven't expired
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          }
        },
        stops: true,
        receivedInvites: {
          where: {
            senderId: userId
          },
          take: 1
        },
        participants: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const out = rides.map((ride: any) => {
      ride.myInvite = ride.receivedInvites.length > 0 ? ride.receivedInvites[0] : null;
      delete ride.receivedInvites;
      return ride;
    });

    res.json({
      data: out,
      error: null
    });
  } catch (error) {
    console.error('Error fetching ride suggestions:', error);
    res.status(500).json({
      data: null,
      error: 'Internal server error'
    });
  }
};
