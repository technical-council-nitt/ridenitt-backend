import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import router from "./router";

config()

const app = express();
const port = process.env.PORT ?? 3000;

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.use(router)

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`)
})