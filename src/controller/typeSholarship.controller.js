import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  findDocumentsById,
  findTypeSholarshipById,
  FindTypeSholarshipByReferId,
} from "../services/find.js";
import { SendError, SendErrorCatch, SendSuccess } from "../services/service.js";
import { DataExist } from "../services/validate.js";
import prisma from "../util/prismaClient.js";

let key = "typeSholarship-scholarship";
let model = "typeSholarship";
let select;
const TypeSholarshipController = {
  async Insert(req, res) {
    try {
      let { referid, text } = req.body;
      console.log("text :>> ", text);
      if (!referid || !text)
        return SendError(res, 400, `${EMessage.pleaseInput}: text,referid`);
      if (!Array.isArray(text)) {
        text = convertToJSON(text);
        if (text) {
          console.log(text); // Output: ["a", "b", "c"]
        } else {
          console.error("Failed to parse JSON");
        }
      }
      const doc = await prisma.typeSholarship.create({
        data: {
          text,
          referid,
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
      const docExists = await findTypeSholarshipById(id);
      if (!docExists) return SendError(res, 404, `${EMessage.notFound}`);
      const doc = await prisma.typeSholarship.update({
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
      const docExists = await findTypeSholarshipById(id);
      if (!docExists) return SendError(res, 404, `${EMessage.notFound}`);
      const doc = await prisma.typeSholarship.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
      await redis.del(key);
      await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.deleteSuccess}`, doc);
    } catch (error) {
      SendErrorCatch(res, `${EMessage.deleteFailed} typeSholarship`, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const doc = await CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.fetchAllSuccess}`, doc);
    } catch (error) {
      SendErrorCatch(res, `${EMessage.errorFetchingAll} typeSholarship`, error);
    }
  },
  async SelectByReferId(req, res) {
    try {
      const id = req.params.id;
      const doc = await FindTypeSholarshipByReferId(id);
      return SendSuccess(res, `${EMessage.fetchAllSuccess}`, doc);
    } catch (error) {
      SendErrorCatch(res, `${EMessage.errorFetchingAll} typeSholarship`, error);
    }
  },
};
export default TypeSholarshipController;
