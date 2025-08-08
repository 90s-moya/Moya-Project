// src/pages/mypage/Portfolio.tsx
import React, { useState, useEffect } from 'react';
import MypageLayout from '@/layouts/MypageLayout';
import FileUpload from '@/components/common/FileUpload';
import { useNavigate } from 'react-router-dom';
import DocsApi, { type DocItem } from '@/api/docsApi';
import { Link } from 'react-router-dom';

interface UploadedFile {
  docsId: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  docsStatus: "PORTFOLIO" | "RESUME";
  fileUrl?: string;
}

const Portfolio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'resume' | 'portfolio'>('portfolio');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // 페이지 로드 시 서류 목록 조회
  useEffect(() => {
    fetchDocs();
  }, []);

const fetchDocs = async () => {
  console.log('=== 서류 목록 조회 시작 (Portfolio) ===');
  try {
    const response = await DocsApi.getMyDocs();
    console.log('서류 조회 성공 - 데이터:', response.data);

    // 서버 응답이 배열인지 확인 (GET은 배열, 예외적으로 객체일 수도 있음)
    const docs = Array.isArray(response.data) ? response.data : [response.data];

    // 변환
    const files: UploadedFile[] = docs.map((doc: DocItem) => {
      const fileName = (() => {
        const filename = doc.fileUrl.split('/').pop() || 'Unknown File';
        // UUID 접두사 제거 (e8274ebd-fd4d-44af-80c6-0fa2270bedcd_ 형태)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/;
        return filename.replace(uuidPattern, '');
      })();
      // API 인터셉터에서 이미 전체 URL로 변환됨
      const fileUrl = doc.fileUrl;

      return {
        docsId: doc.docsId,
        fileName,
        fileSize: 0,
        uploadDate: new Date(),
        docsStatus: doc.docsStatus,
        fileUrl
      };
    });

    setUploadedFiles(files);
    console.log('=== 서류 목록 조회 성공 완료 (Portfolio) ===');
  } catch (error: any) {
    console.error('서류 목록 조회 실패:', error);
  }
};

// const handleFileUpload = async (file: File) => {
//   if (!file.type.includes('pdf')) {
//     alert('PDF 파일만 업로드 가능합니다.');
//     return;
//   }

//   setIsLoading(true);
//   try {
//     const response = await DocsApi.uploadDoc(file, 'PORTFOLIO');
//     console.log('파일 업로드 성공 - 응답 데이터:', response.data);

//     const fileUrl = response.data.fileUrl.startsWith('http')
//       ? response.data.fileUrl
//       : `${import.meta.env.VITE_API_URL}${response.data.fileUrl}`;

//     const newFile: UploadedFile = {
//       docsId: response.data.docsId,
//       fileName: file.name,
//       fileSize: file.size,
//       uploadDate: new Date(),
//       docsStatus: response.data.docsStatus,
//       fileUrl
//     };

//     setUploadedFiles(prev => [...prev, newFile]);
//     alert(`${file.name} 파일이 업로드되었습니다.`);
//   } catch (error: any) {
//     console.error('파일 업로드 실패:', error);
//     alert('파일 업로드에 실패했습니다.');
//   } finally {
//     setIsLoading(false);
//   }
// };


const handleFileUpload = async (file: File) => {
  if (!file.type.includes('pdf')) {
    alert('PDF 파일만 업로드 가능합니다.');
    return;
  }

  setIsLoading(true);
  try {
    // FormData 생성 및 로그 확인
    const formData = new FormData();
    formData.append("status", "PORTFOLIO");
    formData.append("file", file);

    console.log("FormData 내용 확인:", [...formData.entries()]); // 여기 추가

    // 업로드 요청
    const response = await DocsApi.uploadDoc(file, "PORTFOLIO");
    console.log('파일 업로드 성공 - 응답 데이터:', response.data);

    // API 인터셉터에서 이미 전체 URL로 변환됨
    const fileUrl = response.data.fileUrl;

    const newFile: UploadedFile = {
      docsId: response.data.docsId,
      fileName: file.name,
      fileSize: file.size,
      uploadDate: new Date(),
      docsStatus: response.data.docsStatus,
      fileUrl
    };

    setUploadedFiles(prev => [...prev, newFile]);
    alert(`${file.name} 파일이 업로드되었습니다.`);
  } catch (error: any) {
    console.error('파일 업로드 실패:', error);
    alert('파일 업로드에 실패했습니다.');
  } finally {
    setIsLoading(false);
  }
};


//////////////

  const handleFileDelete = async (docsId: string) => {
    if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await DocsApi.deleteDoc(docsId);
      setUploadedFiles(prev => prev.filter(file => file.docsId !== docsId));
      alert('파일이 삭제되었습니다.');
    } catch (error: any) {
      console.error('파일 삭제 실패:', error);
      alert('파일 삭제에 실패했습니다.');
    }
  };

  // Portfolio 페이지에서는 PORTFOLIO 타입 파일만 필터링
  const filteredFiles = uploadedFiles.filter(file => file.docsStatus === 'PORTFOLIO');

  return (
    <MypageLayout activeMenu="resume">
      {/* 이력서/포트폴리오 탭 */}
      <div className="flex gap-8 mb-8">
        <Link to="/mypage/resume">
          <button 
            onClick={() => setActiveTab('resume')}
            className={`text-2xl font-semibold leading-[1.4] transition-colors ${
              activeTab === 'resume' ? 'text-[#2B7FFF]' : 'text-[#6F727C] hover:text-[#2B7FFF]'
            }`}
          >
            이력서
          </button>
        </Link>
        <button 
          onClick={() => setActiveTab('portfolio')}
          className={`text-2xl font-semibold leading-[1.4] transition-colors ${
            activeTab === 'portfolio' ? 'text-[#2B7FFF]' : 'text-[#6F727C] hover:text-[#2B7FFF]'
          }`}
        >
          포트폴리오
        </button>
      </div>

      {/* 파일 업로드 영역 */}
      <div className="space-y-8">
        <FileUpload 
          onFileSelect={handleFileUpload}
          type={activeTab}
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
              업로드된 포트폴리오 ({filteredFiles.length}개)
            </h3>
            
            <div className="grid gap-4">
              {filteredFiles.map((uploadedFile) => (
                <div key={uploadedFile.docsId} className="bg-white border border-[#EFEFF3] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 파일 아이콘 */}
                    <div className="w-12 h-12 bg-[#2B7FFF] rounded-lg flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    
                    {/* 파일 정보 */}
                    <div>
                      <p className="font-semibold text-[#1B1C1F]">{uploadedFile.fileName}</p>
                      <p className="text-sm text-[#6F727C]">
                        {uploadedFile.fileSize > 0 ? `${(uploadedFile.fileSize / 1024 / 1024).toFixed(2)} MB • ` : ''}
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
            <p className="text-[#6F727C]">
              아직 업로드된 포트폴리오가 없습니다.
            </p>
          </div>
        )}
      </div>
    </MypageLayout>
  );
};

export default Portfolio;