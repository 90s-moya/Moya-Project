// interviewRoutes.tsx
import type { RouteObject } from "react-router-dom";
import InterviewStartPage from "@/pages/interview/InterviewStartPage";
import InterviewDocumentListPage from "@/pages/interview/InterviewDocumentListPage";
import InterviewModeListPage from "@/pages/interview/InterviewModeListPage";
import InterviewSetupPage from "@/pages/interview/InterviewSetupPage";
import InterviewPage from "@/pages/interview/InterviewPage";

const interviewRoutes: RouteObject[] = [
    {
        path: "interview/start",
        element: <InterviewStartPage />,
    },
    {
        path: "interview/documentlist",
        element: <InterviewDocumentListPage />,
    },
    {
        path: "interview/modelist",
        element: <InterviewModeListPage />,
    },
    {
        path: "interview/setup",
        element: <InterviewSetupPage />,
    },
    {
        path: "interview",
        element: <InterviewPage />,
    },
];
export default interviewRoutes;
