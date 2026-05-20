import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "개인정보처리방침 | 인제대학교 데이터거버넌스센터" };

const SECTIONS = [
  {
    title: "제1조 (개인정보의 처리 목적)",
    content: `인제대학교 데이터거버넌스센터(이하 "센터")는 다음의 목적을 위해 개인정보를 처리합니다. 처리한 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우 별도의 동의를 받겠습니다.

• 회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 확인, 서비스 부정 이용 방지
• 데이터 신청 및 제공: 데이터셋 신청 접수, 신청 내역 관리, 이용 결과물 수집
• 데이터 분석 서비스 제공: 파일 업로드 기반 자동 분석 및 시각화 서비스 운영
• 이용 현황 관리: 서비스 이용 통계 수집 및 플랫폼 운영 개선`,
  },
  {
    title: "제2조 (수집하는 개인정보 항목)",
    content: `센터는 아래의 개인정보 항목을 수집합니다.

【필수 항목】
• 이메일 주소 (아이디로 사용)
• 비밀번호 (암호화 저장, 센터는 확인 불가)
• 이름 (성명)
• 소속기관

【선택 항목】
• 사용자 유형 (연구자 / 기업 / 지자체 / 일반인)

【자동 수집 항목】
• 서비스 이용 기록 (데이터 신청 내역, 분석 도구 이용 기록, 다운로드 기록)
• 접속 일시

※ 소셜 로그인(Google) 이용 시 해당 서비스로부터 이메일, 이름 정보를 제공받습니다.`,
  },
  {
    title: "제3조 (개인정보의 처리 및 보유 기간)",
    content: `센터는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.

• 회원 정보: 회원 탈퇴 시까지
• 데이터 신청 기록: 신청일로부터 5년
• 서비스 이용 기록: 1년

※ 관련 법령에 의한 정보 보유 사유가 있을 경우, 해당 기간 동안 보관됩니다.`,
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    content: `센터는 원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한 범위 내에서만 처리하며, 다음의 경우를 제외하고 정보주체의 동의 없이 제3자에게 제공하지 않습니다.

• 정보주체가 사전에 동의한 경우
• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우`,
  },
  {
    title: "제5조 (개인정보 처리 위탁)",
    content: `센터는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.

| 수탁자 | 위탁 업무 내용 |
|--------|----------------|
| Supabase Inc. | 데이터베이스 저장 및 인증 서비스 (미국 소재 클라우드) |
| Vercel Inc. | 웹 서비스 호스팅 (미국 소재 클라우드) |

※ 위탁 계약 시 개인정보가 안전하게 관리될 수 있도록 관련 법령에 따른 조항을 규정하고 있습니다.`,
  },
  {
    title: "제6조 (정보주체의 권리·의무)",
    content: `정보주체는 센터에 대해 언제든지 다음 각 호의 권리를 행사할 수 있습니다.

• 개인정보 처리 현황 열람 요구
• 오류 등이 있을 경우 정정 요구
• 삭제 요구
• 처리 정지 요구

위 권리 행사는 이메일(han9449@inje.ac.kr)을 통해 요청하실 수 있으며, 센터는 이에 대해 지체 없이 조치하겠습니다.`,
  },
  {
    title: "제7조 (개인정보의 안전성 확보 조치)",
    content: `센터는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.

• 비밀번호 암호화: 이용자의 비밀번호는 단방향 암호화(bcrypt)되어 저장되며 센터도 확인할 수 없습니다.
• 통신 암호화: HTTPS(TLS)를 통한 암호화 통신을 사용합니다.
• 접근 제어: 개인정보에 대한 접근 권한을 최소한의 인원으로 제한하며, 관리자 계정은 별도 권한 관리를 합니다.
• 클라우드 보안: 데이터는 Supabase의 암호화된 클라우드 환경에 저장됩니다.`,
  },
  {
    title: "제8조 (개인정보 보호책임자)",
    content: `센터는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 불만 처리 및 피해 구제를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

▶ 개인정보 보호책임자
• 기관: 인제대학교 데이터거버넌스센터
• 이메일: han9449@inje.ac.kr

정보주체는 센터의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.`,
  },
  {
    title: "제9조 (개인정보처리방침의 변경)",
    content: `이 개인정보처리방침은 2026년 1월 1일부터 적용됩니다. 내용 추가, 삭제 및 수정이 있을 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-16">
        {/* 헤더 */}
        <div className="bg-white border-b border-neutral-200">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <p className="text-xs font-semibold text-brand-600 tracking-widest uppercase mb-3">Privacy Policy</p>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">개인정보처리방침</h1>
            <p className="text-sm text-neutral-500">
              인제대학교 데이터거버넌스센터는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고자 다음과 같은 처리방침을 두고 있습니다.
            </p>
            <p className="text-xs text-neutral-400 mt-3">시행일: 2026년 1월 1일</p>
          </div>
        </div>

        {/* 본문 */}
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="bg-white rounded-2xl border border-neutral-200 p-7">
              <h2 className="text-base font-bold text-neutral-900 mb-4">{sec.title}</h2>
              <div className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                {sec.content}
              </div>
            </div>
          ))}

          {/* 문의 안내 */}
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-brand-700 font-medium mb-1">개인정보 관련 문의</p>
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
