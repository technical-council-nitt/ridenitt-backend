import { Router } from "express";
import { cancelRide, createRide, getCurrentRide, getRides } from "../controllers/rides.controller";

const ridesRouter = Router();

ridesRouter.get('/', getRides)
ridesRouter.post('/', createRide)
ridesRouter.get("/current", getCurrentRide)
ridesRouter.delete('/current', cancelRide)

export default ridesRouter;