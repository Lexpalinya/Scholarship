import s3 from "../config/aws.s3.js";
import sharp from "sharp";
export const S3Upload = ({ name, data }, oldFile) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (oldFile) {
        const deleteParams = {
          Bucket: "saiyfonbroker",
          Key: "images/" + oldFile,
        };
        console.log("Delete params :>> ", deleteParams);

        await s3.deleteObject(deleteParams).promise();
      }

      // Convert image to WebP
      const webpBuffer = await sharp(data).toFormat("webp").toBuffer();

      const timeid = Date.now().toString().slice(-10);
      const filenamekey = timeid + "-" + name.replace(/\.[^/.]+$/, ".webp"); // Replace extension with .webp
      const uploadParams = {
        Bucket: "saiyfonbroker",
        Key: "images/" + filenamekey,
        Body: webpBuffer,
        ContentType: "image/webp", // Set the content type to 'image/webp'
      };

      let result = await s3.upload(uploadParams).promise();
      result = result.Key.split("/")[1];
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

export const S3UploadFile = ({ name, data }, oldFile) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (oldFile) {
        const deleteParams = {
          Bucket: "saiyfonbroker",
          Key: "pdfs/" + oldFile,
        };

        await s3.deleteObject(deleteParams).promise();
        // console.log("a :>> ", a);
      }

      const timeid = Date.now().toString().slice(-10);
      const filenamekey = timeid + "-" + name;
      const uploadParams = {
        Bucket: "saiyfonbroker",
        Key: "pdfs/" + filenamekey, // Changed the folder to 'pdfs'
        Body: data,
        ContentType: "application/pdf", // Set the content type to 'application/pdf'
      };
      let result = await s3.upload(uploadParams).promise();
      result = result.Key.split("/")[1];
      console.log("result :>> ", result);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};