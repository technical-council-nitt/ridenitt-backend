import { Router } from "express";
import { getSuggestions } from "../controllers/suggestions.controller";

const suggestionsRouter = Router();

suggestionsRouter.get("/", getSuggestions)

export default suggestionsRouter;