import React from "react";
import DocsUpload from "@/components/mypage/DocsUpload";

const Portfolio: React.FC = () => {
  return (
    <DocsUpload type="portfolio" title="포트폴리오" uploadStatus="PORTFOLIO" />
  );
};

export default Portfolio;
