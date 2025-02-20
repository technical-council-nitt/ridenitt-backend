import { Router } from "express";
import { afterOAuthLogin, googleAuth, googleAuthCallback, login, logout, sendOtp, signOut, verifyOtp } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/send-otp", sendOtp)

authRouter.post("/verify-otp", verifyOtp)

authRouter.post("/login", login)

authRouter.delete("/logout", logout)

authRouter.get("/google", googleAuth)

authRouter.get("/callback", googleAuthCallback, afterOAuthLogin);

authRouter.get("/signout", signOut);

export default authRouter;