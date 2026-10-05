import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";
import SceneSection from "@/components/home/SceneSection";
import CategorySection from "@/components/home/CategorySection";
import ShowcaseSection from "@/components/home/ShowcaseSection";
import FeaturedDatasets from "@/components/home/FeaturedDatasets";
import CtaSection from "@/components/home/CtaSection";
import OrgModal from "@/components/OrgModal";

export default function Home() {
  return (
    <>
      <OrgModal />
      <Navbar />
      {/* break-keep: 한국어를 단어 단위로 줄바꿈 ("데/이터"처럼 끊기지 않게) */}
      <main className="flex-1 break-keep">
        <HeroSection />
        {/* 홈 순서: 우주 히어로 → 통계 → 김해 사진 장면 → 분야별 데이터 → 실제 화면 소개 → 인기 데이터 → 시작하기 (이용 절차는 데이터 탐색 > 이용 안내로 이동) */}
        <StatsSection />
        <SceneSection />
        <CategorySection />
        <ShowcaseSection />
        <FeaturedDatasets />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
