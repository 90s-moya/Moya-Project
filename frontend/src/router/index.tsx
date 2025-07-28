// src/router/index.tsx

import { useRoutes } from "react-router-dom"
import interviewRoutes from "./routes/interviewRoutes"
import studyRoutes from "./routes/studyRoutes"
import mypageRoutes from "./routes/mypageRoutes"
import authRoutes from "./routes/authRoutes"

export default function AppRouter() {
  const routes = [
    ...interviewRoutes,
    ...studyRoutes,
    ...mypageRoutes,
    ...authRoutes,
  ]

  const element = useRoutes(routes)
  return element
}
