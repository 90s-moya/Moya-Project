import { useNavigate , Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
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

export default function ProtectedRoute() {
  const { isLogin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginDialog, setShowLoginDialog] = useState(!isLogin);

  // 로그인 상태가 변경되면 다이얼로그 상태도 업데이트
  useEffect(() => {
    setShowLoginDialog(!isLogin);
  }, [isLogin]);

  const handleLoginRedirect = () => {
    
    // 다양한 방법으로 시도
    try {
      navigate("/login");
    } catch (error) {
      console.error("navigate 에러:", error);
      window.location.href = "/login";
    }
  };

  const handleCancelClick = () => {
    setShowLoginDialog(false);
    navigate("/", { replace: true });
  };

  // 로그인되지 않은 경우 다이얼로그만 표시하고 페이지는 렌더링하지 않음
  if (!isLogin) {
    return (
      <AlertDialog open={showLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그인이 필요합니다</AlertDialogTitle>
            <AlertDialogDescription>
              이 서비스를 이용하려면 로그인이 필요합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClick}>
              나중에 하기
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLoginRedirect}>
              로그인하러 가기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  
  return <Outlet />;
}