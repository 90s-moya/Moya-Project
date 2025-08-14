// src/router/index.tsx

import { useRoutes, type RouteObject } from "react-router-dom";

import authRoutes from "./routes/authRoutes";
import interviewRoutes from "./routes/interviewRoutes";
import studyRoutes from "./routes/studyRoutes";
import mypageRoutes from "./routes/mypageRoutes";
import HomePage from "@/pages/HomePage";
import ProtectedRoute from "./routes/ProtectedRoute";

const [studyPublic, ...studyPrivate] = studyRoutes;
const routes: RouteObject[] = [
  // 공개
  ...authRoutes,
  studyPublic,
  {
    path: "/",
    element: <HomePage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      ...interviewRoutes,
      ...studyPrivate,
      ...mypageRoutes,
      // 필요하면 다른 라우트도 여기로
    ],
  },

];
export default function AppRoutes() {
  return useRoutes(routes);
}
