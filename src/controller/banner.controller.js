import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findBannerById,
  findServicesById,
} from "../services/find.js";
import { S3Upload, S3UploadFile } from "../services/s3UploadImage.js";
import {
  CheckUniqueElement,
  convertToJSON,
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
import { UploadFile, UploadImage } from "../services/uploadImage.js";
import { DataExist, ValidateBanner } from "../services/validate.js";
import prisma from "../util/prismaClient.js";
let key = "banners-scholarship";
let model = "banner";
let select;
let where = { isActive: true };
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
      if (!data || !data.image || !data.url_path) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}:  image, url_path `
        );
      }

      // const { services_id, title, detail } = req.body;
      let { title, detail, document, typescholarship } = req.body;
      if (document && !Array.isArray(document)) {
        document = convertToJSON(document);
      }
      if (typescholarship && !Array.isArray(typescholarship)) {
        typescholarship = convertToJSON(typescholarship);
      }
      // const serviceExists = await findServicesById(services_id);
      // if (!serviceExists) {
      //   return SendError(
      //     res,
      //     404,
      //     `${EMessage.notFound}: service with id ${services_id}`
      //   );
      // }
      let uploadPromises = [];

      if (Array.isArray(data.url_path) && data.url_path.length > 0) {
        // Handle multiple url_path
        uploadPromises = data.url_path.map((file) =>
          S3UploadFile(file).then((url) => {
            if (!url) {
              throw new Error("Upload Image failed");
            }
            return url;
          })
        );
      } else {
        // Handle single image
        uploadPromises = [
          S3UploadFile(data.url_path).then((url) => {
            if (!url) {
              throw new Error("Upload Image failed");
            }
            return url;
          }),
        ];
      }

      const [img_url, file_url_path] = await Promise.all([
        S3Upload(data.image).then((url) => {
          if (!url) {
            throw new Error("Upload Image failed");
          }
          return url;
        }),
        Promise.all(uploadPromises),
      ]);

      const banner = await prisma.banner.create({
        data: {
          url_path: file_url_path,
          // services_id,
          image: img_url,
          title,
          detail,
          document,
          typescholarship,
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
      // if (data.services_id) {
      //   promise.push(findServicesById(data.services_id));
      // }
      const [bannerExists] = await Promise.all(promise);
      if (!bannerExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}:banner with id ${id} `
        );
      }
      // if (data.services_id && !serviceExists) {
      //   return SendError(
      //     res,
      //     400,
      //     `${EMessage.notFound}:service with id ${id} `
      //   );
      // }
      if (data.document && !Array.isArray(data.document)) {
        data.document = convertToJSON(data.document);
      }
      if (data.typescholarship && !Array.isArray(data.typescholarship)) {
        data.typescholarship = convertToJSON(data.typescholarship);
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
      const img_url = await S3Upload(data.image, oldImage).then((url) => {
        if (!url) {
          throw new Error("Upload Image failed");
        }
        return url;
      });
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
  async UpdateFile(req, res) {
    try {
      const id = req.params.id;
      let { oldFile } = req.body;
      const data = req.files;
      if (!data || !data.file) {
        return SendError(res, 400, `${EMessage.pleaseInput}: file `);
      }
      if (!oldFile)
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: oldFile is required`
        );

      oldFile = oldFile.split(",");

      if (oldFile.length === 0)
        return SendError(res, 400, `${EMessage.pleaseInput}: oldFile`);
      const dataFileToList = !data.file.length ? [data.file] : data.file;
      if (dataFileToList.length !== oldFile.length)
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: The number of provided file files does not match the existing records. Please ensure you have uploaded the correct number of images.`
        );

      const bannerExists = await findBannerById(id);
      if (!bannerExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}:banner with id ${id} `
        );
      }
      const oldFileList = bannerExists.url_path;
      let file_url_List = CheckUniqueElement(oldFileList, oldFile);
      const promise = dataFileToList.map((file, i) =>
        S3UploadFile(file, oldFile[i]).then((url) => {
          if (!url) {
            throw new Error("Upload Image failed");
          }
          return url;
        })
      );

      let file_url = await Promise.all(promise);
      file_url_List = file_url_List.concat(file_url);
      const banner = await prisma.banner.update({
        where: { id },
        data: {
          url_path: file_url_List,
        },
      });
      await redis.del(key, key + bannerExists.services_id);
      await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed}`, error);
    }
  },

  async UpdateIsPublished(req, res) {
    try {
      const id = req.params.id;
      let { isPublished } = req.body;
      if (!isPublished)
        return SendError(res, 400, `${EMessage.pleaseInput}:isPublished`);

      isPublished =
        typeof isPublished === "boolean"
          ? isPublished
          : isPublished === "true"
          ? true
          : false;

      const bannerExists = await findBannerById(id);
      if (!bannerExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}:banner with id ${id} `
        );
      }
      const banner = await prisma.banner.update({
        where: {
          id,
        },
        data: { isPublished },
      });
      await redis.del(key, key + bannerExists.services_id);
      await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, banner);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed} isPublished`, error);
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
  async SelectisPublished(req, res) {
    try {
      const bannerData = await CacheAndRetriveUpdateData(key, model, select);
      const banner = bannerData.filter((item) => item.isPublished === true);
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

      return SendSuccess(
        res,
        `${EMessage.fetchAllSuccess} by service id`,
        banner
      );
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
