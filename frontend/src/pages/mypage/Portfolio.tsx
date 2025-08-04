import React, { useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import Sidebar from '@/components/mypage/Sidebar';
import FileUpload from '@/components/common/FileUpload';
import { useNavigate } from 'react-router-dom';
import DocsApi, { type DocItem } from '@/api/docsApi';

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
    console.log('현재 토큰:', localStorage.getItem('auth-storage'));
    try {
      console.log('DocsApi.getMyDocs 호출 시작');
      const response = await DocsApi.getMyDocs();
      console.log('서류 조회 성공 - 전체 응답:', response);
      console.log('서류 조회 성공 - 상태코드:', response.status);
      console.log('서류 조회 성공 - 데이터:', response.data);
      
      const docs = Array.isArray(response.data) ? response.data : [response.data];
      console.log('처리된 docs 배열:', docs);
      
      const files: UploadedFile[] = docs.map((doc: DocItem) => ({
        docsId: doc.docsId,
        fileName: doc.fileUrl.split('\\').pop() || doc.fileUrl.split('/').pop() || 'Unknown File',
        fileSize: 0, // 서버에서 파일 크기 정보가 없음
        uploadDate: new Date(), // 서버에서 업로드 날짜 정보가 없음
        docsStatus: doc.docsStatus,
        fileUrl: doc.fileUrl.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_API_URL}${doc.fileUrl}`
      }));
      
      console.log('생성된 files 배열:', files);
      console.log('상태 업데이트 시작');
      setUploadedFiles(files);
      console.log('=== 서류 목록 조회 성공 완료 (Portfolio) ===');
    } catch (error: any) {
      console.log('=== 서류 목록 조회 실패 (Portfolio) ===');
      console.error('조회 에러 전체 정보:', error);
      console.error('조회 에러 타입:', error.name);
      console.error('조회 에러 메시지:', error.message);
      console.error('조회 HTTP 상태:', error.response?.status);
      console.error('조회 응답 데이터:', error.response?.data);
      console.error('조회 요청 URL:', error.config?.url);
      console.log('=== 서류 목록 조회 실패 완료 (Portfolio) ===');
    }
  };

  const handleFileUpload = async (file: File) => {
    // PDF 파일만 허용
    console.log('업로드할 파일:', file.name, file.type, file.size);
    if (!file.type.includes('pdf')) {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('업로드 시작 - 파일:', file);
      console.log('업로드 시작 - status:', 'PORTFOLIO');
      // Portfolio 페이지에서는 항상 PORTFOLIO 타입으로만 업로드
      const response = await DocsApi.uploadDoc(file, 'PORTFOLIO');
      console.log('파일 업로드 성공 - 전체 응답:', response);
      console.log('파일 업로드 성공 - 응답 데이터:', response.data);
      const newFile: UploadedFile = {
        docsId: response.data.docsId,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date(),
        docsStatus: response.data.docsStatus,
        fileUrl: response.data.fileUrl?.startsWith('http') ? response.data.fileUrl : `${import.meta.env.VITE_API_URL}${response.data.fileUrl}`
      };
      
      console.log('새 파일 객체:', newFile);
      
      setUploadedFiles(prev => [...prev, newFile]);
      alert(`${file.name} 파일이 업로드되었습니다.`);
    } catch (error: any) {
      console.error('파일 업로드 실패 - 전체 에러:', error);
      console.error('파일 업로드 실패 - 응답 상태:', error.response?.status);
      console.error('파일 업로드 실패 - 응답 데이터:', error.response?.data);
      console.error('파일 업로드 실패 - 에러 메시지:', error.message);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSidebarNavigation = (menu: string) => {
    navigate(`/mypage/${menu}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 메인 콘텐츠 */}
      <div className="flex max-w-7xl mx-auto px-8 py-12 pt-32">
        <Sidebar activeMenu="resume" onNavigate={handleSidebarNavigation} />

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1">
          {/* 이력서/포트폴리오 탭 */}
          <div className="flex gap-8 mb-8">
            <button 
              onClick={() => setActiveTab('resume')}
              className={`text-2xl font-semibold leading-[1.4] transition-colors ${
                activeTab === 'resume' ? 'text-[#2B7FFF]' : 'text-[#6F727C] hover:text-[#2B7FFF]'
              }`}
            >
              이력서
            </button>
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
        </main>
      </div>

      {/* 프로필 아이콘 (우하단 고정) */}
      <div className="fixed bottom-12 right-12">
        <div className="w-15 h-15 bg-white rounded-full border border-[#EFEFF3] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 9C0 9 0 18 8.5 18C17 18 17 9 17 9" stroke="#6F727C" strokeWidth="2.5"/>
              <path d="M8.5 0.5V18.5" stroke="#6F727C" strokeWidth="2.5"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;