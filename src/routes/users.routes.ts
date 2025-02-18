import { Router } from "express";
import { getUser, updatePh, updateUser } from "../controllers/users.controller";

const usersRouter = Router();

usersRouter.get("/me", getUser)

usersRouter.post("/me", updateUser)

usersRouter.post("/update-phone-number", updatePh)


export default usersRouter;