// Next.js 15+ 에서 동적 라우트 params 는 Promise — 반드시 await 해야 함
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DatasetDetailClient from "./DatasetDetailClient";

// params 타입을 Promise<...> 로 선언하고 async 함수로 처리
export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20">
        <DatasetDetailClient id={id} />
      </main>
      <Footer />
    </>
  );
}
