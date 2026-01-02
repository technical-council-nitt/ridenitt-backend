import { User as PrismaUser } from "@prisma/client";

declare global {
  interface Payload {
    userId: string;
    iss: "RideNITT";
    iat?: number;
    exp?: number;
  }

  namespace Express {
    // 👇 THIS is what Passport uses
    interface User extends Pick<PrismaUser, "id"> {}

    // Optional: if you also attach userId manually
    interface Request {
      userId?: string;
    }
  }
}

export {};