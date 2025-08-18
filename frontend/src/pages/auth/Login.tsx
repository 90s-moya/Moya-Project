import { Mail, Lock, AlertCircleIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import CloudFriends from "@/assets/images/cloud-friends.png";

// 모달 컴포넌트 import
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };
  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      setDialogOpen(true);
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      await login({ email, password });
      navigate("/");
    } catch (error: any) {
      setErrorMsg("로그인에 실패했습니다. 이메일/비밀번호를 확인해주세요.");
      setDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex overflow-hidden">
      {/* 로그인 실패 다이얼로그 */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircleIcon className="h-5 w-5" />
              <AlertDialogTitle>로그인 실패</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {errorMsg || "로그인 과정에서 문제가 발생했습니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialogOpen(false)}>
              닫기
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setDialogOpen(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 좌측 영역 */}
      <div className="w-1/2 relative bg-gradient-to-br from-purple-300 via-blue-400 to-cyan-200 min-h-screen">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <h2 className="text-5xl font-semibold text-white leading-tight drop-shadow-lg">
            MOYA에
            <br />
            오신걸 환영합니다!
          </h2>
        </div>
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2">
          <img src={CloudFriends} alt="로고" />
        </div>
      </div>

      {/* 우측 폼 */}
      <div className="w-1/2 bg-white flex flex-col justify-center px-8 py-8 min-h-screen">
        <div className="max-w-md mx-auto w-full space-y-8">
          <div>
            <h1 className="text-5xl font-semibold text-gray-900 mb-6">로그인</h1>
            <p className="text-lg font-semibold text-gray-600 mb-8">
              계정에 로그인하여 서비스를 이용하세요!
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </button>

            <div className="text-center space-y-2">
              <button className="text-sm text-blue-500 hover:text-blue-600">
                비밀번호를 잊으셨나요?
              </button>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-gray-600">아직 회원이 아니신가요?</span>
                <Link to="/signup/detail" className="text-blue-500 font-semibold hover:text-blue-600">
                  회원가입
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
