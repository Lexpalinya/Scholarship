import pkg from "aws-sdk";
import {
  ASW_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} from "./config.api.js";

const { S3 } = pkg;

const s3 = new S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: ASW_REGION,
});

export default s3;