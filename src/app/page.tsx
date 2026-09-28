import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";
import CategorySection from "@/components/home/CategorySection";
import FeaturedDatasets from "@/components/home/FeaturedDatasets";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CtaSection from "@/components/home/CtaSection";
import OrgModal from "@/components/OrgModal";

export default function Home() {
  return (
    <>
      <OrgModal />
      <Navbar />
      <main className="flex-1 bg-neutral-50">
        <HeroSection />
        <StatsSection />
        <CategorySection />
        <FeaturedDatasets />
        <HowItWorksSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
