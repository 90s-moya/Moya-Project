// src/router/routes/homeRoutes.tsx
import type { RouteObject } from "react-router-dom";
import StudyListPage from "@/pages/study/StudyListPage";
import StudyCreatePage from "@/pages/study/StudyCreatePage";
import StudyDetailPage from "@/pages/study/StudyDetailPage";
import StudySetupPage from "@/pages/study/StudySetupPage";
import StudyRoomPage from "@/pages/study/StudyRoomPage";

const studyRoutes: RouteObject[] = [
  {
    path: "study",
    element: <StudyListPage />,
  },
  {
    path: "study/create",
    element: <StudyCreatePage />,
  },
  {
    path: "study/detail/:id",
    element: <StudyDetailPage />,
  },
  {
    path: "study/setup/:id",
    element: <StudySetupPage />,
  },
  {
    path: "study/room/:roomId",
    element: <StudyRoomPage></StudyRoomPage>,
  },
];

export default studyRoutes;
