import { Router } from "express";
import { login, logout, sendOtp, verifyOtp } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/send-otp", sendOtp)

authRouter.post("/verify-otp", verifyOtp)

authRouter.post("/login", login)

authRouter.delete("/logout", logout)

export default authRouter;