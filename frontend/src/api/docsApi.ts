// src/api/docsApi.ts
import api from "@/api/index";

export type DocItem = {
  docsId: string;
  userId: string;
  fileUrl: string;
  docsStatus: "PORTFOLIO" | "RESUME";
};

const DocsApi = {
  // 내 서류 리스트 조회
  getMyDocs() {
    return api.get<DocItem[]>("/v1/docs/me");
  },

  // 서류 업로드
  uploadDoc(file: File, status: "PORTFOLIO" | "RESUME") {
    const formData = new FormData();
    // 백엔드 파라미터 이름과 동일하게
    formData.append("file", file);
    formData.append("status", status);

    // 백엔드가 `/v1/docs/` 를 매핑하므로 마지막 `/` 포함
    return api.post<DocItem>("/v1/docs/", formData, {
      withCredentials: false, // 파일 업로드는 쿠키 필요 없음
    });
  },

  // 서류 삭제
  deleteDoc(docsId: string) {
    return api.delete(`/v1/docs/${docsId}`);
  },
};

export default DocsApi;
