import React, { useState } from 'react';
import Header from '@/components/common/Header';
import Sidebar from '@/components/mypage/Sidebar';
import FileUpload from '@/components/common/FileUpload';
import { useNavigate } from 'react-router-dom';

interface UploadedFile {
  id: string;
  file: File;
  uploadDate: Date;
}

const Portfolio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'resume' | 'portfolio'>('portfolio');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const navigate = useNavigate();

  const handleFileUpload = (file: File) => {
    const newFile: UploadedFile = {
      id: Date.now().toString(),
      file,
      uploadDate: new Date()
    };
    
    setUploadedFiles(prev => [...prev, newFile]);
    console.log('업로드된 파일:', file);
    // TODO: 실제 서버 업로드 로직 구현
    alert(`${file.name} 파일이 업로드되었습니다.`);
  };

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

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
              accept={activeTab === 'resume' ? '.pdf,.doc,.docx' : '.pdf,.doc,.docx,.ppt,.pptx'}
              maxSize={10}
            />

            {/* 업로드된 파일 목록 */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1B1C1F]">
                  업로드된 {activeTab === 'resume' ? '이력서' : '포트폴리오'} ({uploadedFiles.length}개)
                </h3>
                
                <div className="grid gap-4">
                  {uploadedFiles.map((uploadedFile) => (
                    <div key={uploadedFile.id} className="bg-white border border-[#EFEFF3] rounded-xl p-4 flex items-center justify-between">
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
                          <p className="font-semibold text-[#1B1C1F]">{uploadedFile.file.name}</p>
                          <p className="text-sm text-[#6F727C]">
                            {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.uploadDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => handleFileDelete(uploadedFile.id)}
                        className="bg-[#EFEFF3] hover:bg-[#E0E0E6] text-[#404249] px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
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