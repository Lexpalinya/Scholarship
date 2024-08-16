import jwt from "jsonwebtoken";
import { SendError, SendErrorCatch, VerifyToken } from "../services/service.js";
import { EMessage } from "../services/enum.js";
import { CacheAndRetriveUpdateData } from "../services/find.js";
let key = "users-scholarship";
let model = "user";
let select;
export const auth = async (req, res, next) => {
  try {
    const authorization = req.headers["authorization"];
    if (!authorization) return SendError(res, 401, EMessage.invalidToken);

    const token = authorization.replace("Bearer ", "").trim();
    if (!token) return SendError(res, 401, `${EMessage.notFound}` + " Token");
    const decode = await VerifyToken(token);

    req.user = decode;
    next();
  } catch (err) {
    console.log("err :>> ", err);
    if (err.message == "Token has expired") {
      return SendError(res, 401, EMessage.tokenExpired);
    }
    return SendError(res, 401, err.message || "Unauthorized");
  }
};

export const supperAdmin = async (req, res, next) => {
  try {
    const id = req.user;
    if (!id) return SendError(res, 401, `${EMessage.notAllow}`);
    const userData = await CacheAndRetriveUpdateData(key, model, select);
    const user = await userData.find(
      (item) => item.id === id && item.role === "superadmin"
    );
    if (!user) return SendError(res, 401, `${EMessage.notAllow}`);
    next();
  } catch (error) {
    return SendErrorCatch(res, `${EMessage.serverError}`, error);
  }
};
