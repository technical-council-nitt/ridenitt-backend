import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getUser = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      activeRides: {
        where: {
          status: 'PENDING'
        },
        select: {
          id: true
        }
      }
    }
  });

  if (!user) {
    res.status(404).json({
      data: null,
      error: 'User not found'
    });

    return;
  }

  res.json({
    data: {
      ...user,
      activeRides: user.activeRides.map(r => r.id)
    },
    error: null
  });
}

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name, gender, phoneNumber } = req.body;

  if (!name || !gender || !phoneNumber || typeof name !== 'string' || typeof gender !== 'string' || typeof phoneNumber !== 'string') {
    res.status(400).json({
      data: null,
      error: "Invalid Body"
    })

    return;
  } else if (!/^\+91\d{10}$/.test(phoneNumber)) {
    res.status(400).json({
      data: null,
      error: "Invalid phone number"
    })

    return
  }

  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      name,
      gender: gender.toUpperCase() as any, //MALE or FEMALE
      phoneNumber
    }
  });

  res.json({
    data: null,
    error: null
  });
}