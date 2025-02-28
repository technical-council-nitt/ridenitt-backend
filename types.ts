import { User } from '@prisma/client';

declare global {
  interface Payload {
    userId: string;
    iss: "RideNITT";
    iat?: number;
    exp?: number;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}