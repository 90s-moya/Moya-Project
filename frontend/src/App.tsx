import { useState } from "react"

// 페이지 컴포넌트들 import
import HomePage from "./pages/HomePage"
import InterviewStartPage from "./pages/interview/InterviewStartPage"
import InterviewPage from "./pages/interview/InterviewPage"
import InterviewSetupPage from "./pages/interview/InterviewSetupPage"
import InterviewSetupCompletionPage from "./pages/interview/InterviewSetupCompletionPage"
import InterviewModeListPage from "./pages/interview/InterviewModeListPage"
import InterviewDocumentListPage from "./pages/interview/InterviewDocumentListPage"

import StudyListPage from "./pages/study/StudyListPage"
import StudyDetailPage from "./pages/study/StudyDetailPage"
import StudyInterviewerPage from "./pages/study/StudyInterviewerPage"
import StudySetupPage from "./pages/study/StudySetupPage"

const pages = {
  HomePage: <HomePage />,
  InterviewStartPage: <InterviewStartPage />,
  InterviewPage: <InterviewPage />,
  InterviewSetupPage: <InterviewSetupPage />,
  InterviewSetupCompletionPage: <InterviewSetupCompletionPage />,
  InterviewModeListPage: <InterviewModeListPage />,
  InterviewDocumentListPage: <InterviewDocumentListPage />,
  StudyListPage: <StudyListPage />,
  StudyDetailPage: <StudyDetailPage />,
  StudyInterviewerPage: <StudyInterviewerPage />,
  StudySetupPage: <StudySetupPage />,
}

function App() {
  const [selectedPage, setSelectedPage] = useState<keyof typeof pages>("HomePage")

  return (
    <div className="min-h-screen p-4">
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.keys(pages).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedPage(key as keyof typeof pages)}
            className={`px-4 py-2 border rounded ${
              selectedPage === key ? "bg-blue-500 text-white" : "bg-white text-black"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="border rounded p-6 bg-gray-50 shadow">{pages[selectedPage]}</div>
    </div>
  )
}

export default App
