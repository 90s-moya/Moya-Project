import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  type: 'resume' | 'portfolio';
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  accept = ".pdf,.doc,.docx", 
  maxSize = 10,
  type 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`파일 크기가 ${maxSize}MB를 초과합니다.`);
      return;
    }
    
    setUploadedFile(file);
    onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (uploadedFile) {
    return (
      <div className="w-full max-w-[880px] h-[360px] bg-[#FAFAFC] border border-[#EFEFF3] rounded-[10px] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* 파일 아이콘 */}
          <div className="w-16 h-16 bg-[#2B7FFF] rounded-lg flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {/* 파일 정보 */}
          <div className="text-center">
            <p className="text-[#1B1C1F] font-semibold text-lg mb-1">{uploadedFile.name}</p>
            <p className="text-[#6F727C] text-sm">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          
          {/* 버튼들 */}
          <div className="flex gap-3">
            <button 
              onClick={handleButtonClick}
              className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-4 py-2 rounded-[10px] text-sm font-semibold transition-colors"
            >
              파일 변경
            </button>
            <button 
              onClick={handleRemoveFile}
              className="bg-[#EFEFF3] hover:bg-[#E0E0E6] text-[#404249] px-4 py-2 rounded-[10px] text-sm font-semibold transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div 
      className={`w-full max-w-[880px] h-[360px] rounded-[10px] flex flex-col items-center justify-center border-2 border-dashed transition-colors cursor-pointer ${
        isDragOver 
          ? 'bg-[#F0F7FF] border-[#2B7FFF]' 
          : 'bg-[#FAFAFC] border-[#EFEFF3] hover:border-[#2B7FFF] hover:bg-[#F0F7FF]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <div className="flex flex-col items-center gap-4">
        {/* 업로드 아이콘 */}
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#989AA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7,10 12,5 17,10" stroke="#989AA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="5" x2="12" y2="15" stroke="#989AA2" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        
        {/* 메시지 */}
        <div className="text-center">
          <p className="text-[#1B1C1F] font-semibold text-lg mb-2">
            {type === 'resume' ? '이력서' : '포트폴리오'} 파일을 업로드하세요
          </p>
          <p className="text-[#6F727C] text-sm mb-1">
            파일을 드래그해서 놓거나 클릭해서 선택하세요
          </p>
          <p className="text-[#989AA2] text-xs">
            지원 형식: PDF, DOC, DOCX (최대 {maxSize}MB)
          </p>
        </div>
        
        {/* 등록 버튼 */}
        <button 
          className="bg-[#2B7FFF] hover:bg-[#1E6FE8] text-white px-6 py-3 rounded-[10px] text-sm font-semibold transition-colors"
        >
          {type === 'resume' ? '이력서 등록하기' : '포트폴리오 등록하기'}
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default FileUpload;