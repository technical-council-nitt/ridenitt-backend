import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { twilioClient } from './twilioClient';

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

export const updatePh = async (req: Request, res: Response) => {
  const userId = req.userId!;

  if (!userId) {
    res.status(401).json({
      data: null,
      error: 'Please Login'
    });

    return;
  }

  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber)) {
      res.status(400).json({
        data: null,
        error: 'Invalid phone number'
      });

      return;
    } else if (!otp || otp.length !== 6) {
      res.status(400).json({
        data: null,
        error: 'Invalid OTP'
      });

      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      res.status(404).json({
        data: null,
        error: 'User not found'
      });

      return;
    }

    const verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID!)
      .verificationChecks
      .create({
        to: phoneNumber,
        code: otp
      })

    if (verificationCheck.status !== 'approved') {
      res.status(404).json({
        data: null,
        error: 'Invalid OTP'
      });

      return;
    }

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        phoneNumber
      }
    })

    res.json({
      data: null,
      error: null
    })
  } catch (e) {
    console.error(e);

    res.status(500).json({
      data: null,
      error: 'Failed to update phone'
    })
  }
}
