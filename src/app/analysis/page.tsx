import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnalysisClient from "./AnalysisClient";

export const metadata = {
  title: "?办澊??攵勳劃 | ?胳牅?�?欔祼 ?办澊?瓣卑氩勲剬?れ劶??,
  description: "CSV路Excel ?岇澕???呺?滍晿氅??愲彊?茧 ?店硠 攵勳劃瓿??滉皝?旊? ?滉车?╇媹??",
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
