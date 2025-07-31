// src/router/routes/homeRoutes.tsx
import type { RouteObject } from "react-router-dom";
import Login from "../../pages/auth/Login";
import Signup from "../../pages/auth/Signup";
import SignupDetail from "../../pages/auth/SignupDetail";
import LoginSucceeded from "../../pages/auth/LoginSucceeded";

const authRoutes: RouteObject[] = [
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Signup />},
  { path: "/signup/detail", element: <SignupDetail /> }, 
  { path: "/succeeded", element: <LoginSucceeded /> },
];

export default authRoutes;

