import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getUser = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    omit: {
      passwordHash: true
    }
  });

  res.json({
    data: user,
    error: null
  });
}

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name, gender, address } = req.body;

  if (!name || !gender || typeof name !== 'string' || typeof gender !== 'string' || typeof address !== 'string') {
    res.status(400).json({
      data: null,
      error: "Invalid Body"
    })

    return;
  }

  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      name,
      gender: gender.toUpperCase() as any, //MALE or FEMALE
      address
    }
  });

  res.json({
    data: null,
    error: null
  });
}