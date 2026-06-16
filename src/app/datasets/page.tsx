import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DatasetsClient from "./DatasetsClient";

export const metadata = {
  title: "?°ì´???ìƒ‰ | ?¸ì œ?€?™êµ ?°ì´?°ê±°ë²„ë„Œ?¤ì„¼??,
  description: "?µê³„, ê³µê³µ, ?°êµ¬, ê¸ˆìœµ, ì§€???°ì´?°ë? ?ìƒ‰?˜ê³  ? ì²­?˜ì„¸??",
};

export default function DatasetsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20">
        <DatasetsClient />
      </main>
      <Footer />
    </>
  );
}
