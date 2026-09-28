import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";
import CategorySection from "@/components/home/CategorySection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturedDatasets from "@/components/home/FeaturedDatasets";
import CtaSection from "@/components/home/CtaSection";
import OrgModal from "@/components/OrgModal";

export default function Home() {
  return (
    <>
      <OrgModal />
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <CategorySection />
        <HowItWorksSection />
        <FeaturedDatasets />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
