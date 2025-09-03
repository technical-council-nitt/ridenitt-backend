import { Router } from "express";
import { subscribe, getNotifications } from "../controllers/notifications.controller";

const notifsRouter = Router();

notifsRouter.post("/subscribe", subscribe);

notifsRouter.get("/", getNotifications)

export default notifsRouter;