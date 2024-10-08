import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findCategoryById,
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
import { DataExist, ValidateServices } from "../services/validate.js";
import prisma from "../util/prismaClient.js";
let key = "services-scholarship";
let model = "services";
let select = {
  id: true,
  isActive: true,
  title: true,
  description: true,
  file_url: true,
  category_id: true,
  image: true,
  document: true,
  typescholarship: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      name: true,
    },
  },
};
const ServicesController = {
  async Insert(req, res) {
    try {
      const validate = ValidateServices(req.body);
      const data = req.files;

      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: ${validate.join(", ")}`
        );
      }
      if (!data || !data.image || !data.file) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: ${
            !data ? "image ,file" : !data.image ? "image" : "file"
          } `
        );
      }
      let { title, description, category_id, document, typescholarship } =
        req.body;

      if (document && !Array.isArray(document)) {
        document = convertToJSON(document);
      }
      if (typescholarship && !Array.isArray(typescholarship)) {
        typescholarship = convertToJSON(typescholarship);
      }
      const categoryExists = await findCategoryById(category_id);
      if (!categoryExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}: category with id ${category_id}`
        );
      }

      let uploadPromises = [];
      if (Array.isArray(data.file) && data.file.length > 0) {
        // Handle multiple file
        uploadPromises = data.file.map((file) =>
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
          S3UploadFile(data.file).then((url) => {
            if (!url) {
              throw new Error("Upload Image failed");
            }
            return url;
          }),
        ];
      }

      const [img_url, file_url] = await Promise.all([
        S3Upload(data.image).then((url) => {
          if (!url) {
            throw new Error("Upload Image failed");
          }
          return url;
        }),
        Promise.all(uploadPromises),
      ]);
      const services = await prisma.services.create({
        data: {
          title,
          description,
          file_url,
          category_id,
          image: img_url,
          document,
          typescholarship,
        },
      });
      await redis.del(key + category_id);
      CacheAndInsertData(key, model, services, select);
      SendCreate(res, `${EMessage.insertSuccess}`, services);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.insertFailed} service`, error);
    }
  },

  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = DataExist(req.body);
      const promise = [findServicesById(id)];
      if (data.category_id) {
        promise.push(findCategoryById(data.category_id));
      }
      const [serviceExists, categoryExists] = await Promise.all(promise);
      if (!serviceExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} service with id ${id}`
        );
      }
      console.log("object :>> ", categoryExists);
      if (data.category_id && !categoryExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} category with id ${id}`
        );
      }
      if (data.document && !Array.isArray(data.document)) {
        data.document = convertToJSON(data.document);
      }
      if (data.typescholarship && !Array.isArray(data.typescholarship)) {
        data.typescholarship = convertToJSON(data.typescholarship);
      }
      const services = await prisma.services.update({
        where: { id },
        data,
      });
      await redis.del(key, key + serviceExists.category_id);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess} `, services);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed} service`, error);
    }
  },
  async UpdateImage(req, res) {
    try {
      const id = req.params.id;
      const { oldImage } = req.body;
      if (!oldImage)
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: oldImage is required`
        );
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}: image `);
      }

      const serviceExists = await findServicesById(id);
      if (!serviceExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} service with id ${id}`
        );
      }
      const img_url = await S3Upload(data.image, oldImage).then((url) => {
        if (!url) {
          throw new Error("Upload Image failed");
        }
        return url;
      });

      const services = await prisma.services.update({
        where: { id },
        data: {
          image: img_url,
        },
      });
      await redis.del(key, key + serviceExists.category_id);
      CacheAndRetriveUpdateData(key, model, select);
      SendSuccess(res, `${EMessage.updateSuccess} service image`, services);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.updateFailed} service image`,
        error
      );
    }
  },
  async UpdateFile(req, res) {
    try {
      const id = req.params.id;
      let { oldFile } = req.body;
      const data = req.files;
      if (!oldFile) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: oldFile is required`
        );
      }
      oldFile = oldFile.split(",");
      if (oldFile.length === 0)
        return SendError(res, 400, `${EMessage.pleaseInput}: oldFile`);

      if (!data || !data.file) {
        return SendError(res, 400, `${EMessage.pleaseInput}: file`);
      }
      const dataFileToList = !data.file.length ? [data.file] : data.file;
      if (dataFileToList.length !== oldFile.length)
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: The number of provided file files does not match the existing records. Please ensure you have uploaded the correct number of images.`
        );

      const serviceExists = await findServicesById(id);
      if (!serviceExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} service with id ${id}`
        );
      }
      const oldFileList = await serviceExists.file_url;
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

      const services = await prisma.services.update({
        where: { id },
        data: { file_url: file_url_List },
      });

      await redis.del(key, key + serviceExists.category_id);
      await CacheAndRetriveUpdateData(key, model, select);

      SendSuccess(res, `${EMessage.updateSuccess} service file`, services);
    } catch (error) {
      console.error("UpdateFile error:", error);
      return SendErrorCatch(
        res,
        `${EMessage.updateFailed} service file`,
        error
      );
    }
  },

  async Delete(req, res) {
    try {
      const id = req.params.id;
      const serviceExists = await findServicesById(id);
      if (!serviceExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} service with id ${id}`
        );
      }
      const services = await prisma.services.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
      await redis.del(key, key + serviceExists.category_id);
      CacheAndRetriveUpdateData(key, model, select);
      SendSuccess(res, `${EMessage.deleteSuccess} service image`, services);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed} service`, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const services = await CacheAndRetriveUpdateData(key, model, select);
      SendSuccess(res, `${EMessage.fetchAllSuccess} services`, services);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingAll} service`, error);
    }
  },
  async SelectOne(req, res) {
    try {
      const id = req.params.id;
      const services = await findServicesById(id);
      if (!services) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} service with id ${id}`
        );
      }
      return SendSuccess(
        res,
        `${EMessage.fetchOneSuccess} service image`,
        services
      );
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingOne} service`, error);
    }
  },

  async SelectByCategoryId(req, res) {
    try {
      const id = req.params.id;
      let services;
      key = key + id;
      // await redis.del(key);
      const cachedData = await redis.get(key);
      if (!cachedData) {
        services = await prisma.services.findMany({
          where: {
            category_id: id,
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          select,
          take: 200,
        });
        redis.set(key, JSON.stringify(services), "EX", 3600);
      } else {
        services = JSON.parse(cachedData);
      }
      return SendSuccess(res, `${EMessage.fetchAllSuccess} service`, services);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingOne} service`, error);
    }
  },
  async Search(req, res) {
    try {
      const search = req.query.search;
      let services;
      key = key + search;
      // await redis.del(key);
      const cachedData = await redis.get(key);
      if (!cachedData) {
        services = await prisma.services.findMany({
          take: 500,
          where: {
            title: {
              contains: search,
            },
            isActive: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          select,
        });
        redis.set(key, JSON.stringify(services), "EX", 3600);
      } else {
        services = JSON.parse(cachedData);
      }
      return SendSuccess(res, `${EMessage.fetchAllSuccess} service`, services);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.fetchAllSuccess} service searc້`,
        error
      );
    }
  },
};
export default ServicesController;
