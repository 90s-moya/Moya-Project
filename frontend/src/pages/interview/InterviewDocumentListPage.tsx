"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function DocumentUpload() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("이력서")
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File[] }>({
    이력서: [],
    포트폴리오: [],
    자기소개서: [],
  })

  const tabs = ["이력서", "포트폴리오", "자기소개서"]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const pdfFiles = files.filter((file) => file.type === "application/pdf")
    setUploadedFiles((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], ...pdfFiles],
    }))
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    const pdfFiles = files.filter((file) => file.type === "application/pdf")
    setUploadedFiles((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], ...pdfFiles],
    }))
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((_, i) => i !== index),
    }))
  }

  const handleNext = () => {
    navigate("/interview/modelist")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-blue-500">MOYA</div>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">AI 모의 면접</a>
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">면접 스터디</a>
            <a href="#" className="text-gray-700 hover:text-blue-500 font-medium">마이페이지</a>
          </nav>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">로그인</span>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">00님</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">AI와 함께할 서류를 선택해주세요</h1>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-0 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-gray-200 rounded-lg p-8 mb-8">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[0, 1, 2].map((index) => {
              const file = uploadedFiles[activeTab][index]
              return file ? (
                <div key={index} className="bg-white rounded-lg p-4 border-2 border-gray-300 relative group">
                  <div className="flex flex-col items-center justify-center h-32">
                    <FileText className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-xs text-gray-600 text-center truncate w-full">{file.name}</p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div key={index} className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-200 h-32 flex items-center justify-center">
                  <p className="text-gray-300 text-sm">빈 슬롯</p>
                </div>
              )
            })}

            {/* Upload Slot */}
            <div
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <div className="flex flex-col items-center justify-center h-32 p-4">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 text-center">새 서류를 업로드하세요</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-4">여러 서류를 업로드하세요</p>
            <input id="file-upload" type="file" accept=".pdf" multiple onChange={handleFileUpload} className="hidden" />
            <Button
              onClick={() => document.getElementById("file-upload")?.click()}
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              파일 선택
            </Button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex justify-between items-center">
          <div className="text-gray-500">1/4</div>
          <Button onClick={handleNext} className="bg-blue-500 hover:bg-blue-600 text-white px-8">
            다음
          </Button>
        </div>
      </main>
    </div>
  )
}
