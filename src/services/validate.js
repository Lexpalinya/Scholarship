const validateData = (data) => {
  return Object.keys(data).filter((key) => !data[key]);
};

export const DataExist = (data) => {
  const existDatas = {};
  Object.keys(data).forEach((el) => {
    if (
      data[el] &&
      !el.toLowerCase().includes("image") &&
      !el.toLowerCase().includes("logo")
    ) {
      existDatas[el] = data[el];
    }
  });

  return existDatas;
};

export const ValidateCategory = (data) => {
  const { name, userId } = data;
  return validateData({ name, userId });
};

export const ValidateComment = (data) => {
  const { name, email, comment } = data;
  return validateData({ name, email, comment });
};

export const ValidateBanner = (data) => {
  const { services_id } = data;
  return validateData({ services_id });
};

export const ValidateServices = (data) => {
  const { title, description, file_url, category_id } = data;
  return validateData({ title, description, file_url, category_id });
};

export const ValidateNews = (data) => {
  const { title, detail, services_id, start_time, end_time } = data;
  return validateData({ title, detail, services_id, start_time, end_time });
};

export const ValidateUser = (data) => {
  const { username, email, password } = data;
  return validateData({ username, email, password });
};
export const ValidateLogin = (data) => {
  const { username, password } = data;
  return validateData({ username, password });
};

export const ValidateChangePassword = (data) => {
  const { newPassword, oldPassword } = data;
  return validateData({ newPassword, oldPassword });
};
export const VaildateForgotPassword = (data) => {
  const { email, newPassword } = data;
  return validateData({ email, newPassword });
};
