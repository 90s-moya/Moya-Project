import React from "react";
import DocsUpload from "@/components/mypage/DocsUpload";

const Resume: React.FC = () => {
  return <DocsUpload type="resume" title="이력서" uploadStatus="RESUME" />;
};

export default Resume;
