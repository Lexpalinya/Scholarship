import express from "express";
import AboutConttroller from "../controller/about.controller.js";
import CategoryController from "../controller/category.controller.js";
import BannerController from "../controller/banner.controller.js";
import CommentController from "../controller/comment.controller.js";
import ServicesController from "../controller/services.controller.js";
import NewsController from "../controller/news.controller.js";
import UserController from "../controller/user.controller.js";
import { auth, supperAdmin } from "../middleware/auth.middleware.js";
import CompanyDataController from "../controller/companydata.controller.js";

const route = express.Router();

const about = `/about`;

route.post(`${about}/insert`, auth, AboutConttroller.Insert);
route.put(`${about}/update/:id`, auth, AboutConttroller.Update);
route.put(`${about}/updateImages/:id`, auth, AboutConttroller.UpdateImages);

route.delete(`${about}/delete/:id`, auth, AboutConttroller.Delete);

route.get(`${about}/selAll`, AboutConttroller.SelectAll);
route.get(`${about}/selOne/:id`, AboutConttroller.SelectOne);

const category = `/category`;
route.get(`${category}/selAll`, CategoryController.SelectAll);
route.get(`${category}/selOne/:id`, CategoryController.SelectOne);

route.post(`${category}/insert`, auth, CategoryController.Insert);

route.put(`${category}/update/:id`, auth, CategoryController.Update);

route.delete(`${category}/delete/:id`, auth, CategoryController.Delete);

const comment = `/comment`;
route.get(`${comment}/selAll`, CommentController.SelectAll);
route.get(`${comment}/selOne/:id`, CommentController.SelectOne);

route.post(`${comment}/insert`, CommentController.Insert);

route.put(`${comment}/update/:id`, CommentController.Update);

route.delete(`${comment}/delete/:id`, CommentController.Delete);

const services = `/services`;
route.get(`${services}/selAll`, ServicesController.SelectAll);
route.get(`${services}/selOne/:id`, ServicesController.SelectOne);
route.get(
  `${services}/selByCategoryId/:id`,
  ServicesController.SelectByCategoryId
);
route.get(`${services}/search`, ServicesController.Search);

route.post(`${services}/insert`, auth, ServicesController.Insert);

route.put(`${services}/update/:id`, auth, ServicesController.Update);
route.put(`${services}/updateImage/:id`, auth, ServicesController.UpdateImage);
route.put(`${services}/updateFile/:id`, auth, ServicesController.UpdateFile);

route.delete(`${services}/delete/:id`, auth, ServicesController.Delete);

const banner = `/banner`;

route.get(`${banner}/selAll`, BannerController.SelectAll);
route.get(`${banner}/selOne/:id`, BannerController.SelectOne);
route.get(
  `${banner}/selByServiceId/:id`,
  BannerController.SelectionByServiceId
);
route.get(`${banner}/selByIsPublished`, BannerController.SelectisPublished);

route.post(`${banner}/insert`, auth, BannerController.Insert);

route.put(`${banner}/update/:id`, auth, BannerController.Update);
route.put(`${banner}/updateImage/:id`, auth, BannerController.UpdateImage);
route.put(`${banner}/updateFile/:id`, auth, BannerController.UpdateFile);
route.put(
  `${banner}/updateIsPublished/:id`,
  auth,
  BannerController.UpdateIsPublished
);

route.delete(`${banner}/delete/:id`, auth, BannerController.Delete);

const news = `/news`;

route.get(`${news}/selAll`, NewsController.SelectAll);
route.get(`${news}/selOne/:id`, NewsController.SelectOne);

route.post(`${news}/insert`, auth, NewsController.Insert);

route.put(`${news}/update/:id`, auth, NewsController.Update);
route.put(`${news}/updateImage/:id`, auth, NewsController.UpdateImage);
route.put(`${news}/updateFile/:id`, auth, NewsController.UpdateFile);

route.delete(`${news}/delete/:id`, auth, NewsController.Delete);

const user = `/user`;

route.get(`${user}/selAll`, auth, UserController.SelectAll);
route.get(`${user}/selOne/:id`, auth, UserController.SelectOne);

route.post(`${user}/registor`, UserController.Insert);
route.post(`${user}/login`, UserController.Login);
route.post(`${user}/refreshToken`, UserController.RefreshToken);

route.put(`${user}/update/:id`, auth, UserController.Update);
route.put(`${user}/updateImage/:id`, auth, UserController.UpdateImage);
route.put(`${user}/forgotPassword`, UserController.ForgotPassword);
route.put(`${user}/changePassword/:id`, auth, UserController.ChangePassword);

route.put(
  `${user}/updatePassword/:id`,
  auth,
  supperAdmin,
  UserController.UpdatePassword
);

route.delete(`${user}/delete/:id`, auth, UserController.Delete);

//---------companydata------------------

const companyData = `/companyData`;
route.get(`${companyData}/selAll`, auth, CompanyDataController.SelectAll);
route.post(`${companyData}/insert`, auth, CompanyDataController.Insert);

route.put(`${companyData}/update/:id`, auth, CompanyDataController.Update);
route.put(
  `${companyData}/updateIcon/:id`,
  auth,
  CompanyDataController.UpdateImage
);

route.delete(`${companyData}/delete/:id`, auth, CompanyDataController.Delete);

export default route;
