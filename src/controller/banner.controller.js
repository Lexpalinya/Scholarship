import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findBannerById,
  findServicesById,
} from "../services/find.js";
import {
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
import { UploadImage } from "../services/uploadImage.js";
import { DataExist, ValidateBanner } from "../services/validate.js";
import prisma from "../util/prismaClient.js";
let key = "banners-scholarship";
let model = "banner";
let select;
const BannerController = {
  async Insert(req, res) {
    try {
      const validate = ValidateBanner(req.body);
      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: ${validate.join(", ")}`
        );
      }
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}: image `);
      }
      const { url_path, services_id } = req.body;

      const serviceExists = await findServicesById(services_id);
      if (!serviceExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}: service with id ${services_id}`
        );
      }
      const img_url = await UploadImage(data.image.data).then((url) => {
        if (!url) {
          throw new Error("Upload Image failed");
        }
        return url;
      });
      const banner = await prisma.banner.create({
        data: {
          url_path,
          services_id,
          image: img_url,
        },
      });
      CacheAndInsertData(key, model, banner, select);
      return SendCreate(res, `${EMessage.insertSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.insertFailed}`, error);
    }
  },
  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = DataExist(req.body);
      const promise = [findBannerById(id)];
      if (data.services_id) {
        promise.push(findServicesById(data.services_id));
      }
      const [bannerExists, serviceExists] = await Promise.all(promise);
      if (!bannerExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}:banner with id ${id} `
        );
      }
      if (data.services_id && !serviceExists) {
        return SendError(
          res,
          400,
          `${EMessage.notFound}:service with id ${id} `
        );
      }
      const banner = await prisma.banner.update({
        where: {
          id,
        },
        data,
      });
      await redis.del(key, key + bannerExists.services_id);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed}`, error);
    }
  },
  async UpdateImage(req, res) {
    try {
      const id = req.params.id;
      const { oldImage } = req.body;
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}: image `);
      }
      if (!oldImage)
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: oldImage is required`
        );
      const bannerExists = await findBannerById(id);
      if (!bannerExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}:banner with id ${id} `
        );
      }
      const img_url = await UploadImage(data.image.data, oldImage).then(
        (url) => {
          if (!url) {
            throw new Error("Upload Image failed");
          }
          return url;
        }
      );
      const banner = await prisma.banner.update({
        where: { id },
        data: {
          image: img_url,
        },
      });
      await redis.del(key, key + bannerExists.services_id);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed}`, error);
    }
  },
  async Delete(req, res) {
    try {
      const id = req.params.id;
      const bannerExists = await findBannerById(id);
      if (!bannerExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}:banner with id ${id} `
        );
      }
      const banner = await prisma.banner.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
      await redis.del(key, key + bannerExists.services_id);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.deleteSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed}`, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const banner = await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.fetchAllSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingAll}`, error);
    }
  },
  async SelectOne(req, res) {
    try {
      const id = req.params.id;
      const banner = await findBannerById(id);
      if (!banner) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}:banner with id ${id} `
        );
      }
      return SendSuccess(res, `${EMessage.fetchOneSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingOne}`, error);
    }
  },

  async SelectionByServiceId(req, res) {
    try {
      const id = req.params.id;
      // await redis.del(key + id);
      const cachedData = await redis.get(key + id);
      let banner;
      if (!cachedData) {
        banner = await prisma.banner.findMany({
          where: {
            isActive: true,
            services_id: id,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            isActive: true,
            url_path: true,
            services_id: true,
            image: true,
            createdAt: true,
            updatedAt: true,
            services: {
              select: {
                title: true,
                description: true,
              },
            },
          },
        });
        await redis.set(key + id, JSON.stringify(banner), "EX", 3600);
      } else {
        banner = JSON.parse(cachedData);
      }

    return  SendSuccess(res, `${EMessage.fetchAllSuccess} by service id`, banner);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.errorFetchingAll} banner by service id`,
        error
      );
    }
  },
};
export default BannerController;
