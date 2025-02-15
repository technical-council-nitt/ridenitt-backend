import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { InviteStatus, RideStatus } from '@prisma/client';

export const getInvites = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const currentRide = await prisma.ride.findFirst({
    where: {
      ownerId: userId,
      status: 'PENDING'
    }
  })

  const invites = await prisma.invite.findMany({
    where: (currentRide) ? { receiverRideId: currentRide.id } : { senderId: userId },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      receiverRide: {
        include: {
          stops: true,
          owner: {
            select: {
              id: true,
              name: true
            }
          },
          participants: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          }
        }
      },
      sender: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  res.json({
    data: invites.map((invite: any) => {
      return invite;
    }),
    error: null
  })
}

export const sendInvite = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { rideId: receiverRideId } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  })

  if (!user || user.currentRideId !== null) {
    res.status(400).json({
      data: null,
      error: 'You already joined a ride'
    });

    return;
  }

  if (!receiverRideId) {
    res.status(400).json({
      data: null,
      error: 'Ride id is required'
    });

    return;
  }

  const ride = await prisma.ride.findFirst({
    where: {
      id: receiverRideId
    },
    include: {
      receivedInvites: {
        where: {
          senderId: userId
        }
      }
    }
  })

  if (!ride) {
    res.status(400).json({
      data: null,
      error: 'Ride not found'
    });

    return;
  } else if (ride.status !== RideStatus.PENDING) {
    res.status(400).json({
      data: null,
      error: 'Ride is already ' + ride.status.toLowerCase()
    });

    return;
  } else if (ride.receivedInvites.length > 0) {
    res.status(400).json({
      data: null,
      error: 'You already sent an invite to this ride'
    });

    return;
  }

  await prisma.invite.create({
    data: {
      senderId: userId,
      receiverRideId
    }
  })

  res.json({
    data: null,
    error: null
  });
}

export const acceptInvite = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { inviteId } = req.params;

  if (!inviteId) {
    res.status(400).json({
      data: null,
      error: 'Invite id is required'
    });

    return;
  }

  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          currentRideId: true
        }
      }
    }
  })

  if (!invite) {
    res.status(400).json({
      data: null,
      error: 'Invite not found'
    });

    return;
  } else if (invite.sender.currentRideId !== null) {
    res.status(400).json({
      data: null,
      error: 'User already joined in a ride'
    });

    return;
  }

  const ride = await prisma.ride.findFirst({
    where: {
      id: invite.receiverRideId
    },
    include: {
      participants: true,
      owner: {
        select: {
          name: true,
          id: true
        }
      }
    }
  })

  if (!ride) {
    res.status(400).json({
      data: null,
      error: 'Ride not found'
    });

    return;
  } else if (ride.owner.id !== userId) {
    res.status(400).json({
      data: null,
      error: 'You are not the owner of this ride'
    });

    return;
  } else if (ride.status !== RideStatus.PENDING) {
    res.status(400).json({
      data: null,
      error: 'Ride is already ' + ride.status.toLowerCase()
    });

    return;
  }

  await prisma.$transaction(async tx => {
    await tx.invite.updateMany({
      where: {
        senderId: invite.senderId,
      },
      data: {
        status: InviteStatus.DECLINED
      }
    })

    await tx.invite.update({
      where: {
        id: invite.id
      },
      data: {
        status: InviteStatus.ACCEPTED
      }
    })

    await tx.ride.update({
      where: {
        id: invite.receiverRideId
      },
      data: {
        participants: {
          connect: {
            id: invite.senderId
          }
        }
      }
    })

    await tx.notification.createMany({
      data: ride.participants.map(participant => ({
        receiverId: participant.id,
        message: `${invite.sender.name} joined the ride by ${ride.owner.name}`,
      })).concat({
        receiverId: invite.sender.id,
        message: `Your invite to the ride by ${ride.owner.name} was accepted`
      })
    })
  })

  res.json({
    data: null,
    error: null
  });
}

export const declineInvite = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { inviteId } = req.params;

  const {
    reason
  } = req.body;

  if (!reason) {
    res.status(400).json({
      data: null,
      error: 'Reason is required'
    });

    return;
  } else if (reason.length < 10) {
    res.status(400).json({
      data: null,
      error: 'Reason must be at least 10 characters long'
    });

    return;
  }

  if (!inviteId) {
    res.status(400).json({
      data: null,
      error: 'Invite id is required'
    });

    return;
  }

  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId
    }
  })

  if (!invite) {
    res.status(400).json({
      data: null,
      error: 'Invite not found'
    });

    return;
  }

  const ride = await prisma.ride.findFirst({
    where: {
      id: invite.receiverRideId
    },
    include: {
      owner: {
        select: {
          name: true,
          id: true
        }
      }
    }
  })

  if (!ride) {
    res.status(400).json({
      data: null,
      error: 'Ride not found'
    });

    return;
  } else if (ride.owner.id !== userId) {
    res.status(400).json({
      data: null,
      error: 'You are not the owner of this ride'
    });

    return;
  }

  await prisma.$transaction(async tx => {
    await tx.invite.update({
      where: {
        id: invite.id
      },
      data: {
        declineReason: reason,
        status: InviteStatus.DECLINED
      }
    })

    //if the ride owner is removing the user from the ride, then remove the currentRideId from the user 
    await tx.user.update({
      where: {
        id: invite.senderId,
        currentRideId: invite.receiverRideId
      },
      data: {
        currentRideId: null
      }
    })

    await tx.notification.create({
      data: {
        receiverId: invite.senderId,
        message: `Your invite to the ride by ${ride.owner.name} was declined. Reason: ${reason}`
      }
    })
  })

  res.json({
    data: null,
    error: null
  });
}