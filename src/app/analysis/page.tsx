import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnalysisClient from "./AnalysisClient";

export const metadata = {
  title: "데이터 분석 | 인제대학교 데이터거버넌스센터",
  description: "CSV·Excel 파일을 업로드하면 자동으로 통계 분석과 시각화를 제공합니다.",
};

export default function AnalysisPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20 min-h-screen bg-neutral-50">
        <AnalysisClient />
      </main>
      <Footer />
    </>
  );
}
