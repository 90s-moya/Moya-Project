// src/api/docsApi.ts
import api from "@/api/index";

export interface DocItem {
  docsId: string;
  userId: string;
  fileUrl: string;
  docsStatus: "PORTFOLIO" | "RESUME";
}

export interface ReportItem {
  reportId: string;
  userId: string;
  reportStatus: "COMPLETED" | "PROCESSING" | "FAILED";
  reportUrl: string;
}

const DocsApi = {
  // 내 서류 리스트 조회
  getMyDocs() {
    return api.get<DocItem[]>("/v1/docs/me");
  },

  // 서류 등록 (파일 업로드)
  uploadDoc(file: File, status: "PORTFOLIO" | "RESUME") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("status", status);

    return api.post<DocItem>("/v1/docs/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // 서류 삭제
  deleteDoc(docsId: string) {
    return api.delete(`/api/v1/docs/${docsId}`);
  },


};

export default DocsApi;