import { jwtVerify, SignJWT } from 'jose';

export const createAccessToken = async (userId: string) => {
  const secretKey = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET!);

  const payload : Payload = {
    userId,
    iss: 'RideNITT'
  }

  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey);

  return token;
}

export const createRefreshToken = async (userId: string) => {
  const secretKey = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET!);

  const payload : Payload = {
    userId,
    iss: 'RideNITT'
  }

  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('28d')
    .sign(secretKey);

  return token;
}

export const verifyAccessToken = async (token: string) => {
  const secret = process.env.ACCESS_TOKEN_SECRET!;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret)) as any;

    return payload as Payload;
  } catch (e) {
    return null;
  }
}

export const verifyRefreshToken = async (token: string) => {
  const secret = process.env.REFRESH_TOKEN_SECRET!;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret)) as any;

    return payload as Payload;
  } catch (e) {
    return null;
  }
}