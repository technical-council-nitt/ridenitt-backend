import { Router } from "express";
import { autoComplete } from "../controllers/geocoding.controller";

const geocodingRouter = Router();

geocodingRouter.get("/", autoComplete);

export default geocodingRouter;