import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "이용약관 | 인제대학교 데이터거버넌스센터" };

const SECTIONS = [
  {
    title: "제1조 (목적)",
    content: `이 약관은 인제대학교 데이터거버넌스센터(이하 "센터")가 운영하는 데이터허브 서비스(이하 "서비스")의 이용 조건 및 절차, 센터와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: "제2조 (약관의 효력 및 변경)",
    content: `① 이 약관은 서비스 화면에 게시하거나 기타 방법으로 회원에게 공지함으로써 효력이 발생합니다.
② 센터는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지사항 또는 이메일을 통해 사전 고지합니다.
③ 회원은 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.`,
  },
  {
    title: "제3조 (서비스의 제공)",
    content: `센터는 다음과 같은 서비스를 제공합니다.

• 데이터셋 탐색 및 신청 서비스
• 데이터 분석 도구 (CSV/Excel 업로드 기반 자동 시각화)
• 연구·산업 활용을 위한 데이터 제공 서비스
• 기타 센터가 정하는 서비스

서비스는 연중무휴 제공을 원칙으로 하되, 시스템 점검·장애 등의 사유로 일시 중단될 수 있습니다.`,
  },
  {
    title: "제4조 (회원가입 및 자격)",
    content: `① 서비스 이용을 위해 회원가입이 필요하며, 만 14세 이상인 자만 가입할 수 있습니다.
② 회원은 실명 및 실제 소속기관을 입력해야 하며, 허위 정보 입력 시 서비스 이용이 제한될 수 있습니다.
③ 다음 각 호의 경우 가입 신청을 거부하거나 사후에 이용계약을 해지할 수 있습니다.

• 타인의 명의를 도용한 경우
• 허위 정보를 기재한 경우
• 이 약관에서 금지하는 행위를 한 이력이 있는 경우`,
  },
  {
    title: "제5조 (회원 탈퇴 및 자격 상실)",
    content: `① 회원은 언제든지 마이페이지에서 탈퇴를 신청할 수 있습니다.
② 탈퇴 시 회원의 개인정보는 관련 법령에 따른 보존 기간 경과 후 지체 없이 파기됩니다.
③ 서비스 이용 중 다음 행위를 한 경우 사전 통보 없이 이용자격이 박탈될 수 있습니다.

• 타인의 정보를 도용한 경우
• 서비스 운영을 방해한 경우
• 이 약관에서 금지한 행위를 한 경우`,
  },
  {
    title: "제6조 (금지 행위)",
    content: `회원은 다음 행위를 할 수 없습니다.

• 타인의 개인정보를 무단으로 수집·저장·게시하는 행위
• 서비스를 통해 제공받은 데이터를 무단으로 상업적으로 이용하거나 제3자에게 제공하는 행위
• 서비스 시스템에 과부하를 일으키거나 정상적인 서비스 운영을 방해하는 행위
• 센터의 지적재산권을 침해하는 행위
• 법령에 위반되는 행위 또는 미풍양속에 반하는 행위`,
  },
  {
    title: "제7조 (데이터 이용 조건)",
    content: `① 서비스를 통해 제공되는 데이터는 연구·교육·공공 목적으로만 이용할 수 있습니다.
② 데이터 신청 시 명시한 이용 목적 외의 용도로 사용할 수 없습니다.
③ 데이터를 활용한 연구·성과물 발표 시 출처를 명시해야 합니다.
④ 데이터를 무단으로 배포·재판매하는 행위는 엄격히 금지됩니다.`,
  },
  {
    title: "제8조 (업로드 파일 관련)",
    content: `① 데이터 분석 도구에 파일을 업로드할 경우, 개인정보가 포함된 파일을 업로드해서는 안 됩니다.
② 업로드된 분석 파일은 분석 목적으로만 처리되며, 별도로 저장되지 않습니다.
③ 불법적인 내용이 포함된 파일을 업로드하는 행위는 금지됩니다.`,
  },
  {
    title: "제9조 (지적재산권)",
    content: `① 서비스에서 제공하는 모든 콘텐츠(데이터 설명, UI, 분석 도구 등)의 저작권은 센터 또는 원저작자에게 있습니다.
② 회원은 서비스를 통해 제공받은 콘텐츠를 센터의 사전 동의 없이 상업적으로 이용할 수 없습니다.`,
  },
  {
    title: "제10조 (면책 조항)",
    content: `① 센터는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.
② 센터는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 손실이 발생한 것에 대해 책임을 지지 않습니다.
③ 센터는 회원이 게시한 정보·자료·사실의 신뢰도·정확성 등에 대해 책임을 지지 않습니다.`,
  },
  {
    title: "제11조 (분쟁 해결)",
    content: `① 서비스 이용과 관련하여 발생한 분쟁은 센터와 회원이 상호 협의하여 해결합니다.
② 분쟁이 해결되지 않을 경우 관련 법령 및 관할 법원의 판결에 따릅니다.
③ 이 약관에 명시되지 않은 사항은 관련 법령 및 센터의 관련 정책에 따릅니다.

▶ 문의처: han9449@inje.ac.kr`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-16">
        <div className="bg-white border-b border-neutral-200">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <p className="text-xs font-semibold text-brand-600 tracking-widest uppercase mb-3">Terms of Service</p>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">이용약관</h1>
            <p className="text-sm text-neutral-500">
              인제대학교 데이터거버넌스센터 데이터허브 서비스 이용에 관한 약관입니다.
            </p>
            <p className="text-xs text-neutral-400 mt-3">시행일: 2026년 1월 1일</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="bg-white rounded-2xl border border-neutral-200 p-7">
              <h2 className="text-base font-bold text-neutral-900 mb-4">{sec.title}</h2>
              <div className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                {sec.content}
              </div>
            </div>
          ))}

          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-brand-700 font-medium mb-1">약관 관련 문의</p>
            <a href="mailto:han9449@inje.ac.kr"
              className="text-brand-600 font-semibold hover:underline text-sm">
              han9449@inje.ac.kr
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
