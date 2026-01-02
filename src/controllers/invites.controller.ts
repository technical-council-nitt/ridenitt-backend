import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { InviteStatus, RideStatus } from '@prisma/client';
import webpush from '../services/push.service';
import { sendNotification } from '../services/send.notification';

export const getInvites = async (req: Request, res: Response) => {
  const userId = req.userId!;

  //TODO: too much data is being transferred

  const recv = await prisma.ride.findMany({
    where: {
      ownerId: userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      stops: true,
      participants: {
        select: {
          id: true,
        }
      },
      receivedInvites: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          }
        }
      },
    }
  })

  const sent = await prisma.invite.findMany({
    where: {
      senderId: userId
    },
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
              name: true,
              phoneNumber: true
            }
          },
          participants: {
            select: {
              id: true,
              name: true,
              gender: true,
              phoneNumber: true
            }
          }
        }
      }
    }
  })

  res.json({
    data: {
      sent: sent.map(i => {
        if (i.status !== InviteStatus.ACCEPTED) {
          i.receiverRide.owner.phoneNumber = "+91 9xxxx xxxxx"
          i.receiverRide.participants = i.receiverRide.participants.map(p => {
            p.phoneNumber = "+91 9xxxx xxxxx"
            return p
          })
        }
        return i
      }),
      received: recv.map(r => {
        const invites = r.receivedInvites.map(i => {
          if (i.status !== InviteStatus.ACCEPTED) i.sender.phoneNumber = "+91 9xxxx xxxxx"
          return i
        })

        //@ts-ignore
        delete r.receivedInvites

        return {
          ride: r,
          invites
        }
      })
    },
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

  if (!user) {
    res.status(400).json({
      data: null,
      error: 'User not found'
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
      },
      participants: true,
    }
  })

  if (!ride) {
    res.status(400).json({
      data: null,
      error: 'Ride not found'
    });

    return;
  } else if (ride.peopleCount <= ride.participants.length) {
    res.status(400).json({
      data: null,
      error: 'Ride is full'
    });
    return;
  } else if (ride.status !== RideStatus.PENDING) {
    res.status(400).json({
      data: null,
      error: 'Ride is already ' + ride.status.toLowerCase()
    });

    return;
  }
  else if (ride.receivedInvites.length > 0) {
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

  const payload = JSON.stringify({
    title: "New Ride Invite",
    body: `${user.name} has sent you a ride request.`,
    icon: "/icons/logo.png",
      badge: "/icons/logo.png",

  });
  sendNotification([ride.ownerId], payload);



  // Send notification to the ride owner
  await prisma.notification.create({
    data: {
      receiverId: ride.ownerId,
      message: `${user.name} has sent you a ride request.`
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
        }
      },
      receiverRide: true
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
      participants: true,
      owner: {
        select: {
          name: true,
          id: true
        }
      }
    }
  })
  if (ride) {
    console.log(ride.participants.length);
    console.log(ride.peopleCount);
  }
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
  } else if (ride.peopleCount <= ride.participants.length) {
    res.status(400).json({
      data: null,
      error: 'Ride is already full'
    });
    return;
  } else if (ride.status !== RideStatus.PENDING) {
    res.status(400).json({
      data: null,
      error: 'Ride is already ' + ride.status.toLowerCase()
    });

    return;
  }
