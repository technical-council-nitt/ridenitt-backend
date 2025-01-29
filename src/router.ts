import { Router } from "express";
import authRouter from "./routes/auth.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import usersRouter from "./routes/users.routes";
import ridesRouter from "./routes/rides.route";
import invitesRouter from "./routes/invites.route";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import suggestionsRouter from "./routes/suggestions.route";
import geocodingRouter from "./routes/geocoding.routes";
import notifsRouter from "./routes/notifications.controller";

const router = Router()

router.use(loggerMiddleware)

router.get("/", (_, res) => {
  res.send("Hello World!")
})

router.use("/auth", authRouter)

router.use(authMiddleware)

router.use("/api/users", usersRouter)

router.use("/api/autocomplete", geocodingRouter)

router.use("/api/rides", ridesRouter)

router.use("/api/invites", invitesRouter)

router.use("/api/suggestions", suggestionsRouter)

router.use("/api/notifications", notifsRouter)

export default router;