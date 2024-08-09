import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findAboutByid,
} from "../services/find.js";
import {
  CheckUniqueElement,
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
import { UploadImage } from "../services/uploadImage.js";
import prisma from "../util/prismaClient.js";
let key = "abouts-scholarship";
let model = "about";
let select;
const AboutConttroller = {
  async Insert(req, res) {
    try {
      const data = req.files;
      if (!data || !data.images) {
        return SendError(res, 400, `${EMessage.pleaseInput}:images`);
      }

      let uploadPromises = [];

      if (Array.isArray(data.images) && data.images.length > 0) {
        // Handle multiple images
        uploadPromises = data.images.map((image) =>
          UploadImage(image.data).then((url) => {
            if (!url) {
              throw new Error("Upload Image failed");
            }
            return url;
          })
        );
      } else {
        // Handle single image
        uploadPromises = [
          UploadImage(data.images.data).then((url) => {
            if (!url) {
              throw new Error("Upload Image failed");
            }
            return url;
          }),
        ];
      }

      // Wait for all image uploads to complete
      const images_url_List = await Promise.all(uploadPromises);

      // console.log("images_url_list :>> ", images_url_List);

      // Insert the data into the database
      const about = await prisma.about.create({
        data: {
          images: images_url_List,
        },
        select,
      });

      // Cache and insert data
      CacheAndInsertData(key, model, about, select);

      // Send success response
      return SendCreate(res, EMessage.insertSuccess, about);
    } catch (error) {
      // Send error response
      return SendErrorCatch(res, `${EMessage.insertFailed} about`, error);
    }
  },
  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = req.files;
      let { oldImages } = req.body;
      if (!oldImages) {
        return SendError(res, 400, `${EMessage.pleaseInput}: oldImages`);
      }
      oldImages = oldImages.split(",");
      if (oldImages.length === 0) {
        return SendError(res, 400, `${EMessage.pleaseInput}: oldImages`);
      }
      if (!data || !data.images) {
        return SendError(res, 400, `${EMessage.pleaseInput}: images`);
      }

      const dataImagesToList = !data.images.length
        ? [data.images]
        : data.images;
      if (dataImagesToList.length !== oldImages.length) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: The number of provided docImage files does not match the existing records. Please ensure you have uploaded the correct number of images.`
        );
      }
      const aboutExists = await findAboutByid(id);
      if (!aboutExists) {
        return SendError(res, 404, `${EMessage.notFound} about with id:${id}`);
      }

      const OldImageList = aboutExists.images;
      let images_url_List = CheckUniqueElement(OldImageList, oldImages);
      const ImagesPromises = dataImagesToList.map((img, i) =>
        UploadImage(img.data, oldImages[i]).then((url) => {
          if (!url) {
            throw new Error("Upload Image failed");
          }
          return url;
        })
      );
      const images_url_list = await Promise.all(ImagesPromises);
      images_url_List = images_url_List.concat(images_url_list);
      const about = await prisma.about.update({
        where: { id },
        data: {
          images: images_url_List,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess} `, about);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed} category`, error);
    }
  },

  async Delete(req, res) {
    try {
      const id = req.params.id;
      const aboutExists = await findAboutByid(id);

      if (!aboutExists) {
        return SendError(res, 404, `${EMessage.notFound} about with id:${id}`);
      }

      const about = await prisma.about.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.deleteSuccess} `, about);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed} category`, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const about = await CacheAndRetriveUpdateData(key, model, select);
      SendSuccess(res, `${EMessage.fetchAllSuccess} about`, about);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.errorFetchingAll} category`,
        error
      );
    }
  },
  async SelectOne(req, res) {
    try {
      const id = req.params.id;
      const about = await findAboutByid(id);

      if (!about) {
        return SendError(res, 404, `${EMessage.notFound} about with id:${id}`);
      }
      SendSuccess(res, `${EMessage.fetchOneSuccess} about`, about);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.errorFetchingOne} category`,
        error
      );
    }
  },
};
export default AboutConttroller;
