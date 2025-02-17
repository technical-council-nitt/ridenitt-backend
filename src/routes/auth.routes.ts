import { Router } from "express";
import { login, logout, sendOtp, updatePh, verifyOtp } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/send-otp", sendOtp)

authRouter.post("/verify-otp", verifyOtp)

authRouter.post("/update-phone-number", updatePh)

authRouter.post("/login", login)

authRouter.delete("/logout", logout)

export default authRouter;