import jwt from "jsonwebtoken";
import { SendError, VerifyToken } from "../services/service.js";
import { EMessage } from "../services/enum.js";



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
    console.log('err :>> ', err);
    if (err.message == "Token has expired") {
      return SendError(res, 401, EMessage.tokenExpired);
    }
    return SendError(res, 401, err.message || "Unauthorized");
  }
};
