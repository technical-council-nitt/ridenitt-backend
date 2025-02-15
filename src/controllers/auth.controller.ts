import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createAccessToken, createRefreshToken } from '../services/auth.service';
import twilio from "twilio"
import bcrypt from 'bcryptjs';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!, {
  logLevel: process.env.NODE_ENV === 'production' ? undefined : 'debug'
});

//TODO: Replace phone number otp instead of email password login method
export const login = async (req: Request, res: Response) => {
  const { name, password } = req.body;

  if (!name || !password) {
    res.status(400).json({
      data: null,
      error: 'Please provide name and password'
    });

    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      name
    }
  })

  if (!user || !bcrypt.compareSync(password, user.passwordHash!)) {
    res.status(404).json({
      data: null,
      error: 'Invalid name or password'
    });

    return;
  }

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

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('access-token');
  res.clearCookie('refresh-token');

  res.json({
    data: null,
    error: null
  })
}

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
    await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID!)
      .verifications
      .create({
        to: phoneNumber,
        channel: "sms"
      })

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
  try {

    const isReset = (req.query.reset as string) === "true";

    const { phoneNumber, otp: givenOtp, name, password, gender } = req.body;

    if (!password || password.length < 8) {
      res.status(400).json({
        data: null,
        error: 'Password must be atleast 8 characters long'
      });

      return;
    }
    const passwordHash = bcrypt.hashSync(password, 10);

    if (!phoneNumber || !/^\+91\d{10}$/.test(phoneNumber)) {
      res.status(400).json({
        data: null,
        error: 'Invalid phone number'
      });

      return
    }

    if (
      !givenOtp
      || givenOtp.length !== 6
    ) {
      res.status(400).json({
        data: null,
        error: 'Invalid otp'
      });

      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        name,
        phoneNumber
      }
    })

    if (isReset) {
      if (!user) {
        res.status(404).json({
          data: null,
          error: 'User not found'
        })

        return
      }

      const verificationCheck = await twilioClient.verify.v2
        .services(process.env.TWILIO_SERVICE_SID!)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: givenOtp
        })

      if (verificationCheck.status !== 'approved') {
        res.status(404).json({
          data: null,
          error: 'Wrong OTP'
        })

        return
      }

      const data = {
        passwordHash
      }

      await prisma.user.update({
        where: {
          name,
          phoneNumber
        },
        data
      })

      res.json({
        data: null,
        error: null
      })
    } else {
      if (user) {
        res.status(400).json({
          data: null,
          error: 'Email already exists'
        })

        return
      }

      if (!gender) {
        res.status(400).json({
          data: null,
          error: "Please provide gender"
        })

        return
      }

      const verificationCheck = await twilioClient.verify.v2
        .services(process.env.TWILIO_SERVICE_SID!)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: givenOtp
        })

      if (verificationCheck.status !== 'approved') {
        res.status(404).json({
          data: null,
          error: 'Wrong OTP'
        })

        return
      }

      const data = {
        gender: gender.toUpperCase(),
        name,
        phoneNumber,
        passwordHash: bcrypt.hashSync(password, 10)
      }

      const newUser = await prisma.user.upsert({
        where: {
          name,
        },
        update: data,
        create: data
      })

      const accessToken = await createAccessToken(newUser.id);
      const refreshToken = await createRefreshToken(newUser.id);

      res.cookie('access-token', accessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production' ? false : true,
        expires: new Date(Date.now() + 1000 * 60 * 60)
      })

      res.cookie('refresh-token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? false : true,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      })

      res.json({
        data: null,
        error: null
      })
    }
  } catch (e: any) {
    if (e.status === 404) {
      res.status(404).json({
        data: null,
        error: 'Invalid OTP'
      })
      
      return
    }

    console.log(e)

    res.status(500).json({
      data: null,
      error: 'Failed to verify OTP'
    })
  }
}