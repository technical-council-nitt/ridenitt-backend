import { Router } from "express";
import { getNotifications,postNotifications,deleteNotifications } from "../controllers/notifications.controller";

const notifsRouter = Router();

notifsRouter.get("/", getNotifications)
notifsRouter.post("/", postNotifications)
notifsRouter.delete("/", deleteNotifications);

export default notifsRouter;