import TestPage from "@/pages/TestPage";
import type { RouteObject } from "react-router-dom";

const testRoutes: RouteObject[] = [
  {
    path: "/test",
    element: <TestPage></TestPage>,
  },
];

export default testRoutes;
