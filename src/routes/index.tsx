import { Routes } from "react-router-dom";
import { adminRoutes } from "./admin-routes";
import { publicRoutes } from "./public-routes";

const AppRoutes = () => <Routes>{publicRoutes}{adminRoutes}</Routes>;

export default AppRoutes;
