import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import { findUsersById } from "./find.js";
import { SECRET_KEY } from "../config/config.api.js";
import { generateJWTtoken } from "../config/generateToken.js";

export const SendSuccess = (res, message, data) => {
  res.status(200).json({ status: true, message, data });
};
export const SendError = (res, status, message, err) => {
  res.status(status).json({ status: false, message, data: {}, err });
};

export const SendCreate = (res, message, data) => {
  res.status(201).json({ status: true, message, data });
};

export const SendErrorCatch = (res, message, error) => {
  console.log(`Error:${message}`, error);
  res.status(500).json({ status: false, message, error });
};

export const CheckUniqueElement = (a, b) => {
  const result = [];
  for (let i = 0; i < a.length; i++) {
    if (!b.includes(a[i])) {
      result.push(a[i]);
    }
  }
  return result;
};
export const Decrypt = (hash) => {
  return new Promise((resolve, reject) => {
    try {
      let decoded = CryptoJS.AES.decrypt(hash, SECRET_KEY);
      decoded = decoded.toString(CryptoJS.enc.Utf8);

      if (!decoded) {
        throw new Error("Decryption failed, resulting in an empty string");
      }

      resolve(decoded);
    } catch (error) {
      console.error("Decryption error:", error.message);
      reject(new Error("Failed to decrypt data."));
    }
  });
};

export const Encrypt = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const hash = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        SECRET_KEY
      ).toString();

      if (!hash) {
        throw new Error("Encryption failed, resulting in an empty string");
      }

      resolve(hash);
    } catch (error) {
      console.error("Encryption error:", error.message);
      reject(new Error("Failed to encrypt data."));
    }
  });
};
export const VerifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          console.error("JWT Verification Error: Token has expired");
          return reject(new Error("Token has expired"));
        } else {
          console.error("JWT Verification Error:", err.message);
          return reject(new Error("Invalid token"));
        }
      }

      try {
        const id = await Decrypt(decoded.id);

        if (!id) {
          console.error("Decryption Error: Decrypted ID is empty or invalid");
          return reject(
            new Error(
              "Error verifying authorization: Decrypted ID is empty or invalid"
            )
          );
        }
        let decryptedPass = id.toString(CryptoJS.enc.Utf8);
        decryptedPass = decryptedPass.replace(/"/g, "");

        const user = await findUsersById(decryptedPass);

        if (!user) {
          console.error("Authorization Error: User not found");
          return reject(new Error("Invalid authorization: User not found"));
        }

        return resolve(user.id);
      } catch (error) {
        console.error("Decryption or Database Error:", error.message);
        return reject(
          new Error("Error decrypting token or fetching user data")
        );
      }
    });
  });
};
export const VerifyRefreshToken = (data) => {
  return new Promise((resolve, reject) => {
    jwt.verify(data, SECRET_KEY, async (err, decoded) => {
      try {
        if (err) {
          console.error("JWT Verification Error:", err);
          return reject(err);
        }

        const decryptedRefreshToken = await Decrypt(decoded.id);
        if (!decryptedRefreshToken) {
          return reject("Error: Could not decrypt the refresh token");
        }

        let decryptedId = decryptedRefreshToken
          .toString(CryptoJS.enc.Utf8)
          .replace(/"/g, "");
        if (!decryptedId) {
          return reject("Error: Invalid decrypted ID");
        }

        let userId = await Decrypt(decryptedId);
        if (!userId) {
          return reject("Error: Could not decrypt user ID");
        }

        const user = await findUsersById(
          userId.toString(CryptoJS.enc.Utf8).replace(/"/g, "")
        );

        if (!user) {
          return reject("Error: User not found");
        }

        const encryptedId = await Endcrypt(user.id, SECRET_KEY);

        const tokenData = {
          id: encryptedId,
        };

        const token = await generateJWTtoken(tokenData);
        resolve(token);
      } catch (error) {
        console.error("General Error:", error);
        reject(error);
      }
    });
  });
};

export const convertToJSON = (validString) => {
  try {
    // Replace single quotes with double quotes
    const jsonString = validString.replace(/'/g, '"');

    // Parse the JSON string
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return null; // Or handle the error as needed
  }
};
