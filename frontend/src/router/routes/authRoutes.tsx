// src/router/routes/homeRoutes.tsx
import type { RouteObject } from "react-router-dom";
import Login from "../../pages/auth/Login";

const authRoutes: RouteObject[] = [
  { path: "/login", element: <Login /> },

];

export default authRoutes;

