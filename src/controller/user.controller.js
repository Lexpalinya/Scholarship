import { generateJWTtoken } from "../config/generateToken.js";
import { EMessage } from "../services/enum.js";
import CryptoJS from "crypto-js";
import {
  CacheAndInsertData,
  CacheAndRetriveUpdateData,
  ExistingUser,
  findUsersById,
} from "../services/find.js";
import {
  Decrypt,
  Encrypt,
  SendCreate,
  SendError,
  SendErrorCatch,
  SendSuccess,
  VerifyRefreshToken,
} from "../services/service.js";
import { UploadImage } from "../services/uploadImage.js";
import {
  DataExist,
  VaildateForgotPassword,
  ValidateChangePassword,
  ValidateLogin,
  ValidateUser,
} from "../services/validate.js";
import prisma from "../util/prismaClient.js";
import redis from "../DB/redis.js";
let key = "users-scholarship";
let model = "user";
let select;
const UserController = {
  async Insert(req, res) {
    try {
      const validate = ValidateUser(req.body);
      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}: ${validate.join(", ")}`
        );
      }
      const { username, email, password, firstName, lastName, phoneNumber } =
        req.body;
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}:image`);
      }
      const existingUser = await ExistingUser(req.body);
      if (existingUser) {
        if (existingUser.username === username) {
          return SendError(
            res,
            400,
            `${EMessage.userAlreadyExists} with username :${username}`
          );
        }
        if (existingUser.email === email) {
          return SendError(
            res,
            400,
            `${EMessage.userAlreadyExists} with email :${email}`
          );
        }
      }
      const hashPassword = await Encrypt(password).catch((err) => {
        throw new Error(err);
      });

      const img_url = await UploadImage(data.image.data).then((url) => {
        if (!url) {
          throw new Error("Upload image failed");
        }
        return url;
      });
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashPassword,
          profile: img_url,
          firstName,
          lastName,
          phoneNumber,
        },
      });

      // const encrypId = await Encrypt(user.id);
      // const token = await generateJWTtoken({ id: encrypId });
      // const result = { ...user, token };
      CacheAndInsertData(key, model, user, select);
      // return SendCreate(res, EMessage.insertSuccess, result);
      return SendCreate(res, EMessage.insertSuccess, user);
    } catch (error) {
      return SendErrorCatch(res, EMessage.insertFailed, error);
    }
  },

  async Update(req, res) {
    try {
      const id = req.params.id;
      const data = DataExist(req.body);
      const userExists = await findUsersById(id);
      if (!userExists) {
        return SendError(res, 404, `${EMessage.notFound} user with id :${id}`);
      }

      const existingUser = await ExistingUser(data);
      if (existingUser) {
        if (data.username && existingUser.username === data.username) {
          return SendError(
            res,
            400,
            `${EMessage.userAlreadyExists} with username :${username}`
          );
        }
        if (data.email && existingUser.email === data.email) {
          return SendError(
            res,
            400,
            `${EMessage.userAlreadyExists} with email :${email}`
          );
        }
      }
      if (data.password) {
        data.password = await Encrypt(data.password);
      }
      data.isActive = true;
      const user = await prisma.user.update({
        where: {
          id,
        },
        data,
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.updateSuccess, user);
    } catch (error) {
      return SendErrorCatch(res, EMessage.updateFailed, error);
    }
  },
  async UpdateImage(req, res) {
    try {
      const id = req.params.id;
      const { oldProfile } = req.body;
      if (!oldProfile) {
        return SendError(res, 400, `${EMessage.pleaseInput}:oldProfile`);
      }
      const data = req.files;
      if (!data || !data.image) {
        return SendError(res, 400, `${EMessage.pleaseInput}:image`);
      }
      const userExists = await findUsersById(id);
      if (!userExists) {
        return SendError(res, 404, `${EMessage.notFound} user with id :${id}`);
      }
      const img_url = await UploadImage(data.image.data, oldProfile).then(
        (url) => {
          if (!url) throw new Error("upload image failed");
          return url;
        }
      );
      const user = await prisma.user.update({
        where: { id },
        data: { profile: img_url },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, `${EMessage.updateSuccess}`, user);
    } catch (error) {
      return SendErrorCatch(res, EMessage.updateFailed, error);
    }
  },
  async Delete(req, res) {
    try {
      const id = req.params.id;
      const userExists = await findUsersById(id);
      if (!userExists) {
        return SendError(res, 404, `${EMessage.notFound} user with id :${id}`);
      }
      const user = await prisma.user.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.deleteSuccess, user);
    } catch (error) {
      return SendErrorCatch(res, EMessage.deleteFailed, error);
    }
  },
  async SelectAll(req, res) {
    try {
      const userData = await CacheAndRetriveUpdateData(key, model, select);
      const users = [];

      for (let user of userData) {
        try {
          let decryptedPassword = await Decrypt(user.password).catch((err) => {
            console.error(
              `Initial decryption failed for user ${user.id}:`,
              err.message
            );
            return null; // Attempt to handle failure gracefully
          });

          if (decryptedPassword) {
            let passDecrypted = decryptedPassword.toString(CryptoJS.enc.Utf8);
            passDecrypted = passDecrypted.replace(/"/g, "");
            user.password = passDecrypted;
          } else {
            // Retry decryption
            decryptedPassword = await Decrypt(user.password).catch((err) => {
              console.error(
                `Retry decryption failed for user ${user.id}:`,
                err.message
              );
              return null; // Final fallback
            });

            if (decryptedPassword) {
              let passDecrypted = decryptedPassword.toString(CryptoJS.enc.Utf8);
              passDecrypted = passDecrypted.replace(/"/g, "");
              user.password = passDecrypted;
            } else {
              console.error(`Final decryption failed for user ${user.id}`);
              user.password = null; // Or handle it as needed
            }
          }
        } catch (error) {
          console.error(
            `Error during decryption process for user ${user.id}:`,
            error.message
          );
          user.password = null; // Or handle it as needed
        }
        users.push(user);
      }

      // Send success response with decrypted user data
      return SendSuccess(res, EMessage.fetchAllSuccess, users);
    } catch (error) {
      // Send error response in case of failure
      return SendErrorCatch(res, EMessage.errorFetchingAll, error);
    }
  },

  async SelectOne(req, res) {
    try {
      const id = req.params.id;
      let user = await findUsersById(id);
      if (!user) {
        return SendError(res, 404, `${EMessage.notFound} user with id :${id}`);
      }
      let decriptPassword = await Decrypt(user.password).catch((err) => {
        // console.error(
        //   `Failed to decrypt password for user ${user.id}:`,
        //   err.message
        // );
        // return null; // Handle as necessary, e.g., set password to null or an error message
      });
      let passDecript = decriptPassword.toString(CryptoJS.enc.Utf8);
      passDecript = passDecript.replace(/"/g, "");
      user.password = passDecript;
      return SendSuccess(res, EMessage.fetchAllSuccess, user);
    } catch (error) {
      return SendErrorCatch(res, EMessage.deleteFailed, error);
    }
  },
  async RefreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken)
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput} refreshToken is required`
        );

      const result = await VerifyRefreshToken(refreshToken);
      if (!result) return SendError(res, "Error Generating refresh token");
      return SendSuccess(res, `${EMessage.refreshTokenSuccess}`, result);
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.refreshTokenunSuccess} user `,
        error
      );
    }
  },
  async ForgotPassword(req, res) {
    try {
      const validate = VaildateForgotPassword(req.body);
      if (validate.length > 0) {
        return SendError(res, 400, "Please input:" + validate.join(","));
      }
      const { email, newPassword } = req.body;
      const userExists = await prisma.user.findFirst({
        where: { email, isActive: true },
      });
      if (!userExists)
        return SendError(
          res,
          404,
          `${EMessage.notFound} user with phone number: ${phoneNumber}`
        );
      const hasPassword = await Encrypt(newPassword);
      const user = await prisma.user.update({
        where: {
          id: userExists.id,
        },
        data: {
          password: hasPassword,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.updateSuccess, user);
    } catch (error) {
      return SendErrorCatch(res, `Forgot password fail`, error);
    }
  },
  async ChangePassword(req, res) {
    try {
      const { id } = req.params;
      const validate = ValidateChangePassword(req.body);
      if (validate.length > 0) {
        return SendError(res, 400, "Please input:" + validate.join(","));
      }
      const { oldPassword, newPassword } = req.body;
      const userExists = await findUsersById(id);
      if (!userExists)
        return SendError(res, 404, `${EMessage.notFound} user with ID ${id}`);
      let passDecript = await Decrypt(userExists.password);
      let decriptPass = passDecript.toString(CryptoJS.enc.Utf8);
      decriptPass = decriptPass.replace(/"/g, "");
      if (oldPassword !== decriptPass)
        return SendError(res, 400, "Password does not match");
      const hashPassword = await Encrypt(password).catch((err) => {
        throw new Error(err);
      });

      const user = await prisma.user.update({
        where: {
          id,
        },
        data: {
          password: hashPassword,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(res, EMessage.updateSuccess, user);
    } catch (error) {
      return SendErrorCatch(res, `Change password fail`, error);
    }
  },
  async Login(req, res) {
    try {
      // Validate the input data
      const validate = ValidateLogin(req.body);
      if (validate.length > 0) {
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput} : ${validate.join(", ")}`
        );
      }

      const { username, password } = req.body;

      const userData = await CacheAndRetriveUpdateData(key, model, select);
      const user = userData.find((item) => item.username == username);

      if (!user) {
        return SendError(
          res,
          404,
          `${EMessage.notFound}: user with username: ${username}`
        );
      }

      // Decrypt the stored password
      const decriptPassword = await Decrypt(user.password);
      let passDecript = decriptPassword.toString(CryptoJS.enc.Utf8);
      passDecript = passDecript.replace(/"/g, "");
      // console.log("de :>> ", passDecript === password, passDecript, password);
      // Compare the decrypted password with the provided password
      if (passDecript !== password) {
        return SendError(res, 400, `${EMessage.loginFailed}`);
      }

      // Encrypt the user's ID to be used in the JWT token
      const encryptedId = await Encrypt(user.id);

      const dataJWT = { id: encryptedId };

      // Generate a JWT token
      const token = await generateJWTtoken(dataJWT);

      // Prepare the response with the user details and token
      const result = {
        ...user,
        token,
      };

      // Send a success response
      return SendSuccess(res, `${EMessage.loginSuccess}`, result);
    } catch (error) {
      // Handle any errors that occur during login
      return SendErrorCatch(res, `${EMessage.serverError} login`, error);
    }
  },

  async UpdatePassword(req, res) {
    try {
      const id = req.params.id;
      const { password } = req.body;
      if (!password)
        return SendError(
          res,
          400,
          `${EMessage.pleaseInput}:password is required`
        );
      const userExists = await findUsersById(id);
      if (!userExists)
        return SendError(res, 404, `${EMessage.notFound} user with id ${id}`);

      const hashPassword = await Encrypt(password).catch((err) => {
        throw new Error(err);
      });
      const user = await prisma.user.update({
        where: { id },
        data: {
          password: hashPassword,
        },
      });
      await redis.del(key);
      CacheAndRetriveUpdateData(key, model, select);
      return SendSuccess(
        res,
        `${EMessage.updateSuccess} password updated`,
        user
      );
    } catch (error) {
      return SendErrorCatch(
        res,
        `${EMessage.serverError} update password fail`,
        error
      );
    }
  },
};

export default UserController;
