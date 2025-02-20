import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import router from "./router";

config({
  path: ".env.local"
})

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.use(router)

export default app