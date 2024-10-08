import { Redis } from "ioredis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../config/config.api.js";

const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
});

// export default redis;

// import { createClient } from "redis";

// const redis = createClient({
//   url: "redis://default:0lvWSyqeKEp4Hlub9Z93rrEXbzQSsFk4@redis-18776.c1.ap-southeast-1-1.ec2.redns.redis-cloud.com:18776",
// });
// redis.on("error", (err) => {
//   console.error("Redis error:", err);
// });

// export const connectRedis = async () => {
//   try {
//     await redis.connect();
//     console.log("Connected to Redis successfully");
//   } catch (err) {
//     console.error("Failed to connect to Redis:", err);
//   }
// };
// connectRedis();

export default redis;
