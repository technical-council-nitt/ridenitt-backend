import { Request, Response, NextFunction } from "express";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${res.status} ${req.method} ${req.path}`);
  next();
}