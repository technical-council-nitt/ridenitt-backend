import { Request, Response } from "express";
import { createAccessToken, createRefreshToken } from "../services/auth.service";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "@prisma/client";
import { prisma } from "../prisma";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_OAUTH_REDIRECT_URI!
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails![0].value;
      const name = profile.displayName
  
      const user = await prisma.user.upsert({
        where: {
          email
        },
        create: {
          email, name
        },
        update: {}
      });

      done(null, user)
    }
  )
);

export const googleAuth = passport.authenticate("google", {
  session: false,
  scope: ["profile", "email"]
});

export const googleAuthCallback = passport.authenticate('google', {
  session: false,
  failureRedirect: '/login'
});

export const afterOAuthLogin = async (req: Request, res: Response) => {
  const user = req.user as User;

  if (!user) {
    res.redirect("/login");
    return;
  }
  
  const refreshToken = await createRefreshToken(user.id);
  const accessToken = await createAccessToken(user.id);

  res.cookie("refresh-token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + 1000*60*60*24*28)
  });

  res.cookie("access-token", accessToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + 1000*60*60)
  });

  if (user.gender && user.phoneNumber) {
    res.redirect("http://34.93.97.93:5173/");
  } else {
    res.redirect("http://34.93.97.93:5173/sign-up")
  }
}

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('access-token');
  res.clearCookie('refresh-token');

  res.json({
    data: null,
    error: null
  })
}
