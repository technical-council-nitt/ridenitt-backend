import { NextFunction, Request, Response } from "express";
import { createAccessToken, verifyAccessToken, verifyRefreshToken } from '../services/auth.service';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.cookies["access-token"];
  const refreshToken = req.cookies["refresh-token"];

  if (!accessToken || !refreshToken) {
    res.status(401).json({
      error: "Please login.",
      data: null
    });

    return;
  }

  let payload = await verifyAccessToken(accessToken);
  
  if (!payload) {
    payload = await verifyRefreshToken(refreshToken);

    if (!payload) {
      res.status(401).json({
        error: "Please login",
        data: null
      });

      return;
    }

    const newAccessToken = createAccessToken(payload.userId);

    res.cookie("access-token", newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 1000 * 60 * 60)
    });
  }

  req.userId = payload.userId;

  next();
};