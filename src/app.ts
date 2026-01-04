import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import router from "./router";
import "./services/push.service"

config({
  path: ".env.local"
})

const app = express()

const FRONTEND_URL = process.env.FRONTEND_URL || "https://ridenittfrontend-298477500939.asia-southeast1.run.app"

app.use(helmet())
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

app.use(router)

export default app
