import { Router } from "express";
import { cancelRide, completeRide, createRide, getRides } from "../controllers/rides.controller";

const ridesRouter = Router();

ridesRouter.get('/', getRides)
ridesRouter.post('/', createRide)
ridesRouter.delete('/:rideId', cancelRide)
ridesRouter.post('/:rideId', completeRide)

export default ridesRouter;