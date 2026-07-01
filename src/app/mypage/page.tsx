"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  User as UserIcon, Mail, LogOut, Download, FileText,
  Upload, ChevronRight, Loader2, Calendar, Tag, Trash2,
  Lock, Eye, EyeOff,
} from "lucide-react";

// ── 타입 ─────────────────────────────────────────────────────────
interface Application {
  id: string;
  created_at: string;
  field: string;
  period: string;
  purpose: string;
  datasets: {
    id: string;
    title: string;
    category: string;
    year: string;
    tags: string[];
  };
}

interface DownloadLog {
  id: string;
  downloaded_at: string;
  datasets: {
    id: string;
    title: string;
    category: string;
  };
}

interface Result {
  id: string;
  created_at: string;
  summary: string;
  file_name: string | null;
  datasets: {
    id: string;
    title: string;
    category: string;
  } | null;
}

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"applications" | "downloads" | "results">("applications");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword]   = useState("");
  const [newPassword, setNewPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [passwordError, setPasswordError]       = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading]   = useState(false);
  const [showNewPw, setShowNewPw]               = useState(false);

  // 각 탭 데이터
  const [applications, setApplications] = useState<Application[]>([]);
  const [downloads, setDownloads] = useState<DownloadLog[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const router = useRouter();

  // ── 인증 확인 + 초기 데이터 로드 ────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
      // 신청 내역 초기 로드
      fetchApplications(data.user.id);
    });
  }, [router]);

  // ── 탭 전환 시 데이터 로드 ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (activeTab === "applications") fetchApplications(user.id);
    if (activeTab === "downloads")    fetchDownloads(user.id);
    if (activeTab === "results")      fetchResults(user.id);
  }, [activeTab, user]);

  // ── 신청 내역 조회 ────────────────────────────────────────────
  const fetchApplications = async (userId: string) => {
    setDataLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("applications")
      .select(`
        id, created_at, field, period, purpose,
        datasets ( id, title, category, year, tags )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setApplications((data as unknown as Application[]) ?? []);
    setDataLoading(false);
  };

  // ── 다운로드 기록 조회 ────────────────────────────────────────
  const fetchDownloads = async (userId: string) => {
    setDataLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("download_logs")
      .select(`
        id, downloaded_at,
        datasets ( id, title, category )
      `)
      .eq("user_id", userId)
      .order("downloaded_at", { ascending: false });
    setDownloads((data as unknown as DownloadLog[]) ?? []);
    setDataLoading(false);
  };

  // ── 결과물 목록 조회 ─────────────────────────────────────────
  const fetchResults = async (userId: string) => {
    setDataLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("results")
      .select("id, created_at, summary, file_name, datasets(id, title, category)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setResults((data as unknown as Result[]) ?? []);
    setDataLoading(false);
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const changePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) { setPasswordError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("새 비밀번호가 일치하지 않습니다."); return; }
    setPasswordLoading(true);
    const supabase = createClient();
    // 현재 비밀번호 검증
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });
    if (signInErr) {
      setPasswordError("현재 비밀번호가 올바르지 않습니다.");
      setPasswordLoading(false);
      return;
    }
    // 비밀번호 변경
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updateErr) {
      setPasswordError("비밀번호 변경 중 오류가 발생했습니다.");
      setPasswordLoading(false);
      return;
    }
    setShowPasswordModal(false);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    alert("비밀번호가 성공적으로 변경되었습니다.");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const res = await fetch("/api/delete-account", { method: "DELETE" });
    if (res.ok) {
      // 탈퇴 신청 완료 — 30일 유예기간 후 실제 삭제
      // 세션은 유지한 채로 복구 페이지로 이동 (유예기간 중 복구 가능하도록)
      await createClient().auth.refreshSession();
      router.push("/account-recovery");
      router.refresh();
    } else {
      alert("탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── 날짜 포맷 헬퍼 ────────────────────────────────────────────
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) return null;

  const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "사용자";
  const email = user.email ?? "";
  const avatar = user.user_metadata?.avatar_url;
  // Google OAuth 전용 계정은 이메일 로그인 identity 없음 → 비밀번호 변경 숨김
  const isOAuthUser = !user.identities?.some((id) => id.provider === "email");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-20">

        {/* 프로필 헤더 */}
        <div className="bg-white border-b border-neutral-100">
          {/* 모바일: 세로 스택 / sm 이상: 가로 정렬 */}
          <div className="max-w-4xl mx-auto px-5 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <UserIcon size={28} className="text-brand-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-neutral-900">{name}</h1>
              <div className="flex items-center gap-1.5 text-sm text-neutral-400 mt-0.5 min-w-0">
                <Mail size={13} className="flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>
              {!isOAuthUser && (
                <button
                  onClick={() => { setShowPasswordModal(true); setPasswordError(null); }}
                  className="mt-2 flex items-center gap-1 text-xs text-neutral-400 hover:text-brand-600 transition-colors"
                >
                  <Lock size={11} />
                  비밀번호 변경
                </button>
              )}
            </div>
            <button onClick={logout}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-red-500 transition-colors px-4 py-2 rounded-lg hover:bg-red-50">
              <LogOut size={15} />
              로그아웃
            </button>
          </div>
        </div>

        {/* 탭 + 콘텐츠 */}
        <div className="max-w-4xl mx-auto px-5 sm:px-6 mt-8">
          {/* 모바일: 탭이 넘칠 경우 가로 스크롤 */}
          <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto mb-6">
            {([
              { id: "applications", label: "신청 내역",    icon: <FileText size={14} /> },
              { id: "downloads",    label: "다운로드 기록", icon: <Download size={14} /> },
              { id: "results",      label: "결과물 제출",  icon: <Upload size={14} /> },
            ] as const).map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all
                  ${activeTab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── 신청 내역 탭 ─────────────────────────────────────── */}
          {activeTab === "applications" && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-800">신청한 데이터셋</h2>
                {applications.length > 0 && (
                  <span className="text-xs text-neutral-400">{applications.length}건</span>
                )}
              </div>

              {dataLoading ? (
                <div className="py-16 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
              ) : applications.length === 0 ? (
                <div className="py-20 text-center text-neutral-400">
                  <FileText size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">아직 신청한 데이터셋이 없습니다.</p>
                  <Link href="/datasets"
                    className="inline-block mt-4 text-xs text-brand-600 hover:underline">
                    데이터셋 둘러보기
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {applications.map((app) => (
                    <li key={app.id}>
                      <Link href={`/datasets/${app.datasets.id}`}
                        className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-neutral-50 transition-colors group">
                        {/* 카테고리 아이콘 */}
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-brand-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 truncate">
                            {app.datasets.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <Tag size={11} /> {app.datasets.category}
                            </span>
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <Calendar size={11} /> 신청일: {formatDate(app.created_at)}
                            </span>
                            <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                              {app.field}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-neutral-300 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── 다운로드 기록 탭 ──────────────────────────────────── */}
          {activeTab === "downloads" && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-800">다운로드 기록</h2>
                {downloads.length > 0 && (
                  <span className="text-xs text-neutral-400">{downloads.length}건</span>
                )}
              </div>

              {dataLoading ? (
                <div className="py-16 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
              ) : downloads.length === 0 ? (
                <div className="py-20 text-center text-neutral-400">
                  <Download size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">다운로드 기록이 없습니다.</p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {downloads.map((log) => (
                    <li key={log.id}>
                      <Link href={`/datasets/${log.datasets.id}`}
                        className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-neutral-50 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <Download size={18} className="text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 truncate">
                            {log.datasets.title}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {log.datasets.category} · 다운로드: {formatDate(log.downloaded_at)}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-neutral-300 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── 결과물 제출 탭 ───────────────────────────────────── */}
          {activeTab === "results" && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-800">제출한 결과물</h2>
                {results.length > 0 && (
                  <span className="text-xs text-neutral-400">{results.length}건</span>
                )}
              </div>

              {dataLoading ? (
                <div className="py-16 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
              ) : results.length === 0 ? (
                <div className="py-20 text-center text-neutral-400">
                  <Upload size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">제출한 결과물이 없습니다.</p>
                  <Link href="/datasets?tab=result"
                    className="inline-block mt-4 text-xs text-brand-600 hover:underline">
                    결과물 제출하기
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {results.map((r) => (
                    <li key={r.id} className="px-4 sm:px-6 py-4 flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Upload size={18} className="text-brand-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* 연결된 데이터셋 */}
                        <p className="text-sm font-semibold text-neutral-800 truncate">
                          {r.datasets?.title ?? "삭제된 데이터셋"}
                        </p>
                        {/* 활용 요약 */}
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{r.summary}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {/* 첨부 파일명 */}
                          {r.file_name && (
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <FileText size={11} /> {r.file_name}
                            </span>
                          )}
                          {/* 제출일 */}
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            <Calendar size={11} /> {formatDate(r.created_at)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* 회원탈퇴 */}
        <div className="max-w-4xl mx-auto px-5 sm:px-6 mt-8 mb-16 text-right">
          <button onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-neutral-300 hover:text-red-400 transition-colors">
            회원탈퇴
          </button>
        </div>

        {/* 회원탈퇴 확인 모달 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 sm:p-8 w-full max-w-sm text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900 mb-2">정말 탈퇴하시겠어요?</h2>
              <p className="text-sm text-neutral-500 mb-6">
                탈퇴 신청 후 <span className="font-semibold text-red-500">30일간 계정이 유지</span>됩니다.<br />
                이 기간 내에 복구하실 수 있으며,<br />
                30일 경과 후 모든 데이터가 영구 삭제됩니다.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
                  취소
                </button>
                <button onClick={deleteAccount} disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                  {deleting ? "처리 중..." : "탈퇴하기"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 비밀번호 변경 모달 */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 sm:p-8 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                  <Lock size={18} className="text-brand-600" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900">비밀번호 변경</h2>
              </div>

              {passwordError && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">
                  {passwordError}
                </div>
              )}

              <div className="space-y-3">
                {/* 현재 비밀번호 */}
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400"
                />
                {/* 새 비밀번호 */}
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 (8자 이상)"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* 새 비밀번호 확인 */}
                <input
                  type={showNewPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 확인"
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400
                    ${confirmPassword && confirmPassword !== newPassword ? "border-red-300" : confirmPassword && confirmPassword === newPassword ? "border-brand-300" : "border-neutral-200"}`}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(null); }}
                  className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={changePassword}
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {passwordLoading ? "변경 중..." : "변경하기"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
