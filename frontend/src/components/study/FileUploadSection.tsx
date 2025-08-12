import type { MyDoc } from "@/types/study";

interface FileUploadProps {
  label: string;
  defaultFiles?: MyDoc[];
}

export default function FileUploadSection({
  label,
  defaultFiles,
}: FileUploadProps) {
  return (
    <div>
      <label htmlFor="doc-type">{label}</label>
      <select name="" id="doc-type">
        {defaultFiles?.map((file) => (
          <option value="">{file.fileUrl}</option>
        ))}
      </select>
    </div>
  );
}
