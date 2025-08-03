import { Mail, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      await login({ email, password });
      console.log("로그인 성공");
      navigate("/"); // 메인 페이지로 이동
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "로그인에 실패했습니다.";
      setErrorMsg(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex overflow-hidden">
      {/* Left Side - Illustration with Gradient Background (그라데이션 + 환영메시지 + 캐릭터) */}
      <div className="w-1/2 relative bg-gradient-to-br from-purple-300 via-blue-400 to-cyan-200 min-h-screen">
        {/* Welcome Message - 중앙 상단 */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <h2 className="text-5xl font-semibold text-white leading-tight drop-shadow-lg">
            MOYA에
            <br />
            오신걸 환영합니다!
          </h2>
        </div>

        {/* Character Illustration - 하단 중앙 */}
        <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 translate-y-1/2">
              <img src="/src/assets/images/cloud-friends.png" alt="로고" />
        </div>
      </div>

      {/* Right Side - Signup Form (폼 영역) */}
      <div className="w-1/2 bg-white flex flex-col justify-center px-8 py-8 min-h-screen">
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Main Content - 중앙 정렬 */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-semibold text-gray-900 mb-6">
                로그인
              </h1>
              <p className="text-lg font-semibold text-gray-600 mb-8">
                계정에 로그인하여 서비스를 이용하세요!
              </p>
            </div>

            {/* Login Form */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

              <div className="text-center space-y-2">
                <button className="text-sm text-blue-500 hover:text-blue-600 transition-colors">
                  비밀번호를 잊으셨나요?
                </button>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-gray-600">아직 회원이 아니신가요?</span>
                  <button className="text-blue-500 font-semibold hover:text-blue-600 transition-colors">
                    <Link to="/signup/detail">회원가입</Link>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
