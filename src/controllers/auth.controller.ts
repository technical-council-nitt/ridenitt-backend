import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createAccessToken, createRefreshToken } from '../services/auth.service';
import twilio from "twilio"

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!, {
  logLevel: process.env.NODE_ENV === 'production' ? undefined : 'debug'
});

export const sendOtp = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body

  if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber)) {
    res.status(400).json({
      data: null,
      error: 'Please provide an Indian phone number with country code'
    });

    return;
  }

  try {
    const status = await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID!)
      .verifications
      .create({
        to: phoneNumber,
        channel: "sms"
      })

    console.log(status)

    res.json({
      data: null,
      error: null
    })
  } catch (e) {
    console.error(e);

    res.status(500).json({
      data: null,
      error: 'Failed to send OTP'
    })
  }
}

export const verifyOtp = async (req: Request, res: Response) => {
  const { phoneNumber, otp: givenOtp } = req.body;

  if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber) || !givenOtp || givenOtp.length !== 6) {
    res.status(400).json({
      data: null,
      error: 'Invalid body'
    });

    return;
  }

  const verificationCheck = await twilioClient.verify.v2
    .services(process.env.TWILIO_SERVICE_SID!)
    .verificationChecks
    .create({
      to: phoneNumber,
      code: givenOtp
    })

  console.log(verificationCheck)

  if (verificationCheck.status !== 'approved') {
    res.status(404).json({
      data: null,
      error: 'Wrong OTP'
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