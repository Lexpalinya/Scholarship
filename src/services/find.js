import redis from "../DB/redis.js";
import prisma from "../util/prismaClient.js";

const findOne = (model, where, select) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await prisma[model].findUnique({ where, select });
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

const findFirst = (model, where, select) => {
  return new Promise(async (resolve, reject) => {
    try {
      const results = await prisma[model].findFirst({ where, select });
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
};

const findMany = (model, where, select) => {
  return new Promise(async (resolve, reject) => {
    try {
      const results = await prisma[model].findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
      });
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
};

export const CacheAndRetriveUpdateData = async (key, model, select) => {
  try {
    const cachedData = await redis.get(key);
    let data;

    if (!cachedData) {
      data = await prisma[model].findMany({
        where: { isActive: true },
        select,
        orderBy: { createdAt: "desc" },
      });

      await redis.set(key, JSON.stringify(data), "EX", 3600);
    } else {
      data = JSON.parse(cachedData);
    }

    return data;
  } catch (error) {
    console.error(`Failed to retrieve updated data for ${model}:`, error);
    throw error;
  }
};
export const CacheAndInsertData = async (key, model, newData, select) => {
  try {
    const cachedData = await redis.get(key);
    let data;

    if (!cachedData) {
      data = await prisma[model].findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select,
      });
      await redis.set(key, JSON.stringify(data), "EX", 3600);
    } else {
      data = JSON.parse(cachedData);
      data.unshift(newData);

      await redis.set(key, JSON.stringify(data), "EX", 3600);
    }
  } catch (error) {
    console.error(`Failed to cache and insert data for ${model}:`, error);
    throw error;
  }
};

const findinCached = async (key, model, where, select) => {
  let cachedData = await redis.get(key);

  if (!cachedData) {
    const results = await prisma[model].findUnique({ where, select });
    CacheAndRetriveUpdateData(key, model, select);

    return results;
  }

  const data = JSON.parse(cachedData);

  const result = data.find((item) => {
    return item.id == where.id;
  });

  return result || null;
};

export const findServicesById = (id) => {
  return findinCached("services-scholarship", "services", {
    id,
    isActive: true,
  });
};

export const findCategoryById = (id) => {
  return findinCached(
    "categorys-scholarship",
    "category",
    {
      id,
      isActive: true,
    },
    {
      id: true,
      isActive: true,
      name: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          username: true,
        },
      },
    }
  );
};

export const findAboutByid = (id) => {
  return findinCached("abouts-scholarship", "about", { id, isActive: true });
};

export const findBannerById = (id) => {
  return findinCached("banners-scholarship", "banner", { id, isActive: true });
};

export const findCommentById = (id) => {
  return findinCached("comments-scholarship", "comment", {
    id,
    isActive: true,
  });
};

export const findNewsById = (id) => {
  return findinCached("news-scholarship", "news", { id, isActive: true });
};

export const findUsersById = (id) => {
  return findinCached("users-scholarship", "user", { id, isActive: true });
};

export const ExistingUser = ({ username, email }) => {
  return findFirst("user", {
    isActive: true,
    OR: [{ username }, { email }],
  });
};
