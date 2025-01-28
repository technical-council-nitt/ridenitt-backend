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

  if (!currentRide) {
    res.status(400).json({
      data: null,
      error: 'You do not have an active ride'
    });

    return;
  }

  const acceptedInvites = await prisma.invite.findMany({
    where: {
      receiverRideId: currentRide.id,
      status: InviteStatus.ACCEPTED
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          phoneNumber: true
        }
      }
    }
  })

  const otherInvites = await prisma.invite.findMany({
    where: {
      receiverRideId: currentRide.id,
      status: {
        in: [InviteStatus.PENDING, InviteStatus.DECLINED]
      }
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  res.json({
    data: acceptedInvites.concat(otherInvites as any),
    error: null
  });
}

export const sendInvite = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { rideId: receiverRideId } = req.body;

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

  await prisma.invite.update({
    where: {
      id: inviteId
    },
    data: {
      status: InviteStatus.ACCEPTED
    }
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

  await prisma.invite.update({
    where: {
      id: inviteId
    },
    data: {
      declineReason: reason,
      status: InviteStatus.DECLINED
    }
  })

  res.json({
    data: null,
    error: null
  });
}