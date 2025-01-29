import { Router } from "express";
import { getNotifications } from "../controllers/notifications.controller";

const notifsRouter = Router();

notifsRouter.get("/", getNotifications)

export default notifsRouter;