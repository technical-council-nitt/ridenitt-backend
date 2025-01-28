import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { InviteStatus, RideStatus } from '@prisma/client';

export const getCurrentRide = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const rideId = req.params.rideId;

  const ride = await prisma.ride.findFirst({
    where: {
      id: rideId,
      ownerId: userId,
      status: RideStatus.PENDING
    },
    include: {
      receivedInvites: {
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      stops: true
    }
  });

  if (!ride) {
    res.status(404).json({ error: 'Ride not found' });
    return
  }

  res.json({
    data: ride,
    error: null
  });
}

export const getRides = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const rides = await prisma.ride.findMany({
    where: {
      ownerId: userId
    },
    include: {
      receivedInvites: {
        where: {
          status: InviteStatus.ACCEPTED
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              phoneNumber: true //Accepted so reveal phone number
            }
          }
        }
      },
      stops: true
    }
  });

  res.json({
    data: rides,
    error: null
  });
}

export const createRide = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const {
    stops,
    capacity,
    earliestDeparture,
    vehicleType,
    latestDeparture,
  } = req.body;

  if (!Array.isArray(stops)) {
    res.status(400).json({ error: 'Stops must be an array' });
    return
  }

  if (typeof capacity !== 'number') {
    res.status(400).json({ error: 'Capacity must be a number' });
    return
  }

  if (typeof earliestDeparture !== 'number' || isNaN(new Date(earliestDeparture).getTime())) {
    res.status(400).json({ error: 'Earliest departure must be a valid date' });
    return
  }

  if (typeof latestDeparture !== 'number' || isNaN(new Date(latestDeparture).getTime())) {
    res.status(400).json({ error: 'Latest departure must be a valid date' });
    return
  }

  if (new Date(earliestDeparture).getTime() > new Date(latestDeparture).getTime()) {
    res.status(400).json({ error: 'Earliest departure must be before latest departure' });
    return
  }

  if (stops.length < 2) {
    res.status(400).json({ error: 'Ride must have at least two stops' });
    return
  }

  const existingRide = await prisma.ride.findFirst({
    where: {
      ownerId: userId,
      status: RideStatus.PENDING
    }
  })

  if (existingRide) {
    res.status(400).json({
      data: null,
      error: 'You already have an active ride'
    })
    
    return
  }

  const ride = await prisma.ride.create({
    data: {
      ownerId: userId,
      capacity,
      earliestDeparture: new Date(earliestDeparture),
      latestDeparture: new Date(latestDeparture),
      vehicleType, //TODO: validate vehicleType
      stops: {
        createMany: {
          data: stops.map((stop: any) => ({
            lat: stop.lat,
            lon: stop.lon,
            name: stop.name
          }))
        }
      }
    }
  });

  res.json({
    data: ride,
    error: null
  });
}

export const cancelRide = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const reason = req.body.reason;

  if (typeof reason !== 'string') {
    res.status(400).json({ error: 'Reason must be a string' });
    return
  }
  
  if (reason.length < 10) {
    res.status(400).json({ error: 'Reason must be at least 10 characters' });
    return
  }

  const ride = await prisma.ride.findFirst({
    where: {
      ownerId: userId,
      status: RideStatus.PENDING
    },
    include: {
      owner: true
    }
  });

  if (!ride) {
    res.status(404).json({ error: 'Ride not found' });
    return
  }

  await prisma.$transaction(async tx => {
    const pendingOrAcceptedInvites = await tx.invite.updateManyAndReturn({
      where: {
        receiverRideId: ride.id,
        status: {
          in: [InviteStatus.PENDING, InviteStatus.ACCEPTED]
        }
      },
      data: {
        status: InviteStatus.DECLINED
      },
      select: {
        senderId: true
      }
    })

    await tx.notification.createMany({
      data: pendingOrAcceptedInvites.map(invite => ({
        receiverId: invite.senderId,
        message: `${ride.owner.name} cancelled the current ride. Reason: ${reason}`,
      }))
    })

    await prisma.ride.update({
      where: {
        id: ride.id
      },
      data: {
        status: RideStatus.CANCELLED
      }
    })
  })

  res.json({
    data: null,
    error: null
  });
}