import { configDotenv } from "dotenv";
configDotenv();
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const KLimit = 20;

const EAPI = process.env.EAPI;
const SERVER_PORT = process.env.SERVER_PORT;

const JWT_TIMEOUT = process.env.JWT_TIMEOUT;
const JWT_REFRECH_TIMEOUT = process.env.JWT_REFRECH_TIMEOUT;

const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const CLOUDINARY_NAME = process.env.CLOUDINARY_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
// S3
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const ASW_REGION = process.env.ASW_REGION;

export {
  KLimit,
  EAPI,
  SERVER_PORT,
  SECRET_KEY,
  REFRESH_TOKEN,
  JWT_TIMEOUT,
  JWT_REFRECH_TIMEOUT,
  CLOUDINARY_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  ASW_REGION,
};
