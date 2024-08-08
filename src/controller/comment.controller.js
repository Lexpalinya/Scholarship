import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findCommentById,
} from "../services/find.js";
import {
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
import { DataExist, ValidateComment } from "../services/validate.js";
import prisma from "../util/prismaClient.js";
let key = "comments";
let model = "comment";
let select;

const CommentController = {
  async Insert(req, res) {
    try {
      const validate = ValidateComment(req.body);
      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput} ${validate.join(", ")}`
        );
      }
      const { name, email,phoneNumber, comment } = req.body;
      const comments = await prisma.comment.create({
        data: {
          name,
          email,
          comment,
          phoneNumber
        },
      });
      CacheAndInsertData(key, model, comments, select);
      return SendCreate(res, `${EMessage.insertSuccess}`, comments);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.insertFailed} comment`, error);
    }
  },
  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = DataExist(req.body);
      const commentExists = await findCommentById(id);
      if (!commentExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} comment with id ${id}`
        );
      }
      const comments = await prisma.comment.update({
        where: { id },
        data,
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, comments);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.updateFailed} comment`, error);
    }
  },
  async Delete(req, res) {
    try {
      const id = req.params.id;
      const commentExists = await findCommentById(id);
      if (!commentExists) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} comment with id ${id}`
        );
      }
      const comments = await prisma.comment.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);

      return SendSuccess(res, `${EMessage.deleteSuccess}`, comments);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.deleteFailed} comment`, error);
    }
  },

  async SelectAll(req, res) {
    try {
      const comments = await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.fetchAllSuccess} comments`, comments);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingAll} comment`, error);
    }
  },
  async SelectOne(req, res) {
    try {
      const id = req.params.id;
      const comments = await findCommentById(id);
      if (!comments) {
        return SendError(
          res,
          404,
          `${EMessage.notFound} comment with id ${id}`
        );
      }
      return SendSuccess(res, `${EMessage.fetchOneSuccess} comments`, comments);
    } catch (error) {
      return SendErrorCatch(res, `${EMessage.errorFetchingOne} comment`, error);
    }
  },
};
export default CommentController;
