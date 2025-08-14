import { useNavigate , Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProtectedRoute() {
  const { isLogin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const alertedRef = useRef(false);
  useEffect(() => {
    if (!isLogin && !alertedRef.current) {
      alertedRef.current = true;
      setTimeout(() => {
        alert("로그인이 필요한 서비스입니다.");
        navigate("/login", { replace: true, state: { from: location } });
      }, 0);
    }
  }, [isLogin, navigate, location]);
  if (!isLogin) return null;
  return <Outlet />;
}