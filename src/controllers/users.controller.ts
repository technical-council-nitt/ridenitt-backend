import { Request, Response } from 'express';
import { prisma } from '../prisma';
import bcrypt from 'bcrypt';

export const getUser = async (req: Request, res: Response) => {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  res.json({
    data: user,
    error: null
  });
}

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name, gender, address, password, confirmPassword } = req.body;

  if (!name || !gender || !address || !password || !confirmPassword || typeof name !== 'string' || typeof gender !== 'string' || typeof address !== 'string' || typeof password !== 'string' || typeof confirmPassword !== 'string') {
    res.status(400).json({
      data: null,
      error: "Invalid Body"
    })

    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({
      data: null,
      error: "Password and Confirm Password do not match"
    })

    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      name,
      gender: gender.toUpperCase() as any, //MALE or FEMALE
      address,
      password: hashedPassword
    }
  });

  res.json({
    data: null,
    error: null
  });
}