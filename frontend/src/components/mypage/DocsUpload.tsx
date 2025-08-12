import React, { useState, useEffect } from "react";
import MypageLayout from "@/layouts/MypageLayout";
import FileUpload from "@/components/common/FileUpload";
import { Link } from "react-router-dom";
import DocsApi, { type DocItem } from "@/api/docsApi";

interface UploadedFile {
  docsId: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  docsStatus: "PORTFOLIO" | "RESUME" | "COVERLETTER";
  fileUrl?: string;
}

interface DocsUploadProps {
  type: "resume" | "portfolio" | "coverletter";
  title: string;
  uploadStatus: "RESUME" | "PORTFOLIO" | "COVERLETTER";
}

const DocsUpload: React.FC<DocsUploadProps> = ({
  type,
  title,
  uploadStatus,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const response = await DocsApi.getMyDocs();

      if (Array.isArray(response.data) && response.data.length > 0) {
        const filteredDocs = response.data.filter(
          (doc: DocItem) => doc.docsStatus === uploadStatus
        );

        if (filteredDocs.length > 0) {
          const files: UploadedFile[] = filteredDocs.map((doc: DocItem) => {
            // fileUrl이 null이거나 undefined인 경우 처리
            if (!doc.fileUrl) {
              console.warn("fileUrl이 null인 문서 발견:", doc);
              return {
                docsId: doc.docsId,
                fileName: "Unknown File",
                fileSize: 0,
                uploadDate: new Date(),
                docsStatus: doc.docsStatus,
                fileUrl: "",
              };
            }

            const urlParts = doc.fileUrl.split("/");
            const filename = urlParts[urlParts.length - 1] || "Unknown File";
            const uuidPattern =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/;
            const cleanFileName = filename.replace(uuidPattern, "");

            return {
              docsId: doc.docsId,
              fileName: cleanFileName,
              fileSize: 0,
              uploadDate: new Date(),
              docsStatus: doc.docsStatus,
              fileUrl: doc.fileUrl,
            };
          });

          setUploadedFiles(files);
        } else {
          setUploadedFiles([]);
        }
      } else {
        setUploadedFiles([]);
      }
    } catch (error: unknown) {
      // 타입 안전성을 위해 더 구체적인 타입 사용
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) {
        setUploadedFiles([]);
      } else {
        console.error("조회 에러:", error);
        setUploadedFiles([]);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes("pdf")) {
      alert("PDF 파일만 업로드 가능합니다.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await DocsApi.uploadDoc(file, uploadStatus);

      await fetchDocs();
      alert(`${file.name} 파일이 업로드되었습니다.`);
    } catch (error: unknown) {
      console.error("파일 업로드 실패:", error);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDelete = async (docsId: string) => {
    if (!confirm("정말로 이 파일을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await DocsApi.deleteDoc(docsId);
      setUploadedFiles((prev) => prev.filter((file) => file.docsId !== docsId));
      alert("파일이 삭제되었습니다.");
    } catch (error: unknown) {
      console.error("파일 삭제 실패:", error);
      alert("파일 삭제에 실패했습니다.");
    }
  };

  const getNavigationLinks = () => {
    const links = [
      { key: "resume", label: "이력서", path: "/mypage/resume" },
      { key: "portfolio", label: "포트폴리오", path: "/mypage/portfolio" },
      { key: "coverletter", label: "자기소개서", path: "/mypage/coverletter" },
    ];

    return links.map((link) => (
      <Link key={link.key} to={link.path}>
        <button
          className={`text-2xl font-semibold leading-[1.4] transition-colors ${
            type === link.key
              ? "text-[#2B7FFF]"
              : "text-[#6F727C] hover:text-[#2B7FFF]"
          }`}
        >
          {link.label}
        </button>
      </Link>
    ));
  };

  const filteredFiles = uploadedFiles.filter(
    (file) => file.docsStatus === uploadStatus
  );

  return (
    <MypageLayout activeMenu="resume">
      {/* 탭 네비게이션 */}
      <div className="flex gap-8 mb-8">{getNavigationLinks()}</div>

      {/* 파일 업로드 영역 */}
      <div className="space-y-8">
        <FileUpload
          onFileSelect={handleFileUpload}
          type={type}
          accept=".pdf"
          maxSize={10}
        />

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="text-center py-4">
            <p className="text-[#6F727C]">파일을 업로드하는 중...</p>
          </div>
        )}

        {/* 업로드된 파일 목록 */}
        {filteredFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#1B1C1F]">
              업로드된 {title} ({filteredFiles.length}개)
            </h3>

            <div className="grid gap-4">
              {filteredFiles.map((uploadedFile) => (
                <div
                  key={uploadedFile.docsId}
                  className="bg-white border border-[#EFEFF3] rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* 파일 아이콘 */}
                    <div className="w-12 h-12 bg-[#2B7FFF] rounded-lg flex items-center justify-center">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="14,2 14,8 20,8"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    {/* 파일 정보 */}
                    <div>
                      <p className="font-semibold text-[#1B1C1F]">
                        {uploadedFile.fileName}
                      </p>
                      <p className="text-sm text-[#6F727C]">
                        {uploadedFile.fileSize > 0
                          ? `${(uploadedFile.fileSize / 1024 / 1024).toFixed(
                              2
                            )} MB • `
                          : ""}
                        {uploadedFile.uploadDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleFileDelete(uploadedFile.docsId)}
                    className="bg-[#EFEFF3] hover:bg-[#E0E0E6] text-[#404249] px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 메시지 */}
        {!isLoading && filteredFiles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#6F727C]">아직 업로드된 {title}가 없습니다.</p>
          </div>
        )}
      </div>
    </MypageLayout>
  );
};

export default DocsUpload;
