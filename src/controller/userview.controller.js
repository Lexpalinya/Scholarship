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
let key = "userview-scholarship";
let model = "userview";
let select;
const UserViewController = {
  async Insert(req, res) {
    try {
      const userview = await prisma.userview.create({});
      const data = new Date(userview.createdAt);
      let year = data.getFullYear();
      let month = data.getMonth();
      await redis.del(key + year + month);

      return SendCreate(res, `${EMessage.insertSuccess}`, userview);
    } catch (err) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} userview  insert`,
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
      let userview;
      if (!cachedData) {
        userview = await prisma.userview.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
            
          },
          orderBy: {
            createdAt:"desc"
          }
        });
        await redis.set(
          key + year + month,
          JSON.stringify(userview),
          "EX",
          3600
        );
      } else {
        userview = JSON.parse(cachedData);
      }

      return SendSuccess(res, `${EMessage.fetchAllSuccess}`, userview);
    } catch (err) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} userview  insert`,
        err
      );
    }
  },
};

export default UserViewController;
