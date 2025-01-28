import { Router } from "express";
import { getUser, updateUser } from "../controllers/users.controller";

const usersRouter = Router();

usersRouter.get("/me", getUser)

usersRouter.post("/me", updateUser)

export default usersRouter;