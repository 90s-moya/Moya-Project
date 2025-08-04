import Header from "@/components/common/Header";
import HomeInterviewSection from "@/components/home/HomeInterviewSection";
import HomeIntroSection from "@/components/home/HomeIntroSection";
import HomeStudySection from "@/components/home/HomeStudySection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-blue-200 to-pink-200 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-purple-300/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-pink-300/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-40 right-1/3 w-40 h-40 bg-blue-300/25 rounded-full blur-xl"></div>
      </div>

      <Header scrollBg />
      <HomeIntroSection></HomeIntroSection>
      <HomeInterviewSection></HomeInterviewSection>
      <HomeStudySection></HomeStudySection>
    
    </div>
  );
}
