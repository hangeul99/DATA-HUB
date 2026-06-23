import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DatasetsClient from "./DatasetsClient";

export const metadata = {
  title: "데이터 탐색 | 인제대학교 데이터거버넌스센터",
  description: "통계, 공공, 연구, 금융, 지역 데이터를 탐색하고 신청하세요.",
};

export default function DatasetsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20">
        <Suspense>
          <DatasetsClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
