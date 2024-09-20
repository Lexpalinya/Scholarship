import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findNewsById,
  findServicesById,
} from "../services/find.js";
import { S3Upload, S3UploadFile } from "../services/s3UploadImage.js";
import {
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
// import { UploadFile, UploadImage } from "../services/uploadImage.js";
import { DataExist, ValidateNews } from "../services/validate.js";
import prisma from "../util/prismaClient.js";
let key = "news-scholarship";
let model = "news";
let select;
const NewsController = {
  async Insert(req, res) {
    try {
      const validate = ValidateNews(req.body);
      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: ${validate.join(", ")}`
        );
      }

      // const { title, detail, services_id, start_time, end_time } = req.body;
      let { title, detail } = req.body;
      // if (document && !Array.isArray(document)) {
      //   document = convertToJSON(document);
      // }
      // if (typescholarship && !Array.isArray(typescholarship)) {
      //   typescholarship = convertToJSON(typescholarship);
      // }
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}:  image`);
      }
      // const serviceExists = await findServicesById(services_id);
      // if (!serviceExists) {
      //   return SendError(
      //     res,
      //     404,
      //     `${EMessage.notFound}: service with id ${services_id}`
      //   );
      // }
      const [img_url, file_url_path] = await Promise.all([
        UploadImage(data.image.data).then((url) => {
          if (!url) {
            throw new Error("Upload Image failed");
          }
          return url;
        }),
        // UploadFile(data.file).then((url) => {
        //   if (!url) {
        //     throw new Error("Upload Image failed");
        //   }
        //   return url;
        // }),
      ]);

      const news = await prisma.news.create({
        data: {
          title,
          detail,
          // services_id,
          // start_time,
          // end_time,
          image: img_url,
          // file_url: file_url_path,
        },
      });
      CacheAndInsertData(key, model, news, select);
      return SendCreate(res, `${EMessage.insertSuccess}`, news);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.insertFailed}news`, error);
    }
  },
  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = DataExist(req.body);
      const promise = [findNewsById(id)];
      if (data.services_id) {
        promise.push(findServicesById(data.services_id));
      }
      const [newsExists, serviceExists] = await Promise.all(promise);
      if (!newsExists) {
        return SendError(res, 404, `${EMessage.notFound}news with id ${id}`);
      }
      // if (data.services_id && !serviceExists) {
      //   return SendError(
      //     res,
      //     404,
      //     `${EMessage.notFound} services with id ${id}`
      //   );
      // }
      // if (data.document && !Array.isArray(data.document)) {
      //   data.document = convertToJSON(data.document);
      // }
      // if (data.typescholarship && !Array.isArray(data.typescholarship)) {
      //   data.typescholarship = convertToJSON(data.typescholarship);
      // }
      const news = await prisma.news.update({ where: { id }, data });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.updateSuccess, news);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed}news`, error);
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
      const newsExists = await findNewsById(id);
      if (!newsExists) {
        return SendError(res, 404, `${EMessage.notFound}news with id ${id}`);
      }

      const img_url = await S3Upload(data.image, oldImage).then((url) => {
        if (!url) {
          throw new Error("Upload Image failed");
        }
        return url;
      });
      console.log("img_url :>> ", img_url);
      const news = await prisma.news.update({
        where: { id },
        data: {
          image: img_url,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.updateSuccess, news);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed}news images`, error);
    }
  },
  // async UpdateFile(req, res) {
  //   try {
  //     const id = req.params.id;
  //     const { oldFile } = req.body;
  //     const data = req.files;
  //     if (!data || !data.file) {
  //       return SendError(res, 400, `${EMessage.pleaseInput}: file `);
  //     }
  //     if (!oldFile)
  //       return SendError(
  //         res,
  //         400,
  //         `${EMessage.pleaseInput}: oldFile is required`
  //       );
  //     const newsExists = await findNewsById(id);
  //     if (!newsExists) {
  //       return SendError(res, 404, `${EMessage.notFound}:news with id ${id} `);
  //     }
  //     const file_url = await UploadFile(data.file, oldFile).then((url) => {
  //       if (!url) {
  //         throw new Error("Upload file failed");
  //       }
  //       return url;
  //     });
  //     const news = await prisma.news.update({
  //       where: { id },
  //       data: {
  //         file_url: file_url,
  //       },
  //     });
  //     await redis.del(key);
  //     CacheAndRetriveUpdateData(key, model, select);
  //     return SendSuccess(res, `${EMessage.updateSuccess}`, news);
  //   } catch (error) {
  //     return SendErrorCatch(res, `${EMessage.updateFailed}`, error);
  //   }
  // },

  async Delete(req, res) {
    try {
      const id = req.params.id;
      const newsExists = await findNewsById(id);
      if (!newsExists) {
        return SendError(res, 404, `${EMessage.notFound}news with id ${id}`);
      }
      const news = await prisma.news.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.updateSuccess, news);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed}news`, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const news = await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.fetchAllSuccess, news);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingAll}news`, error);
    }
  },
  async SelectOne(req, res) {
    try {
      const id = req.params.id;
      const news = await findNewsById(id);
      if (!news) {
        return SendError(res, 404, `${EMessage.notFound}news with id ${id}`);
      }
      return SendSuccess(res, EMessage.fetchOneSuccess, news);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingOne}news`, error);
    }
  },
};
export default NewsController;
