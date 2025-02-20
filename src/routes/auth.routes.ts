import { Router } from "express";
import { afterOAuthLogin, googleAuth, googleAuthCallback, logout } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.delete("/logout", logout)

authRouter.get("/google", googleAuth)

authRouter.get("/callback", googleAuthCallback, afterOAuthLogin);

export default authRouter;