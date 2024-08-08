import cloudinary from "../config/cloudinary.js";

export const UploadImage = async (img, oldImg) => {
  return new Promise(async (resolve, reject) => {
    try {
      ///--------------------- cloudinary -------------
      if (oldImg) {
        const spliturl = oldImg.split("/");
        const img_id = spliturl[spliturl.length - 1].split(".")[0];
        await cloudinary.uploader.destroy(img_id);
      }

      const base64 = img.toString("base64");
      const imgPath = `data:image/webp;base64,${base64}`;
      const cloudinaryUpload = await cloudinary.uploader.upload(imgPath, {
        public_id: `IMG_${Date.now()}`,
        resource_type: "auto",
        format: "webp",
      });

      return resolve(cloudinaryUpload.url);
    } catch (err) {
      console.log("upload image error ", err);
      reject(err);
    }
  });
};
