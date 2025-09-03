import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import { prisma } from './prisma';
import { Client } from "pg";
import { sendNotification } from "./services/notifications.service";

const router = require("./router")

config({
  path: ".env"
})

const app = express()

app.use(
  cors({
    origin: [
      "https://ridenittfrontend-298477500939.asia-southeast1.run.app",
      "http://localhost:5173"
    ],
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);


app.use(express.json())
app.use(cookieParser())

app.use(router)

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

pgClient.connect()
  .then(() => pgClient.query("LISTEN new_notification"))
  .catch(err => console.error("Postgres connection error:", err));

pgClient.on("notification", async (msg) => {
  try {
    if (!msg.payload) return;

    // Expected payload format: "notificationId:receiverId:message"
    const [notificationId, receiverId, message] = msg.payload.split(":");

    // Fetch all subscriptions for this user
    const subs = await prisma.subscription.findMany({
      where: { userId: receiverId },
    });

    // Send push notifications
    await Promise.all(
      subs.map((sub:any) =>
        sendNotification(sub, {
          title: "RideNITT",
          body: message,
          icon: "/logo.png",
          url: "https://ridenitt.in",
        })
      )
    );
  } catch (err) {
    console.error("Failed to process notification:", err);
  }
});




export default app