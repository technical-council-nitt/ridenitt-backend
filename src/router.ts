import { Router } from "express";
import authRouter from "./routes/auth.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import usersRouter from "./routes/users.routes";
import ridesRouter from "./routes/rides.route";
import invitesRouter from "./routes/invites.route";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import suggestionsRouter from "./routes/suggestions.route";

const router = Router()

router.get("/", (_, res) => {
  res.send("Hello World!")
})

router.use("/auth", authRouter)

router.use(authMiddleware)

router.use("/users", usersRouter)

router.use("/rides", ridesRouter)

router.use("/invites", invitesRouter)

router.use("/suggestions", suggestionsRouter)

router.use(loggerMiddleware)

export default router;