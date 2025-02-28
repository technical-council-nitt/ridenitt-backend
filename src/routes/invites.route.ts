import { Router } from "express";
import { acceptInvite, declineInvite, getInvites, sendInvite } from "../controllers/invites.controller";

const invitesRouter = Router();

invitesRouter.get('/', getInvites)
invitesRouter.post('/', sendInvite)
invitesRouter.post('/:inviteId/accept', acceptInvite)
invitesRouter.post('/:inviteId/decline', declineInvite)

export default invitesRouter;