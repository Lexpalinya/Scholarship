import jwt from "jsonwebtoken";

import { JWT_REFRECH_TIMEOUT, JWT_TIMEOUT, SECRET_KEY } from "./config.api.js";
import { Encrypt } from "../services/service.js";

export const generateJWTtoken = async (data) => {
  try {
    // console.log('data.id :>> ', data.id);
    const payload = {
      id: data.id,
    };

    const encryptId = await Encrypt(payload.id);
    // console.log('encryptId :>> ', encryptId);
    const jwtData = {
      expiresIn: String(JWT_TIMEOUT),
    };
    const jwtRefreshData = {
      expiresIn: String(JWT_REFRECH_TIMEOUT),
    };

    const payloodRefresh = {
      id: encryptId,
    };
    const token = jwt.sign(payload, SECRET_KEY, jwtData);
    // console.log('object :>> ', SECRET_KEY);
    const refreshToken = jwt.sign(payloodRefresh, SECRET_KEY, jwtRefreshData);
    const resultData = {
      token: token,
      refreshToken: refreshToken,
    };
    return resultData;
  } catch (error) {
    console.log("error generate token :>> ", error);
    return false;
  }
};
