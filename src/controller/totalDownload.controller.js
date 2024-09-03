import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import { CacheAndRetriveUpdateData } from "../services/find.js";
import {
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
import prisma from "../util/prismaClient.js";
let key = "totalDownloads-scholarship";
let model = "totalDownloads";
let select;
const TotalDownloadsController = {
  async Insert(req, res) {
    try {
      const type = req.body.type;
      if (!type) return SendError(res,400, `${EMessage.pleaseInput}:type`);
      const totalDownloads = await prisma.totalDownloads.create({
        data: {
          type,
        },
      });
      const data = new Date(totalDownloads.createdAt);
      let year = data.getFullYear();
      let month = data.getMonth();
      await redis.del(key + year + month);

      return SendCreate(res, `${EMessage.insertSuccess}`, totalDownloads);
    } catch (err) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} totalDownloads  insert`,
        err
      );
    }
  },
  async SelectByMonth(req, res) {
    try {
      const date = req.query.date;
      if (!date)
        return SendError(res, 400, `${EMessage.pleaseInput}: date from query`);
      const data = new Date(date);

      let year = data.getFullYear();
      let month = data.getMonth();
      const startDate = new Date(Date.UTC(year, month, 1));
      const endDate = new Date(Date.UTC(year, month + 1, 1));
      const cachedData = await redis.get(key + year + month);
      let totalDownloads;
      if (!cachedData) {
        totalDownloads = await prisma.totalDownloads.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        await redis.set(
          key + year + month,
          JSON.stringify(totalDownloads),
          "EX",
          3600
        );
      } else {
        totalDownloads = JSON.parse(cachedData);
      }

      return SendSuccess(res, `${EMessage.fetchAllSuccess}`, totalDownloads);
    } catch (err) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} totalDownloads  insert`,
        err
      );
    }
  },
};

export default TotalDownloadsController;
