import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
import { UploadImage } from "../services/uploadImage.js";
import prisma from "../util/prismaClient.js";
let key = "coverImage";
const CoverImageController = {
  async Insert(req, res) {
    try {
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}:image is required`);
      }
      const image = await UploadImage(data.image.data);
      if (!image) {
        throw new Error("Upload Image failed");
      }
      const coverImage = await prisma.coverImage.create({
        data: { image },
      });
      await redis.del(key);
      await redis.set(key, JSON.stringify([coverImage]), "EX", 3600);
      return SendCreate(res, `${EMessage.insertSuccess}`, coverImage);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} insert coverImage`,
        error
      );
    }
  },
  async Delete(req, res) {
    try {
      const id = parseInt(req.params.id);

      const coverImageExists = await prisma.coverImage.findUnique({
        where: { id },
      });
      if (!coverImageExists)
        return SendError(res, 404, `${EMessage.notFound}:coverImage id`);
      const coverImage = await prisma.coverImage.delete({
        where: { id },
      });
      await redis.del(key);

      return SendSuccess(res, `${EMessage.deleteSuccess}`, coverImage);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} delete coverImage`,
        error
      );
    }
  },
  async UpdateImage(req, res) {
    try {
      const id = parseInt(req.params.id);
      const { oldImage } = req.body;
      if (!oldImage) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}:oldImage is required`
        );
      }
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}:image is required`);
      }
      const image = await UploadImage(data.image.data, oldImage);
      if (!image) {
        throw new Error("Upload Image failed");
      }
      const coverImageExists = await prisma.coverImage.findUnique({
        where: { id },
      });
      if (!coverImageExists)
        return SendError(res, 404, `${EMessage.notFound}:coverImage id`);

      const coverImage = await prisma.coverImage.update({
        where: { id },
        data: {
          image,
        },
      });
      await redis.del(key);
      await redis.set(key, JSON.stringify([coverImage]), "EX", 3600);
      return SendSuccess(res, `${EMessage.updateSuccess}`, coverImage);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} update coverImage`,
        error
      );
    }
  },
  async SelectAll(req, res) {
    try {
      const cachData = await redis.get(key);
      //   console.log("cachData :>> ", JSON.parse(cachData));
      let company;
      if (!cachData) {
        company = await prisma.coverImage.findMany({});
        await redis.set(key, JSON.stringify(company));
      } else {
        company = JSON.parse(cachData);
      }
      SendSuccess(res, `${EMessage.fetchAllSuccess}`, company);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} insert company`,
        error
      );
    }
  },
};
export default CoverImageController;
