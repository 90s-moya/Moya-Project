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
  fileUrl: string; // 백엔드가 내려주는 '원본(api-dev)' URL
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

function toFileUrl(originalUrl: string) {
  const apiBase = import.meta.env.VITE_API_URL || "";
  const fileBase = import.meta.env.VITE_FILE_URL || "";
  if (!originalUrl) return originalUrl;
  return originalUrl.startsWith(apiBase)
    ? originalUrl.replace(apiBase, fileBase)
    : originalUrl;
}

const safe = (s?: string) => (s ?? "").trim();

function toInitialSelected(docs: DocItem[]): DocUrls {
  const acc: DocUrls = {};
  for (const d of docs) {
    if (d.docsStatus === "RESUME" && !acc.resumeUrl) acc.resumeUrl = safe(d.fileUrl);
    if (d.docsStatus === "PORTFOLIO" && !acc.portfolioUrl) acc.portfolioUrl = safe(d.fileUrl);
    if (d.docsStatus === "COVERLETTER" && !acc.coverletterUrl) acc.coverletterUrl = safe(d.fileUrl);
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
      const data: DocItem[] = (res as any)?.data ?? res;
      setDocs(data);
      setSelected(toInitialSelected(data)); // 원본으로 초기화
    })();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<DocType, DocItem[]> = { RESUME: [], PORTFOLIO: [], COVERLETTER: [] };
    docs.forEach((d) => g[d.docsStatus].push(d));
    return g;
  }, [docs]);

  const onPick = (type: DocType, rawUrl: string) => {
    const url = safe(rawUrl);
    setSelected((prev) =>
      type === "RESUME"
        ? { ...prev, resumeUrl: url }
        : type === "PORTFOLIO"
        ? { ...prev, portfolioUrl: url }
        : { ...prev, coverletterUrl: url }
    );
  };

  // 다음 단계 전송
  const handleNext = async () => {
    const payload = {
      resumeUrl: safe(selected.resumeUrl),
      portfolioUrl: safe(selected.portfolioUrl),
      coverletterUrl: safe(selected.coverletterUrl),
    };
    console.log("==================dkjfdkfj",payload);

    try {
      setLoading(true);

      // 토큰 만료 로그(옵션)
      try {
        const auth = localStorage.getItem("auth-storage");
        const token = auth ? JSON.parse(auth).state.token : "";
        const expired = (() => {
          try {
            const [, p] = token.split(".");
            const { exp } = JSON.parse(atob(p));
            return Date.now() >= exp * 1000;
          } catch {
            return true;
          }
        })();
        console.log("[/v1/pdf] token expired?", expired);
      } catch (e) {
        console.log("[/v1/pdf] token parse error", e);
      }

      const extracted = await extractTextFromPdf(payload);
      console.log("extracted result:", extracted);

      navigate("/interview/modelist", {
        state: {
          ...payload,    // 원본 URL들
          ...extracted,  // resumeText / portfolioText / coverletterText
        },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      console.error("[/v1/pdf] failed:", status, err?.response?.data || err);
      alert(status === 401 ? "인증이 만료되었습니다. 다시 로그인해주세요." : "요청 실패. 콘솔 로그를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }; // ← 반드시 닫기!

  const isNextDisabled =
    !selected.resumeUrl && !selected.portfolioUrl && !selected.coverletterUrl;

  const displayName = (raw?: string) => getNameFromUrl(toFileUrl(safe(raw || "")));

  return (
    <>
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
                  {type === "RESUME" && (displayName(selected.resumeUrl) || "-")}
                  {type === "PORTFOLIO" && (displayName(selected.portfolioUrl) || "-")}
                  {type === "COVERLETTER" && (displayName(selected.coverletterUrl) || "-")}
                </span>
              </div>

              {grouped[type].length === 0 ? (
                <div className="text-sm text-gray-500">등록된 {STATUS_LABEL[type]}가 없습니다</div>
              ) : (
                <ul className="space-y-2">
                  {grouped[type].map((d) => {
                    const raw = safe(d.fileUrl);        // 원본
                    const display = toFileUrl(raw);     // 화면용
                    const checked =
                      (type === "RESUME" && selected.resumeUrl === raw) ||
                      (type === "PORTFOLIO" && selected.portfolioUrl === raw) ||
                      (type === "COVERLETTER" && selected.coverletterUrl === raw);
                    return (
                      <li key={d.docsId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`pick-${type}`}
                            checked={checked}
                            onChange={() => onPick(type, raw)}
                          />
                          <span className="text-sm">
                            {getNameFromUrl(display)}
                            <span className="ml-2 text-xs text-gray-400">
                              ({STATUS_LABEL[d.docsStatus as DocType]})
                            </span>
                          </span>
                        </label>

                        <a
                          className="text-xs underline text-blue-600"
                          href={display}
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
