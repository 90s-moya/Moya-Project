// src/router/routes/homeRoutes.tsx
import type { RouteObject } from "react-router-dom";

import UserInfo from "@/pages/mypage/UserInfo";
import Resume from "@/pages/mypage/Resume";
import Portfolio from "@/pages/mypage/Portfolio";
import Result from "@/pages/mypage/Result";
import Feedback from "@/pages/mypage/Feedback";
import FeedbackDetail from "@/pages/mypage/FeedbackDetail";
import CoverLetter from "@/pages/mypage/CoverLetter";

export const mypageRoutes: RouteObject[] = [
  { path: "/mypage/userinfo", element: <UserInfo /> },
  { path: "/mypage/resume", element: <Resume /> },
  { path: "/mypage/portfolio", element: <Portfolio /> },
  { path: "/mypage/result", element: <Result /> },
  { path: "/mypage/feedback", element: <Feedback /> },
  { path: "/mypage/feedback/:id", element: <FeedbackDetail /> },
  {
    path: "/mypage/coverletter",
    element: <CoverLetter />,
  },
];
export default mypageRoutes;
