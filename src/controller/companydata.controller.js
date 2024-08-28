import redis from "../DB/redis.js";
import { EMessage } from "../services/enum.js";
import {
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
} from "../services/service.js";
import { UploadImage } from "../services/uploadImage.js";
import { DataExist, ValidateCompanyData } from "../services/validate.js";
import prisma from "../util/prismaClient.js";

let key = "company-data";

const CompanyDataController = {
  async Insert(req, res) {
    try {
      const validate = ValidateCompanyData(req.body);
      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}:${validate.join(", ")}`
        );
      }
      const data = req.files;
      if (!data || !data.icon) {
        return SendError(res, 400, `${EMessage.pleaseInput}:icon is required`);
      }
      const icon = await UploadImage(data.icon.data);
      if (!icon) {
        throw new Error("Upload Image failed");
      }
      const { title, description } = req.body;
      const company = await prisma.companyData.create({
        data: { title, description, icon },
      });
      await redis.del(key);
      await redis.set(key, JSON.stringify([company]), "EX", 3600);

      return SendCreate(res, `${EMessage.insertSuccess}`, company);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} insert company`,
        error
      );
    }
  },
  async Update(req, res) {
    try {
      const id = parseInt(req.params.id);
      const data = DataExist(req.body);
      const companyDataExists = await prisma.companyData.findUnique({
        where: { id },
      });
      if (!companyDataExists)
        return SendError(res, 404, `${EMessage.notFound}:company id`);
      const company = await prisma.companyData.update({
        where: { id },
        data,
      });
      await redis.del(key);
      await redis.set(key, JSON.stringify([company]));
      return SendSuccess(res, `${EMessage.updateSuccess}`, company);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} insert company`,
        error
      );
    }
  },
  async Delete(req, res) {
    try {
      const id = parseInt(req.params.id);

      const companyDataExists = await prisma.companyData.findUnique({
        where: { id },
      });
      if (!companyDataExists)
        return SendError(res, 404, `${EMessage.notFound}:company id`);
      const company = await prisma.companyData.delete({
        where: { id },
      });
      await redis.del(key);
      await redis.set(key, JSON.stringify([company]), "EX", 3600);
      return SendSuccess(res, `${EMessage.updateSuccess}`, company);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} insert company`,
        error
      );
    }
  },
  async UpdateImage(req, res) {
    try {
      const id = parseInt(req.params.id);
      const { oldIcon } = req.body;
      if (!oldIcon) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}:oldIcon is required`
        );
      }
      const data = req.files;
      if (!data || !data.icon) {
        return SendError(res, 400, `${EMessage.pleaseInput}:icon is required`);
      }
      const icon = await UploadImage(data.icon.data, oldIcon);
      if (!icon) {
        throw new Error("Upload Image failed");
      }
      const companyDataExists = await prisma.companyData.findUnique({
        where: { id },
      });
      if (!companyDataExists)
        return SendError(res, 404, `${EMessage.notFound}:company id`);
      const company = await prisma.companyData.update({
        where: { id },
        data: {
          icon,
        },
      });
      await redis.del(key);
      await redis.set(key, JSON.stringify([company]), "EX", 3600);
      return SendSuccess(res, `${EMessage.updateSuccess}`, company);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} insert company`,
        error
      );
    }
  },
  async SelectAll(req, res) {
    try {
      const cachData = await redis.get(key);
      console.log("cachData :>> ", JSON.parse(cachData));
      let company;
      if (!cachData) {
        company = await prisma.companyData.findMany({});
        await redis.set(key, JSON.stringify(company));
      } else {
        company = JSON.parse(cachData);
      }
      SendSuccess(res, `${EMessage.fetchAllSuccess}`, company);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} insert company`,
        error
      );
    }
  },
};

export default CompanyDataController;
