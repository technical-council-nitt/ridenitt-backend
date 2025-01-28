import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createAccessToken, createRefreshToken } from '../services/auth.service';

export const sendOtp = async (req: Request, res: Response) => {
  const phoneNumber = req.body

  if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber)) {
    res.status(400).json({
      data: null,
      error: 'Please provide an Indian phone number with country code'
    });

    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  await prisma.otp.upsert({
    where: {
      phoneNumber
    },
    create: {
      code: otp.toString(),
      phoneNumber,
      createdAt: new Date()
    },
    update: {
      code: otp.toString(),
      createdAt: new Date()
    }
  });

  res.json({
    data: null,
    error: null
  })
}

export const verifyOtp = async (req: Request, res: Response) => {
  const { phoneNumber, otp: givenOtp } = req.body;

  const otp = await prisma.otp.findUnique({
    where: {
      phoneNumber
    }
  })

  if (!otp || otp.code !== givenOtp) {
    res.status(404).json({
      data: null,
      error: 'Wrong OTP'
    })

    return
  } else if (otp.createdAt.getTime() + 5 * 60 * 1000 < Date.now()) {
    res.status(404).json({
      data: null,
      error: 'OTP expired'
    })

    return
  }

  const user = await prisma.user.upsert({
    where: {
      phoneNumber
    },
    update: {},
    create: {
      phoneNumber
    }
  })

  const accessToken = await createAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);

  res.cookie('access-token', accessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production' ? false : true,
  })

  res.cookie('refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? false : true,
  })

  res.json({
    data: null,
    error: null
  })
}