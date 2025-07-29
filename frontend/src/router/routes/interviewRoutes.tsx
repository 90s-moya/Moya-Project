// interviewRoutes.tsx
import type { RouteObject } from "react-router-dom";
import InterviewStartPage from "@/pages/interview/InterviewStartPage";
import InterviewSetupPage from "@/pages/interview/InterviewSetupPage";
import InterviewSetupCompletionPage from "@/pages/interview/InterviewSetupCompletionPage";


const interviewRoutes: RouteObject[] = [
    {
        path: "interview/start",
        element: <InterviewStartPage />,
    },
    {
        path: "interview/setup",
        element: <InterviewSetupPage />,
    },
    {
        path: "interview/setup/completion",
        element: <InterviewSetupCompletionPage />,
    },
];
export default interviewRoutes;
