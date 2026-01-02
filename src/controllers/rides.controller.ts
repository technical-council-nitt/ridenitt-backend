import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { InviteStatus, RideStatus } from '@prisma/client';
import moment from 'moment';

import { sendNotification } from '../services/send.notification';
import webpush from '../services/push.service';

export const getRides = async (req: Request, res: Response) => {
  // Update all rides in the system that are PENDING and latestDeparture < now to COMPLETED
  const now = new Date();
  // Find all rides that need to be completed
  const ridesToComplete = await prisma.ride.findMany({
    where: {
      status: RideStatus.PENDING,
      latestDeparture: { lt: now }
    },
    include: {
      participants: { select: { id: true } },
      owner: { select: { id: true, name: true } }
    }
  });

  // Update their status and send notifications
  for (const ride of ridesToComplete) {
    await prisma.ride.update({
      where: { id: ride.id },
      data: { status: RideStatus.COMPLETED }
    });




    // Notify all participants (including owner)
    const allUserIds = [ride.owner.id, ...ride.participants.map(p => p.id)];
    await prisma.notification.createMany({
      data: allUserIds.map(uid => ({
        receiverId: uid,
        message: `${ride.owner.name} ride has been automatically marked as completed.`
      }))
    });


  }

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

  // Before checking active rides, update all rides for this user that are PENDING and latestDeparture < now to COMPLETED
  const nowForActiveRides = new Date();
  await prisma.ride.updateMany({
    where: {
      participants: { some: { id: userId } },
      status: 'PENDING',
      latestDeparture: { lt: nowForActiveRides }
    },
    data: { status: 'COMPLETED' }
  });

  // Now fetch the user and their active rides
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      activeRides: {
        where: { status: 'PENDING' },
        select: { id: true }
      }
    }
  });
  if (req.body.peopleCount < 2) {
    res.status(400).json({ data: null, error: 'People limit must be at least 2' });
    return;
  }
  if ((user?.activeRides?.length ?? 0) >= 3) {
    res.status(400).json({ data: null, error: 'You can only have 3 active rides at a time' });
    return;
  }


  if (!Array.isArray(stops)) {
    res.status(400).json({ data: null, error: 'Stops must be an array' });
    return;
  }

  if (typeof prefersGender !== 'string') {
    res.status(400).json({ data: null, error: 'Preferred Gender must be a string' });
    return;
  }


  if (typeof peopleCount !== 'number' || isNaN(peopleCount)) {
    res.status(400).json({ data: null, error: 'People count must be a number' });
    return;
  }

  if (typeof vehicleType !== 'string' || !vehicleType || ["CAR", "AUTO", "BUS"].indexOf(vehicleType.toUpperCase()) === -1) {
    res.status(400).json({ data: null, error: 'Please provide Vehicle type' });
    return;
  }

  if (peopleCount < 1) {
    res.status(400).json({ data: null, error: 'People count must be at least 1' });
    return;
  }

  // Validate the dates directly (without time conversion)
  if (!earliestDeparture || !latestDeparture) {
    res.status(400).json({ data: null, error: 'Departure dates must be provided' });
    return;
  }

  if (earliestDeparture > latestDeparture) {
    res.status(400).json({ data: null, error: 'Earliest departure must be before latest departure' });
    return;
  }

  // Convert the ISO date strings to Date objects
  const earliestDepartureDate = new Date(earliestDeparture);
  const latestDepartureDate = new Date(latestDeparture);

  if (isNaN(earliestDepartureDate.getTime())) {
    res.status(400).json({ data: null, error: 'Invalid earliest departure date' });
    return;
  }

  if (isNaN(latestDepartureDate.getTime())) {
    res.status(400).json({ data: null, error: 'Invalid latest departure date' });
    return;
  }

  if (stops.length < 2) {
    res.status(400).json({ data: null, error: 'Ride must have at least two stops' });
    return;
  }

  if (stops[0].name === stops[stops.length - 1].name) {
    res.status(400).json({ data: null, error: 'Stops must be different' });
    return;
  }

  // Before creating a new ride, update all rides in the system that are PENDING and latestDeparture < now to COMPLETED
  const now = new Date();
  await prisma.ride.updateMany({
    where: {
      status: RideStatus.PENDING,
      latestDeparture: { lt: now }
    },
    data: { status: RideStatus.COMPLETED }
  });

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
        earliestDeparture: earliestDepartureDate,  // Use Date objects from the frontend
        latestDeparture: latestDepartureDate,      // Use Date objects from the frontend
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



    let AllUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId,
        }
      },
    });
    console.log(AllUsers.map(u => u.name));




    const payload = JSON.stringify({
      title: "New Ride Available 🚗",
      body: `${user?.name || 'A user'} created a new ride for ${stops[0].name} to ${stops[stops.length - 1].name}.`,
      url: "/",
      icon: "/icons/logo.png",
      badge: "/icons/logo.png",
    });

    sendNotification(AllUsers.map(u => u.id).filter(id => id !== userId), payload);




  } catch (e) {
    console.error(e);
    console.error('Ride creation error:', JSON.stringify(e, null, 2));

    res.status(500).json({ data: null, error: 'Failed to create ride' });
  }
};



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
  let notifyUserIds: string[] = [];
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
    notifyUserIds = [
      ...acceptedInvites.map(ai => ai.senderId)
    ];

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

  const payload = JSON.stringify({
    title: "Ride Cancelled 😞",
    body: `${ride.owner?.name || 'Ride Owner'} cancelled the ride .Reason: ${reason}`,
    url: "/",
    icon: "/icons/logo.png",
      badge: "/icons/logo.png",
  });

  sendNotification(notifyUserIds, payload);

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
    const notifyUserIds = ride.participants.map(p => p.id);
    const uniqueUserIds = [...new Set(notifyUserIds)];



    const payload = JSON.stringify({
      title: "Ride Completed ✅",
      body: `${ride.owner?.name || 'Ride Owner'} marked the ride as completed.`,
      url: "/",
      icon: "/icons/logo.png",
      badge: "/icons/logo.png",
    });

    sendNotification(uniqueUserIds, payload);

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
