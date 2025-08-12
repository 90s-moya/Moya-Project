import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import type { EditableTitleProps } from '@/types/result';

const EditableTitle: React.FC<EditableTitleProps> = ({ reportId, title, onTitleChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleEdit = () => {
    setIsEditing(true);
    setEditTitle(title);
  };

  const handleSave = async () => {
    try {
      // API 호출로 제목 수정
      // await updateReportTitle(reportId, editTitle);
      console.log('제목 수정:', reportId, editTitle);
      
      // 부모 상태 업데이트
      onTitleChange(reportId, editTitle);
      setIsEditing(false);
    } catch (error) {
      console.error('제목 수정 실패:', error);
      setEditTitle(title); // 원래 제목으로 복원
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-xl font-semibold text-[#1b1c1f] bg-transparent border-b-2 border-[#2B7FFF] focus:outline-none focus:border-[#2B7FFF] px-1"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
          aria-label="저장"
        >
          <Check size={16} />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
          aria-label="취소"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h3 className="text-xl font-semibold text-[#1b1c1f]">{title}</h3>
      <button
        onClick={handleEdit}
        className="p-1 text-gray-400 hover:text-[#2B7FFF] hover:bg-blue-50 rounded transition-colors"
        aria-label="제목 수정"
      >
        <Edit2 size={16} />
      </button>
    </div>
  );
};

export default EditableTitle;
