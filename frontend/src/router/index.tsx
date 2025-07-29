// src/router/index.tsx

import { useRoutes, type RouteObject } from "react-router-dom";

import authRoutes from "./routes/authRoutes";
import interviewRoutes from "./routes/interviewRoutes";
import studyRoutes from "./routes/studyRoutes";
import mypageRoutes from "./routes/mypageRoutes";
import HomePage from "@/pages/HomePage";

const routes: RouteObject[] = [
  ...authRoutes,
  ...interviewRoutes,
  ...studyRoutes,
  ...mypageRoutes,
  {
    path: "/",
    element: <HomePage />,
  },
];
export default function AppRoutes() {
  return useRoutes(routes);
}