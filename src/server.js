import express from "express";
import morgan from "morgan";
import cors from "cors";
import fileUpload from "express-fileupload";
import APIRouter from "./router/index.router.js";

import { EAPI, SERVER_PORT } from "./config/config.api.js";
import prisma from "./util/prismaClient.js";
import redis from "./DB/redis.js";

// Redis event listeners

const app = express();

// Middleware
app.use(express.json({ limit: "500mb" }));
app.use(
  express.urlencoded({ extended: false, limit: "500mb", parameterLimit: 500 })
);
app.use(fileUpload());
app.use(morgan("dev"));

// CORS Headers
// app.all("/*", (req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Content-Type, Accept, Access-Token, X-Requested-With"
//   );
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   next();
// });

app.use(
  cors({
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Access-Token",
      "Accept",
    ],
  })
);
// API Router
app.use(EAPI, APIRouter);

// Check Database Connection
const checkDatabaseConnection = async () => {
  try {
    await prisma.$connect();
    console.log("Prisma Connected to the DATABASE Success: OK");
  } catch (err) {
    console.error("Error Connecting to DATABASE Fail:", err);

    setTimeout(async () => {
      console.log("Attempting to reconnect Database");
      await checkDatabaseConnection();
    }, 60000);
  }
};

redis.on("connect", () => {
  console.log(`Redis Connected`);
});

redis.on("error", (err) => {
  console.log(`Redis connection error: ${err}`);
});
// const connectRedis = async () => {
//   try {

//     await redis.connect();
//     console.log("connected to Redis successfully");
//   } catch (error) {
//     console.error("Failed to connect to Redis:", error);
//   }
// };

// await redis.del("users-scholarship");

// const user = await redis.get("users");
// console.log('user :>> ', user);
// Start Server

app.listen(SERVER_PORT, async () => {
  console.log(`Server is listening on http://localhost:${SERVER_PORT}`);
  console.log(`Server Already: ${SERVER_PORT}`);
  checkDatabaseConnection();
});
