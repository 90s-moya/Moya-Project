// src/router/routes/homeRoutes.tsx
import type { RouteObject } from "react-router-dom";

import UserInfo from "@/pages/mypage/UserInfo";
import Resume from "@/pages/mypage/Resume";
import Portfolio from "@/pages/mypage/Portfolio";
import ReportList from "@/pages/mypage/ReportList";
import ResultDetail from "@/pages/mypage/ResultDetail";
import Feedback from "@/pages/mypage/Feedback";
import FeedbackDetail from "@/pages/mypage/FeedbackDetail";

const mypageRoutes: RouteObject[] = [
    {path: "/mypage/userinfo", element: <UserInfo />},
    {path: "/mypage/resume", element: <Resume />},
    {path: "/mypage/portfolio", element: <Portfolio />},
    {path: "/mypage/result", element: <ReportList />},
    {path: "/mypage/result/:reportId/:resultId", element: <ResultDetail />},
    {path: "/mypage/feedback", element: <Feedback />},
    {path: "/mypage/feedback/:id", element: <FeedbackDetail />},
]
export default mypageRoutes;
