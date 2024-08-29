import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findDocumentsById,
} from "../services/find.js";
import { SendError, SendErrorCatch, SendSuccess } from "../services/service.js";
import { DataExist } from "../services/validate.js";
import prisma from "../util/prismaClient.js";

let key = "document-scholarship";
let model = "document";
let select;
const DocumentController = {
  async Insert(req, res) {
    try {
      const { text } = req.body;
      if (!text) return SendError(res, 400, `${EMessage.pleaseInput}: text`);
      const doc = await prisma.document.create({
        data: {
          text,
        },
      });
      await CacheAndInsertData(key, model, doc, select);
      return SendSuccess(res, `${EMessage.insertSuccess}`, doc);
    } catch (error) {
      SendErrorCatch(res, `${EMessage.insertFailed}`, error);
    }
  },
  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = DataExist(req.body);
      const docExists = await findDocumentsById(id);
      if (!docExists) return SendError(res, 404, `${EMessage.notFound}`);
      const doc = await prisma.document.update({
        where: { id },
        data,
      });
      await redis.del(key);
      await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, doc);
    } catch (error) {
      SendErrorCatch(res, `${EMessage.updateFailed}`, error);
    }
  },
  async Delete(req, res) {
    try {
      const id = req.params.id;
      const docExists = await findDocumentsById(id);
      if (!docExists) return SendError(res, 404, `${EMessage.notFound}`);
      const doc = await prisma.document.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
      await redis.del(key);
      await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.deleteSuccess}`, doc);
    } catch (error) {
      SendErrorCatch(res, `${EMessage.deleteFailed} document`, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const doc = await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.fetchAllSuccess}`, doc);
    } catch (error) {
      SendErrorCatch(res, `${EMessage.errorFetchingAll} document`, error);
    }
  },
};
export default DocumentController;