let notifyParticipantsIds: string[] = [];
  await prisma.$transaction(async tx => {
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
      data: [
        ...ride.participants.map(p => ({
          receiverId: p.id,
          message: `${invite.sender.name} joined the ride by ${ride.owner.name}`,
        })),
        {
          receiverId: invite.sender.id,
          message: `Your invite to the ride by ${ride.owner.name} was accepted`,
        },
        {
          receiverId: ride.owner.id,
          message: `You accepted ${invite.sender.name}'s request to join your ride.`,
        },
      ],
    });

  notifyParticipantsIds = ride.participants
  .map(p => p.id)
  .filter(id => id !== ride.owner.id);
   

  })
   sendNotification(notifyParticipantsIds, JSON.stringify({
      title: "Invite Accepted 🎉",
      body: `${invite.sender.name} joined the ride by ${ride.owner.name}`,
      url: `/requests`,
      icon: "/icons/logo.png",
      badge: "/icons/logo.png",
    }));
    sendNotification([invite.sender.id], JSON.stringify({
      title: "Invite Accepted 🎉",
      body: `Your invite to the ride by ${ride.owner.name} was accepted`,
      url: `/requests`,
      icon: "/icons/logo.png",
      badge: "/icons/logo.png",
    }));
  

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
      } else if (reason.length < 2) {
        res.status(400).json({
          data: null,
          error: 'Reason must be at least 2 characters long'
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
let notifyUserIds: string[] = [];
      const invite = await prisma.invite.findFirst({
        where: {
          id: inviteId
        },
        include: {
          sender: true,
          receiverRide: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true
                }
              },
              participants: {
                select: {
                  id: true
                }
              }
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
      }

      const ride = invite.receiverRide

      if (invite.senderId !== userId && ride.owner.id !== userId) {
        res.status(400).json({
          data: null,
          error: 'You cannot decline this invite'
        });

        return;
      } else if (ride.status !== RideStatus.PENDING) {
        res.status(400).json({
          data: null,
          error: 'Ride is already ' + ride.status.toLowerCase()
        });

        return
      }

      const isSender = invite.senderId === userId

      await prisma.$transaction(async tx => {
        await tx.invite.update({
          where: {
            id: invite.id
          },
          data: {
            declineReason: (isSender ? "Left: " : "") + reason,
            status: InviteStatus.DECLINED
          }
        })

        if (invite.receiverRide.participants.map(u => u.id).includes(invite.senderId)) {
          //if the ride owner is removing the user from the ride, then remove the currentRideId from the user 
          await tx.user.update({
            where: {
              id: invite.senderId
            },
            data: {
              activeRides: {
                disconnect: {
                  id: invite.receiverRideId
                }
              }
            }
          })
          notifyUserIds = [
            ...invite.receiverRide.participants.map(p => p.id),
            invite.sender.id,
            invite.receiverRide.owner.id,
          ];
        }

        if (isSender) {
          await tx.notification.create({
            data: {
              receiverId: invite.receiverRide.owner.id,
              message: `${invite.sender.name} left your ride. Reason: ${reason}`
            }
          })
        } else {
          await tx.notification.create({
            data: {
              receiverId: invite.senderId,
              message: `Your invite to the ride by ${ride.owner.name} was declined. Reason: ${reason}`
            }
          })
        }
      })

      res.json({
        data: null,
        error: null
      });
      let participantsIds: string[] = [];
      participantsIds = ride.participants
      .map(p => p.id)
      .filter(id => id !== ride.owner.id);
      notifyUserIds = participantsIds;
      if (!isSender) {
        if(notifyUserIds.includes(invite.sender.id) === false){
          notifyUserIds.push(invite.sender.id);
          sendNotification(notifyUserIds, JSON.stringify({
            title: "Invite Declined ❌",
            body: `Your invite to the ride by ${ride.owner.name} was declined. Reason: ${reason}`,
            url: `/requests`,
            icon: "/icons/logo.png",
      badge: "/icons/logo.png",
          }));
        }
        else{
          sendNotification([invite.sender.id], JSON.stringify({
            title: "Removed from the Ride 😔",
            body: `You were removed from the ride by ${ride.owner.name}. Reason: ${reason}`,
            url: `/requests`,
            icon: "/icons/logo.png",
      badge: "/icons/logo.png",
          }));
        }

      }else{
        notifyUserIds = notifyUserIds.filter(id => id !== invite.sender.id);
        notifyUserIds.push(ride.owner.id);
 sendNotification(notifyUserIds, JSON.stringify({
        title: "Left Ride ❌",
        body: `${invite.sender.name} left your ride. Reason: ${reason}`,
        url: `/requests`,
        icon: "/icons/logo.png",
      badge: "/icons/logo.png",
      }));
      }
     
    }
  

