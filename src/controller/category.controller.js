import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findCategoryById,
  findUsersById,
} from "../services/find.js";
import { SendError, SendErrorCatch, SendSuccess } from "../services/service.js";
import { DataExist, ValidateCategory } from "../services/validate.js";
import prisma from "../util/prismaClient.js";
let key = "categorys-scholarship";
let select = {
  id: true,
  isActive: true,
  name: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      username: true,
    },
  },
};

let model = "category";
const CategoryController = {
  async Insert(req, res) {
    try {
      const validate = ValidateCategory(req.body);
      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput} ${validate.join(", ")}`
        );
      }
      const { name, userId } = req.body;
      const userExists = await findUsersById(userId);
      if (!userExists)
        return SendError(res, 404, `${EMessage.notFound} user with ID ${id}`);
      const category = await prisma.category.create({
        data: {
          name,
          userId,
        },
        select,
      });
      CacheAndInsertData(key, model, category, select);
      return SendSuccess(res, `${EMessage.insertSuccess}`, category);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.insertFailed} category`, error);
    }
  },
  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = DataExist(req.body);
      const categoryExists = await findCategoryById(id);
      if (!categoryExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} category with id ${id}`
        );
      }
      if (data.userId) {
        const userExists = await findUsersById(userId);
        if (!userExists)
          return SendError(
            res,
            404,
            `${EMessage.notFound} user with ID ${data.userId}`
          );
      }
      const category = await prisma.category.update({
        where: {
          id,
        },
        data,
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, category);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed} category`, error);
    }
  },
  async Delete(req, res) {
    try {
      const id = req.params.id;
      const categoryExists = await findCategoryById(id);
      if (!categoryExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} category with id ${id}`
        );
      }
      const category = await prisma.category.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, category);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed} category`, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const category = await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.fetchAllSuccess}`, category);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed} category`, error);
    }
  },
  async SelectOne(req, res) {
    try {
      const id = req.params.id;
      const category = await findCategoryById(id);
      if (!category) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} category with id ${id}`
        );
      }
      return SendSuccess(res, `${EMessage.fetchOneSuccess}`, category);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed} category`, error);
    }
  },
};
export default CategoryController;
