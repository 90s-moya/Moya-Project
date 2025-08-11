import React from "react";
import DocsUpload from "@/components/mypage/DocsUpload";

const CoverLetter: React.FC = () => {
  return (
    <DocsUpload
      type="coverletter"
      title="자기소개서"
      uploadStatus="COVERLETTER"
    />
  );
};

export default CoverLetter;
