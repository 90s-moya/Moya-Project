import { useFileStore } from "@/store/useFileStore";
import type { MyDoc } from "@/types/study";
import { Plus } from "lucide-react";
import { useRef } from "react";

interface FileUploadProps {
  label: string;
  type: "resume" | "introduction" | "portfolio";
  defaultFiles?: MyDoc[];
}

export default function FileUploadSection({
  label,
  type,
  defaultFiles,
}: FileUploadProps) {
  // const file = useFileStore((state) => state[type]);
  const setFile = useFileStore((state) => state.setFile);
  // const inputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 함수
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (selectedFile) {
      // 용량 제한
      if (selectedFile.size > 3 * 1024 * 1024) {
        alert("3MB 이하 파일만 업로드할 수 있습니다.");
        return;
      }

      // setFile(type, selectedFile); // zustand에 저장
    }
  };

  return (
    <div>
      <label htmlFor="doc-type">이력서 선택</label>
      <select name="" id="doc-type">
        {/* {defaultFiles?.map((file))} */}
      </select>
      {/* <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleChange}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="flex justify-between items-center bg-gray-100 hover:bg-gray-200 transition cursor-pointer rounded-xl px-8 py-6"
      >
        <span className="text-xl font-medium">{label} (3MB 이하)</span>
        <Plus className="w-7 h-7 text-gray-600" />
      </div>

      {file && (
        <div className="mt-2 text-lg text-gray-600 flex justify-between items-center px-2 py-2">
          <span>✅ {file.name}</span>
          <button
            onClick={() => setFile(type, null)}
            className="bg-red-500 text-lg text-white hover:bg-red-600 px-3 py-1 rounded-xl transition"
          >
            삭제
          </button>
        </div>
      )} */}
    </div>
  );
}
