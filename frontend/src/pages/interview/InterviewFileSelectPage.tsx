// src/pages/interview/InterviewFileSelectPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DocsApi from "@/api/docsApi";
import { extractTextFromPdf } from "@/api/interviewApi";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/Header";

type DocItem = {
  docsId: string;
  userId: string;
  fileUrl: string; // 백엔드가 내려주는 원본 URL(여기에 api-dev가 포함될 수 있음)
  docsStatus: "PORTFOLIO" | "RESUME" | "COVERLETTER";
};

type DocUrls = {
  resumeUrl?: string;
  portfolioUrl?: string;
  coverletterUrl?: string;
};

type DocType = "RESUME" | "PORTFOLIO" | "COVERLETTER";

const STATUS_LABEL: Record<DocType, string> = {
  RESUME: "이력서",
  PORTFOLIO: "포트폴리오",
  COVERLETTER: "자기소개서",
};

/** api-dev가 들어간 원본 URL을 파일 접근 도메인으로 치환 */
function toFileUrl(originalUrl: string) {
  const apiBase = import.meta.env.VITE_API_URL || "";   // e.g. https://.../api-dev
  const fileBase = import.meta.env.VITE_FILE_URL || ""; // e.g. https://...
  if (!originalUrl) return originalUrl;
  return originalUrl.startsWith(apiBase)
    ? originalUrl.replace(apiBase, fileBase)
    : originalUrl;
}

/** 최초 데이터에서 상태별 URL 하나씩 뽑아 저장(치환된 URL로 보관) */
function toDocUrls(docs: DocItem[]): DocUrls {
  const acc: DocUrls = {};
  for (const d of docs) {
    const replaced = toFileUrl(d.fileUrl);
    if (d.docsStatus === "RESUME" && !acc.resumeUrl) acc.resumeUrl = replaced;
    if (d.docsStatus === "PORTFOLIO" && !acc.portfolioUrl) acc.portfolioUrl = replaced;
    if (d.docsStatus === "COVERLETTER" && !acc.coverletterUrl) acc.coverletterUrl = replaced;
  }
  return acc;
}

function getNameFromUrl(u?: string): string {
  if (!u) return "";
  try {
    const url = new URL(u, window.location.origin);
    const seg = decodeURIComponent(url.pathname.split("/").pop() || "");
    return seg || u;
  } catch {
    return u || "";
  }
}

export default function InterviewFileSelectPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [selected, setSelected] = useState<DocUrls>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await DocsApi.getMyDocs();
      console.log("[DocsApi] GET /v1/docs/me raw:", res);
      const data: DocItem[] = (res as any)?.data ?? res;
      console.log("[DocsApi] parsed data:", data);
      setDocs(data);
      const initial = toDocUrls(data); // ← 치환된 URL로 초기화
      console.log("[Docs] initial selected (by status):", initial);
      setSelected(initial);
    })();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<DocType, DocItem[]> = { RESUME: [], PORTFOLIO: [], COVERLETTER: [] };
    docs.forEach((d) => g[d.docsStatus].push(d));
    console.log("[Docs] grouped by status:", g);
    return g;
  }, [docs]);

  const onPick = (type: DocType, rawUrl: string) => {
    const url = toFileUrl(rawUrl); // ← 선택 시에도 치환
    setSelected((prev) => {
      const next =
        type === "RESUME"
          ? { ...prev, resumeUrl: url }
          : type === "PORTFOLIO"
          ? { ...prev, portfolioUrl: url }
          : { ...prev, coverletterUrl: url };
      console.log(`[Select] ${type} ->`, url, "next selected:", next);
      return next;
    });
  };

  // /v1/pdf 로 전송해서 텍스트 추출 → 다음 페이지로 이동
  const handleNext = async () => {
    const payload = {
      resumeUrl: selected.resumeUrl ?? "",
      portfolioUrl: selected.portfolioUrl ?? "",
      coverletterUrl: selected.coverletterUrl ?? "",
    };

    console.log("=== Sending /v1/pdf ===");
    console.log("Request Body(JSON):", JSON.stringify(payload, null, 2));

    try {
      setLoading(true);
      const extracted = await extractTextFromPdf(payload);
      console.log("[/v1/pdf] OK:", extracted);

      navigate("/interview/modelist", {
        state: {
          ...payload,      // 치환된 URL 3개
          ...extracted,    // resumeText / portfolioText / coverletterText
        },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error("[/v1/pdf] failed:", status, data, err);
      alert(status === 401 ? "인증이 만료되었습니다. 다시 로그인해주세요." : "요청 실패. 콘솔 로그를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled =
    !selected.resumeUrl && !selected.portfolioUrl && !selected.coverletterUrl;

  return (
    <>
      {/* 여기! JSX는 컴포넌트 반환 안에서 렌더링해야 합니다 */}
      <Header scrollBg={false} />

      <div className="mx-auto max-w-3xl px-6 py-8 mt-16">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">서류 선택</h1>
          <p className="text-sm text-gray-500 mt-1">
            유형별로 사용할 서류를 선택하세요. 선택된 서류는 상태에 따라
            resumeUrl, portfolioUrl, coverletterUrl로 전송됩니다.
          </p>
        </header>

        <section className="space-y-8">
          {(["RESUME", "PORTFOLIO", "COVERLETTER"] as DocType[]).map((type) => (
            <div key={type} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium">{STATUS_LABEL[type]}</h2>
                <span className="text-xs text-gray-500">
                  현재 선택:{" "}
                  {type === "RESUME" && (getNameFromUrl(selected.resumeUrl) || "-")}
                  {type === "PORTFOLIO" && (getNameFromUrl(selected.portfolioUrl) || "-")}
                  {type === "COVERLETTER" && (getNameFromUrl(selected.coverletterUrl) || "-")}
                </span>
              </div>

              {grouped[type].length === 0 ? (
                <div className="text-sm text-gray-500">등록된 {STATUS_LABEL[type]}가 없습니다</div>
              ) : (
                <ul className="space-y-2">
                  {grouped[type].map((d) => {
                    const replaced = toFileUrl(d.fileUrl); // ← 리스트/링크 노출도 치환
                    const checked =
                      (type === "RESUME" && selected.resumeUrl === replaced) ||
                      (type === "PORTFOLIO" && selected.portfolioUrl === replaced) ||
                      (type === "COVERLETTER" && selected.coverletterUrl === replaced);
                    return (
                      <li
                        key={d.docsId}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`pick-${type}`}
                            checked={checked}
                            onChange={() => onPick(type, d.fileUrl)}
                          />
                          <span className="text-sm">
                            {getNameFromUrl(replaced)}
                            <span className="ml-2 text-xs text-gray-400">({STATUS_LABEL[d.docsStatus]})</span>
                          </span>
                        </label>

                        <a
                          className="text-xs underline text-blue-600"
                          href={replaced}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          열기
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </section>

        <footer className="mt-8 flex justify-end">
          {Button ? (
            <Button disabled={loading || isNextDisabled} onClick={handleNext}>
              다음
            </Button>
          ) : (
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              disabled={loading || isNextDisabled}
              onClick={handleNext}
            >
              다음
            </button>
          )}
        </footer>
      </div>
    </>
  );
}
