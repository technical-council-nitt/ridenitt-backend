import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { InviteStatus, RideStatus } from '@prisma/client';

export const getRides = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const rides = await prisma.ride.findMany({
    where: {
      OR: [
        {
          ownerId: userId
        },
        {
          participants: {
            some: {
              id: userId
            }
          }
        }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true
        }
      },
      participants: true,
      receivedInvites: {
        where: {
          status: InviteStatus.ACCEPTED
        },
        select: {
          sender: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          }
        }
      },
      stops: true
    }
  })

  res.json({
    data: rides,
    error: null
  });
}

export const createRide = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const {
    stops,
    peopleCount,
    earliestDeparture,
    vehicleType,
    latestDeparture,
    prefersGender
  } = req.body;

  if (!Array.isArray(stops)) {
    res.status(400).json({ data: null, error: 'Stops must be an array' });
    return
  }

  if (typeof prefersGender !== 'string') {
    res.status(400).json({ data: null, error: 'Preferred Gender must be a string' });
    return
  }

  if (typeof peopleCount !== 'number' || isNaN(peopleCount)) {
    res.status(400).json({ data: null, error: 'People count must be a number' });
    return
  }

  if (typeof vehicleType !== 'string' || !vehicleType || ["CAR", "AUTO", "BUS"].indexOf(vehicleType.toUpperCase()) === -1) {
    res.status(400).json({ data: null, error: 'Please provide Vehicle type' });
    return
  }

  if (peopleCount < 1) {
    res.status(400).json({ data: null, error: 'People count must be at least 1' });
    return
  }

  if (typeof earliestDeparture !== 'number' || isNaN(new Date(earliestDeparture).getTime())) {
    res.status(400).json({ data: null, error: 'Earliest departure must be a valid date' });
    return
  }

  if (typeof latestDeparture !== 'number' || isNaN(new Date(latestDeparture).getTime())) {
    res.status(400).json({ data: null, error: 'Latest departure must be a valid date' });
    return
  }

  if (new Date(earliestDeparture).getTime() > new Date(latestDeparture).getTime()) {
    res.status(400).json({ data: null, error: 'Earliest departure must be before latest departure' });
    return
  }

  if (stops.length < 2) {
    res.status(400).json({ data: null, error: 'Ride must have at least two stops' });
    return
  }

  if (stops[0].name === stops[stops.length - 1].name) {
    res.status(400).json({ data: null, error: 'Stops must be different' })
    return
  }

  try {
    const ride = await prisma.ride.create({
      data: {
        ownerId: userId,
        participants: {
          connect: {
            id: userId
          }
        },
        prefersGender: (prefersGender || null) as any,
        peopleCount,
        earliestDeparture: new Date(earliestDeparture),
        latestDeparture: new Date(latestDeparture),
        vehicleType: vehicleType.toUpperCase() as any,
        stops: {
          createMany: {
            data: stops.map((stop: any) => ({
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ data: null, error: 'Failed to create ride' });
  }
}

export const cancelRide = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { rideId } = req.params;

  const { reason } = req.body;

  if (typeof reason !== 'string') {
    res.status(400).json({ data: null, error: 'Reason must be a string' });
    return
  }

  if (reason.length < 2) {
    res.status(400).json({ data: null, error: 'Reason must be at least 2 characters' });
    return
  }

  const ride = await prisma.ride.findFirst({
    where: {
      id: rideId
    },
    include: {
      owner: true
    }
  });

  if (!ride) {
    res.status(404).json({ error: 'Ride not found' });
    return
  } else if (ride.ownerId !== userId) {
    res.status(403).json({ error: 'You are not the owner of this ride' });
    return
  }

  await prisma.$transaction(async tx => {
    const acceptedInvites = await tx.invite.updateManyAndReturn({
      where: {
        receiverRideId: ride.id,
        status: InviteStatus.ACCEPTED
      },
      data: {
        declineReason: 'Ride cancelled',
        status: InviteStatus.DECLINED
      }
    })

    const pendingInvites = await tx.invite.updateManyAndReturn({
      where: {
        receiverRideId: ride.id,
        status: InviteStatus.PENDING
      },
      data: {
        declineReason: 'Ride cancelled',
        status: InviteStatus.DECLINED
      }
    })

    await tx.notification.createMany({
      data: pendingInvites
        .map(pi => ({
          receiverId: pi.senderId,
          message: `Your invite was declined by ${ride.owner.name} as the ride was cancelled. Reason: ${reason}`
        })).concat(acceptedInvites.map(ai => ({
          receiverId: ai.senderId,
          message: `Your active ride was cancelled by ${ride.owner.name}. Reason: ${reason}`
        })))
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

export const completeRide = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { rideId } = req.params;

  const ride = await prisma.ride.findFirst({
    where: {
      id: rideId
    },
    include: {
      participants: {
        select: {
          id: true
        }
      },
      owner: true,
    }
  });

  if (!ride) {
    res.status(404).json({ error: 'Ride not found' });
    return
  } else if (ride.ownerId !== userId) {
    res.status(403).json({ error: 'You are not the owner of this ride' });
    return
  } else if (ride.status !== RideStatus.PENDING) {
    res.status(400).json({ error: 'Ride is already ' + ride.status.toLowerCase() });
    return
  }

  await prisma.$transaction(async tx => {
    await tx.ride.update({
      where: {
        id: ride.id
      },
      data: {
        status: RideStatus.COMPLETED
      }
    })

    await tx.notification.createMany({
      data: ride.participants.map(participant => ({
        receiverId: participant.id,
        message: `${ride.owner.name} marked the Ride as completed` //TODO: Improve message
      }))
    })
  })

  res.json({
    data: null,
    error: null
  });
}