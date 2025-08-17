// interviewRoutes.tsx

import type { RouteObject } from "react-router-dom";
import InterviewStartPage from "@/pages/interview/InterviewStartPage";
import InterviewFileSelectPage from "@/pages/interview/InterviewFileSelectPage";
import InterviewModeListPage from "@/pages/interview/InterviewModeListPage";
import InterviewSetupPage from "@/pages/interview/InterviewSetupPage";
import InterviewPage from "@/pages/interview/InterviewPage";
import InterviewFinishPage from "@/pages/interview/InterviewFinishPage";

const interviewRoutes: RouteObject[] = [
    {
        path: "interview/start",
        element: <InterviewStartPage />,
    },
    {
        path: "interview/fileselect",
        element: <InterviewFileSelectPage/>
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
    {
        path: "interview/finish",
        element: <InterviewFinishPage />,
    },
];
export default interviewRoutes;
