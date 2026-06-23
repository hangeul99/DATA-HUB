"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ComposedChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
} from "recharts";
import { Upload, FileText, X, TrendingUp, Table2, BarChart2, AlertCircle, Map as MapIcon, Download, Activity, PieChart as PieChartIcon, Crosshair, Grid, Layers } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

// ── 타입 ──────────────────────────────────────────────────────
type ColType = "numeric" | "categorical" | "date";

interface ColMeta {
  name: string;
  type: ColType;
  values: (string | number | null)[];
  isId?: boolean; // 연번/ID 성격 열 — 시각화 생략
}

interface NumericStats {
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  nullCount: number;
  outlierCount: number; // IQR 기반 이상값 수
}

interface FreqEntry { label: string; count: number }

// ── 유틸 ──────────────────────────────────────────────────────
function isNumeric(val: unknown): val is number {
  return typeof val === "number" && !isNaN(val);
}

// 큰 배열에서도 안전한 min/max
// Math.max(...arr)는 배열이 약 10만 개를 넘으면 "Maximum call stack size exceeded"로
// 터지므로(50MB 파일 지원), 스프레드 대신 루프로 직접 계산한다.
function arrMin(arr: number[]): number {
  let m = Infinity;
  for (const v of arr) if (v < m) m = v;
  return m;
}
function arrMax(arr: number[]): number {
  let m = -Infinity;
  for (const v of arr) if (v > m) m = v;
  return m;
}

// YYYYMMDD 8자리 정수 패턴 (한국 공공데이터에서 흔함)
const YYYYMMDD_RE = /^\d{8}$/;
function isYYYYMMDD(v: unknown): boolean {
  if (!YYYYMMDD_RE.test(String(v))) return false;
  const s = String(v);
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10);
  const d = parseInt(s.slice(6, 8), 10);
  return y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

function detectType(values: unknown[]): ColType {
  const sample = values.filter((v) => v !== null && v !== "" && v !== undefined).slice(0, 50);
  if (sample.length === 0) return "categorical";

  // YYYYMMDD 8자리 날짜 우선 감지
  const yyyymmddCount = sample.filter(isYYYYMMDD).length;
  if (yyyymmddCount / sample.length > 0.8) return "date";

  const numericCount = sample.filter((v) => !isNaN(Number(v))).length;
  if (numericCount / sample.length > 0.8) return "numeric";

  const dateCount = sample.filter((v) => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / sample.length > 0.8) return "date";
  return "categorical";
}

// 연번/ID 성격 열 감지 (시각화 의미 없음)
const ID_KEYWORDS = ["연번", "번호", "순번", "no", "id", "seq", "index", "idx"];
function isIdCol(name: string, values: (string | number | null)[], totalRows: number): boolean {
  const lname = name.toLowerCase().replace(/[_\s]/g, "");
  if (ID_KEYWORDS.some((k) => lname === k || lname.endsWith(k))) return true;
  if (totalRows > 10) {
    const nonNull = values.filter((v) => v !== null && v !== "");
    const unique = new Set(nonNull.map(String)).size;
    if (unique / nonNull.length > 0.95) return true;
  }
  return false;
}

function parseNumeric(val: unknown): number | null {
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function calcStats(vals: (number | null)[]): NumericStats {
  const nums = vals.filter(isNumeric) as number[];
  if (nums.length === 0) return { count: 0, mean: 0, median: 0, std: 0, min: 0, max: 0, nullCount: vals.length, outlierCount: 0 };
  const sorted = [...nums].sort((a, b) => a - b);
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const std = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length);

  // IQR 기반 이상값 (Tukey fence)
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const outlierCount = nums.filter((v) => v < lo || v > hi).length;

  return {
    count: nums.length,
    mean: +mean.toFixed(4),
    median: +median.toFixed(4),
    std: +std.toFixed(4),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    nullCount: vals.length - nums.length,
    outlierCount,
  };
}

function makeHistogram(vals: number[], bins = 10): { label: string; count: number }[] {
  if (vals.length === 0) return [];
  const min = arrMin(vals);
  const max = arrMax(vals);
  const range = max - min || 1;
  const binSize = range / bins;
  const counts = Array(bins).fill(0);
  vals.forEach((v) => {
    const idx = Math.min(Math.floor((v - min) / binSize), bins - 1);
    counts[idx]++;
  });
  return counts.map((count, i) => ({
    label: `${+(min + i * binSize).toFixed(2)}`,
    count,
  }));
}

function makeFrequency(vals: (string | number | null)[], topN = 15): FreqEntry[] {
  const map = new Map<string, number>();
  vals.forEach((v) => {
    if (v === null || v === "") return;
    const key = String(v);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, count]) => ({ label, count }));
}

// 날짜 열 월별 집계 (YYYY-MM 단위, 날짜순 정렬)
// YYYYMMDD 8자리 정수도 처리
function makeDateFrequency(vals: (string | number | null)[], maxMonths = 36): FreqEntry[] {
  const map = new Map<string, number>();
  vals.forEach((v) => {
    if (v === null || v === "") return;
    let d: Date;
    const s = String(v);
    if (YYYYMMDD_RE.test(s)) {
      // 20231231 → 2023-12-31
      d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
    } else {
      d = new Date(s);
    }
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, maxMonths)
    .map(([label, count]) => ({ label, count }));
}

// Pearson 상관계수 계산
function pearsonCorr(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  const num = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
  const da = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0));
  const db = Math.sqrt(b.reduce((s, v) => s + (v - mb) ** 2, 0));
  if (da === 0 || db === 0) return 0;
  return +(num / (da * db)).toFixed(3);
}

// ── 컬러 팔레트 ───────────────────────────────────────────────
const COLORS = ["#0D7377", "#2A9898", "#4FAFAF", "#0E253C", "#2D5F8F", "#4D7FB1", "#7A9FC5"];

// ── 차트 종류 정의 ──────────────────────────────────────────────
const CHART_TYPES = [
  { id: "bar",       label: "막대",       Icon: BarChart2,    desc: "카테고리 비교" },
  { id: "bar-h",     label: "가로 막대",  Icon: BarChart2,    desc: "긴 레이블 적합" },
  { id: "line",      label: "선",         Icon: TrendingUp,   desc: "추세 변화" },
  { id: "area",      label: "영역",       Icon: Activity,     desc: "면적 강조 추세" },
  { id: "pie",       label: "파이",       Icon: PieChartIcon, desc: "전체 대비 비율" },
  { id: "donut",     label: "도넛",       Icon: PieChartIcon, desc: "비율+중앙 강조" },
  { id: "scatter",   label: "산점도",     Icon: Crosshair,    desc: "두 수치 상관관계" },
  { id: "bubble",    label: "버블",       Icon: Crosshair,    desc: "3변수 관계" },
  { id: "histogram", label: "히스토그램", Icon: BarChart2,    desc: "분포 확인" },
  { id: "radar",     label: "레이더",     Icon: Activity,     desc: "다항목 비교" },
  { id: "heatmap",   label: "히트맵",     Icon: Grid,         desc: "교차 패턴" },
  { id: "treemap",   label: "트리맵",     Icon: Layers,       desc: "비율·계층 구조" },
] as const;
type ChartTypeId = (typeof CHART_TYPES)[number]["id"];

// 각 차트 타입에 대한 상세 설명
const CHART_DESC: Record<string, string> = {
  bar:       "막대 차트는 카테고리별 수치를 직관적으로 비교합니다. X축이 항목, 막대 높이로 Y축 값을 나타냅니다.",
  "bar-h":   "가로 막대 차트는 레이블이 길거나 항목이 많을 때 적합합니다. 항목을 세로로 나열해 읽기 쉽게 표시합니다.",
  line:      "선 차트는 시간 흐름이나 순서에 따른 연속 추세를 표현합니다. X축이 날짜/순서일 때 효과적입니다.",
  area:      "영역 차트는 선 차트에 면적을 채워 시각적 임팩트를 추가한 형태입니다.",
  pie:       "파이 차트는 전체 대비 각 항목의 비율을 원형으로 나타냅니다. 항목이 5개 이하일 때 효과적입니다.",
  donut:     "도넛 차트는 파이 차트와 동일합니다. 가운데 공간에 총합 등 추가 정보를 표시할 수 있습니다.",
  scatter:   "산점도는 두 수치 변수의 상관관계를 점으로 나타냅니다. 점의 패턴으로 음/양의 상관관계를 파악합니다.",
  bubble:    "버블 차트는 산점도에 세 번째 변수를 점의 크기로 표현해 3변수의 관계를 보여줍니다.",
  histogram: "히스토그램은 수치 데이터의 분포를 구간별로 나타냅니다. 어느 범위에 데이터가 많은지 파악합니다.",
  radar:     "레이더(거미줄) 차트는 여러 수치 항목을 방사형으로 비교합니다. 제품이나 대상의 강점/약점을 파악하기에 좋습니다.",
  heatmap:   "히트맵은 두 범주형 변수의 교차값을 색상 강도로 나타냅니다. 패턴과 집중도를 직관적으로 파악합니다.",
  treemap:   "트리맵은 항목의 크기를 면적으로 비율·계층 구조를 나타냅니다. 전체 구성 요소 비중을 한눈에 봅니다.",
};

// ── 위도/경도 열 자동 감지 ─────────────────────────────────────
const LAT_NAMES = ["위도", "lat", "latitude", "y", "y좌표", "위치y", "ycoord"];
const LNG_NAMES = ["경도", "lng", "lon", "longitude", "x", "x좌표", "위치x", "xcoord"];

function detectLatLng(cols: ColMeta[]): { latCol: string; lngCol: string } | null {
  const numCols = cols.filter((c) => c.type === "numeric");

  // 1단계: 이름으로 감지
  const byName = (names: string[]) =>
    numCols.find((c) => names.some((n) => c.name.toLowerCase().replace(/\s/g, "") === n));
  const latByName = byName(LAT_NAMES);
  const lngByName = byName(LNG_NAMES);
  if (latByName && lngByName && latByName.name !== lngByName.name) {
    return { latCol: latByName.name, lngCol: lngByName.name };
  }

  // 2단계: 값 범위로 감지 (전세계 좌표 범위)
  const isLatRange = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null);
    if (nums.length === 0) return false;
    return nums.every((v) => v >= -90 && v <= 90) && nums.some((v) => Math.abs(v) > 1);
  };
  const isLngRange = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null);
    if (nums.length === 0) return false;
    return nums.every((v) => v >= -180 && v <= 180) && nums.some((v) => Math.abs(v) > 1);
  };

  const latCandidates = numCols.filter((c) => isLatRange(c.values as (number | null)[]));
  const lngCandidates = numCols.filter((c) => isLngRange(c.values as (number | null)[]));

  // 위도 후보 중 범위 더 좁은 것(-90~90), 경도 후보 중 더 넓은 것(-180~180)
  // 겹치는 열은 값의 최대값으로 구분 (경도가 보통 더 큰 값)
  for (const lat of latCandidates) {
    for (const lng of lngCandidates) {
      if (lat.name === lng.name) continue;
      const latNums = (lat.values as (number | null)[]).filter((v): v is number => v !== null);
      const lngNums = (lng.values as (number | null)[]).filter((v): v is number => v !== null);
      const latMax = arrMax(latNums.map(Math.abs));
      const lngMax = arrMax(lngNums.map(Math.abs));
      if (lngMax > latMax) return { latCol: lat.name, lngCol: lng.name };
    }
  }

  return null;
}

// ── 주소 열 자동 감지 ─────────────────────────────────────────
const ADDR_KEYWORDS = ["주소", "addr", "address", "소재지", "위치", "도로명", "지번"];
const SIDO = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
              "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

function detectAddressCol(cols: ColMeta[]): string | null {
  const catCols = cols.filter((c) => c.type === "categorical");
  // 1단계: 열 이름으로 감지
  const byName = catCols.find((c) =>
    ADDR_KEYWORDS.some((kw) => c.name.toLowerCase().includes(kw))
  );
  if (byName) return byName.name;
  // 2단계: 값이 광역시도로 시작하는 열 감지
  const byVal = catCols.find((c) => {
    const sample = (c.values.filter(Boolean) as string[]).slice(0, 20);
    if (sample.length < 3) return false;
    return sample.filter((v) => SIDO.some((s) => v.startsWith(s))).length / sample.length >= 0.5;
  });
  return byVal?.name ?? null;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function AnalysisClient() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cols, setCols] = useState<ColMeta[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "table" | "map">("overview");
  const [selectedChartType, setSelectedChartType] = useState<ChartTypeId | null>(null);
  const [xCol, setXCol] = useState<string | null>(null);
  const [yCol, setYCol] = useState<string | null>(null);
  const [zCol, setZCol] = useState<string | null>(null);
  const [radarCols, setRadarCols] = useState<string[]>([]);
  const [chartGenerated, setChartGenerated] = useState(false);
  const [MapView, setMapView] = useState<React.ComponentType<{ points: {lat:number;lng:number;label?:string}[]; latCol?:string; lngCol?:string }> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Excel 멀티시트
  const [sheetNames, setSheetNames]   = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [pendingWb, setPendingWb]     = useState<import("xlsx").WorkBook | null>(null);
  // 차트 SVG export용 ref
  const chartRef = useRef<HTMLDivElement>(null);
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");
  // 주소 기반 지오코딩 상태
  const [addressCol,   setAddressCol]   = useState<string | null>(null);
  const [geocoding,    setGeocoding]    = useState(false);
  const [geocodedPts,  setGeocodedPts]  = useState<{ lat: number; lng: number; label?: string }[]>([]);
  const [geocodeCount, setGeocodeCount] = useState(0);
  const [geocodeTotal, setGeocodeTotal] = useState(0);
  // 현재 파일에 대해 지오코딩을 이미 시작했는지 추적 (탭 전환 시 재시작 방지)
  const geocodingStartedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 위도/경도 자동 감지
  const latLng = useMemo(() => detectLatLng(cols), [cols]);
  // 주소 열 자동 감지
  const addrDetected = useMemo(() => detectAddressCol(cols), [cols]);

  // 자동 감지 결과로 초기값 설정
  useEffect(() => {
    if (latLng) {
      setManualLat(latLng.latCol);
      setManualLng(latLng.lngCol);
    }
  }, [latLng]);

  // 주소 열 감지 결과 반영 (geocodedPts 초기화는 processData/reset에서만)
  useEffect(() => {
    setAddressCol(addrDetected);
  }, [addrDetected]);

  // 지도 탭 진입 시 MapView 동적 import
  useEffect(() => {
    if (activeTab === "map" && !MapView) {
      import("./MapView").then((m) => setMapView(() => m.default));
    }
  }, [activeTab, MapView]);

  // 지도 마커 데이터
  const mapPoints = useMemo(() => {
    if (!manualLat || !manualLng || manualLat === manualLng) return [];
    const latMeta = cols.find((c) => c.name === manualLat);
    const lngMeta = cols.find((c) => c.name === manualLng);
    if (!latMeta || !lngMeta) return [];
    return rows.map((row, i) => {
      const lat = latMeta.values[i] as number | null;
      const lng = lngMeta.values[i] as number | null;
      if (lat === null || lng === null) return null;
      const labelParts = cols
        .filter((c) => c.type !== "numeric")
        .slice(0, 2)
        .map((c) => `${c.name}: ${row[c.name] ?? "-"}`);
      return { lat, lng, label: labelParts.join("<br/>") || undefined };
    }).filter((p): p is { lat: number; lng: number; label: string | undefined } => p !== null);
  }, [manualLat, manualLng, cols, rows]);

  // ── 주소 → 좌표 변환 (Nominatim, 고유 주소 최대 80개) ────────
  const geocodeAddresses = useCallback(async (col: string) => {
    const colMeta = cols.find((c) => c.name === col);
    if (!colMeta) return;

    const allVals = colMeta.values as (string | null)[];
    // 중복 제거 후 최대 80개 (Nominatim: 1 req/sec 제한)
    const unique  = [...new Set(allVals.filter((v): v is string => !!v))].slice(0, 80);

    setGeocoding(true);
    setGeocodedPts([]);
    setGeocodeCount(0);
    setGeocodeTotal(unique.length);

    const cache = new Map<string, { lat: number; lng: number } | null>();

    for (let i = 0; i < unique.length; i++) {
      const addr = unique[i];
      try {
        // Nominatim 이용 약관: 1초 이상 간격 필수
        await new Promise((r) => setTimeout(r, 1100));
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr + " 대한민국")}&format=json&limit=1&accept-language=ko`,
          { headers: { "User-Agent": "Inje-DataHub/1.0 (contact@inje.ac.kr)" } }
        );
        const data: { lat: string; lon: string }[] = res.ok ? await res.json() : [];
        if (data[0]) {
          cache.set(addr, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
          // 풀 주소 실패 시 앞 3토큰(시/군/구 수준)으로 재시도
          const short = addr.split(/\s+/).slice(0, 3).join(" ");
          if (short !== addr) {
            await new Promise((r) => setTimeout(r, 1100));
            const res2 = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(short + " 대한민국")}&format=json&limit=1&accept-language=ko`,
              { headers: { "User-Agent": "Inje-DataHub/1.0 (contact@inje.ac.kr)" } }
            );
            const data2: { lat: string; lon: string }[] = res2.ok ? await res2.json() : [];
            cache.set(addr, data2[0] ? { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) } : null);
          } else {
            cache.set(addr, null);
          }
        }
      } catch {
        cache.set(addr, null);
      }

      setGeocodeCount(i + 1);

      // 변환 완료 주소부터 지도에 실시간 반영
      const pts = allVals
        .map((a) => {
          if (!a) return null;
          const coord = cache.get(a);
          if (!coord) return null;
          return { ...coord, label: a };
        })
        .filter((p): p is { lat: number; lng: number; label: string } => p !== null);
      setGeocodedPts(pts);
    }

    setGeocoding(false);
  }, [cols]);

  // 지도 탭 진입 시 자동 지오코딩 — ref 플래그로 탭 전환 시 재시작 방지
  useEffect(() => {
    if (
      activeTab === "map" &&
      !latLng &&
      addressCol &&
      !geocodingStartedRef.current   // 이 파일에서 아직 한 번도 시작 안 했을 때만
    ) {
      geocodingStartedRef.current = true;
      geocodeAddresses(addressCol);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, addressCol]);

  // ── 파일 파싱 ─────────────────────────────────────────────
  const processData = useCallback((data: Record<string, unknown>[], name: string) => {
    if (!data || data.length === 0) { setError("데이터가 비어 있습니다."); return; }
    const keys = Object.keys(data[0]);
    const colMetas: ColMeta[] = keys.map((k) => {
      const rawVals = data.map((r) => r[k] ?? null);
      const type = detectType(rawVals);
      const values = type === "numeric"
        ? rawVals.map(parseNumeric)
        : rawVals.map((v) => (v === null || v === undefined ? null : String(v)));
      const id = isIdCol(k, values, data.length);
      return { name: k, type, values, isId: id } as ColMeta;
    });
    setRows(data);
    setCols(colMetas);
    setFileName(name);
    setActiveTab("overview");
    setError(null);
    // 새 파일 로드 시 지오코딩 + 시트 상태 초기화
    setGeocodedPts([]);
    setGeocodeCount(0);
    setGeocodeTotal(0);
    setGeocoding(false);
    geocodingStartedRef.current = false;
    setSheetNames([]);
    setSelectedSheet(null);
    setPendingWb(null);

    // ── 분석 로그 기록 (비동기, 실패해도 UX 영향 없음) ────────
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      let userName: string | null = null;
      let organization: string | null = null;
      let userType: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, organization, user_type")
          .eq("id", user.id)
          .single();
        if (profile) {
          userName     = profile.name;
          organization = profile.organization;
          userType     = profile.user_type;
        }
      }
      // 같은 사용자가 동일 파일을 이미 분석한 경우 중복 로그 생략
      if (user?.id) {
        const { data: dup } = await supabase
          .from("analysis_logs")
          .select("id")
          .eq("user_id", user.id)
          .eq("file_name", name)
          .limit(1)            // 동일 파일 로그가 2개 이상이면 maybeSingle이 에러나므로 1개로 제한
          .maybeSingle();
        if (dup) return;
      }
      supabase.from("analysis_logs").insert({
        user_id:      user?.id ?? null,
        user_email:   user?.email ?? null,
        user_name:    userName,
        organization,
        user_type:    userType,
        session_type: "file",
        file_name:    name,
        file_type:    ext,
        row_count:    data.length,
        col_count:    keys.length,
      }).then(({ error }) => {
        if (error) console.error("[analysis_log]", error.message, error.details);
      });
    });
  }, []);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        let text = new TextDecoder("utf-8").decode(buffer);
        // UTF-8로 깨지면 EUC-KR(CP949)로 재시도
        if (text.includes("�")) {
          try { text = new TextDecoder("euc-kr").decode(buffer); } catch { /* UTF-8 유지 */ }
        }
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (res) => processData(res.data as Record<string, unknown>[], file.name),
          error: () => setError("CSV 파일을 읽을 수 없습니다."),
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // readAsBinaryString(구식)/type:"binary" 대신 ArrayBuffer 방식 사용
          const wb = XLSX.read(e.target?.result, { type: "array" });
          if (wb.SheetNames.length > 1) {
            // 시트가 여러 개면 사용자가 선택하도록 대기
            setSheetNames(wb.SheetNames);
            setSelectedSheet(wb.SheetNames[0]);
            setPendingWb(wb);
            setFileName(file.name); // 파일명만 먼저 표시
          } else {
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
            processData(data, file.name);
          }
        } catch {
          setError("Excel 파일을 읽을 수 없습니다.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("CSV 또는 Excel(.xlsx/.xls) 파일만 지원합니다.");
    }
  }, [processData]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setFileName(null); setRows([]); setCols([]); setError(null);
    setGeocodedPts([]); setGeocodeCount(0); setGeocodeTotal(0); setGeocoding(false);
    geocodingStartedRef.current = false;
    setSheetNames([]); setSelectedSheet(null); setPendingWb(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Excel 시트 선택 후 분석 시작
  const loadSelectedSheet = useCallback(() => {
    if (!pendingWb || !selectedSheet || !fileName) return;
    const ws = pendingWb.Sheets[selectedSheet];
    const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
    setSheetNames([]);
    setPendingWb(null);
    processData(data, fileName);
  }, [pendingWb, selectedSheet, fileName, processData]);

  // 차트 SVG → PNG 다운로드
  const downloadChart = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const { width, height } = svg.getBoundingClientRect();
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `chart_${selectedChartType ?? "export"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  }, [selectedChartType]);

  // ── 통계 계산 ─────────────────────────────────────────────
  // isId 열 제외 후 시각화용 열 목록 — cols가 바뀔 때만 재계산(렌더링마다 필터 방지)
  const numericCols = useMemo(() => cols.filter((c) => c.type === "numeric"), [cols]);
  const vizCols = useMemo(() => cols.filter((c) => !c.isId), [cols]); // 미니차트/차트에서 사용
  const catCols = useMemo(() => cols.filter((c) => c.type === "categorical"), [cols]);
  const numericVizCols = useMemo(() => numericCols.filter((c) => !c.isId), [numericCols]);

  // Pearson 상관행렬 (수치형 비-ID 열 2개 이상 시)
  const corrMatrix = useMemo(() => {
    if (numericVizCols.length < 2) return null;
    return numericVizCols.map((a) => numericVizCols.map((b) => {
      // 같은 행 인덱스 기준으로 두 열 모두 유효한 값만 사용
      const pairs: [number[], number[]] = [[], []];
      (a.values as (number | null)[]).forEach((av, i) => {
        const bv = (b.values as (number | null)[])[i];
        if (av !== null && bv !== null) { pairs[0].push(av); pairs[1].push(bv); }
      });
      return pearsonCorr(pairs[0], pairs[1]);
    }));
  }, [numericVizCols]);

  // ── 차트 탭 데이터 useMemo ──────────────────────────────────

  // 막대/선/영역 — X별 Y 평균 집계 (상위 30개 항목)
  const aggChartData = useMemo(() => {
    if (!xCol || !yCol) return [];
    const xMeta = cols.find((c) => c.name === xCol);
    const yMeta = cols.find((c) => c.name === yCol);
    if (!xMeta || !yMeta) return [];
    const map = new Map<string, number[]>();
    rows.forEach((_, i) => {
      const xv = String(xMeta.values[i] ?? "");
      const yv = parseNumeric(yMeta.values[i]);
      if (!xv || yv === null) return;
      if (!map.has(xv)) map.set(xv, []);
      map.get(xv)!.push(yv);
    });
    return [...map.entries()]
      .slice(0, 30)
      .map(([label, vals]) => ({ label, value: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)) }));
  }, [cols, rows, xCol, yCol]);

  // 파이/도넛 — 항목별 빈도 or 합계
  const pieChartData = useMemo(() => {
    if (!xCol) return [];
    const xMeta = cols.find((c) => c.name === xCol);
    if (!xMeta) return [];
    if (yCol) {
      const yMeta = cols.find((c) => c.name === yCol);
      if (!yMeta) return [];
      const map = new Map<string, number>();
      rows.forEach((_, i) => {
        const xv = String(xMeta.values[i] ?? "");
        const yv = parseNumeric(yMeta.values[i]);
        if (!xv || yv === null) return;
        map.set(xv, (map.get(xv) ?? 0) + yv);
      });
      return [...map.entries()].slice(0, 12).map(([name, value]) => ({ name, value }));
    }
    return makeFrequency(xMeta.values, 12).map(({ label, count }) => ({ name: label, value: count }));
  }, [cols, rows, xCol, yCol]);

  // 산점도/버블 — 유효 좌표 포인트
  const scatterChartData = useMemo(() => {
    if (!xCol || !yCol) return [];
    const xMeta = cols.find((c) => c.name === xCol);
    const yMeta = cols.find((c) => c.name === yCol);
    const zMeta = zCol ? cols.find((c) => c.name === zCol) : null;
    if (!xMeta || !yMeta) return [];
    return rows
      .map((_, i) => ({ x: parseNumeric(xMeta.values[i]), y: parseNumeric(yMeta.values[i]), z: zMeta ? (parseNumeric(zMeta.values[i]) ?? 1) : 1 }))
      .filter((p): p is { x: number; y: number; z: number } => p.x !== null && p.y !== null);
  }, [cols, rows, xCol, yCol, zCol]);

  // 히스토그램 — 선택 수치 열 분포
  const histChartData = useMemo(() => {
    if (!xCol) return [];
    const meta = cols.find((c) => c.name === xCol);
    if (!meta || meta.type !== "numeric") return [];
    return makeHistogram((meta.values as (number | null)[]).filter(isNumeric) as number[]);
  }, [cols, xCol]);

  // 레이더 — 수치 열 정규화 평균 (0~100%)
  const radarChartData = useMemo(() => {
    return radarCols.map((colName) => {
      const meta = cols.find((c) => c.name === colName);
      if (!meta) return { col: colName, value: 0 };
      const vals = (meta.values as (number | null)[]).filter((v): v is number => v !== null);
      if (!vals.length) return { col: colName, value: 0 };
      const mn = arrMin(vals), mx = arrMax(vals);
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      const normalized = mx > mn ? parseFloat((((avg - mn) / (mx - mn)) * 100).toFixed(1)) : 50;
      return { col: colName, value: normalized };
    });
  }, [cols, radarCols]);

  // 히트맵 — X×Y 교차 빈도 or Z 평균
  const heatmapChartData = useMemo(() => {
    if (!xCol || !yCol) return { xLabels: [] as string[], yLabels: [] as string[], matrix: [] as number[][], maxVal: 0 };
    const xMeta = cols.find((c) => c.name === xCol);
    const yMeta = cols.find((c) => c.name === yCol);
    const zMeta = zCol ? cols.find((c) => c.name === zCol) : null;
    if (!xMeta || !yMeta) return { xLabels: [], yLabels: [], matrix: [], maxVal: 0 };
    const xLabels = makeFrequency(xMeta.values, 10).map((f) => f.label);
    const yLabels = makeFrequency(yMeta.values, 10).map((f) => f.label);
    const countMap = new Map<string, number[]>();
    rows.forEach((_, i) => {
      const xv = String(xMeta.values[i] ?? "");
      const yv = String(yMeta.values[i] ?? "");
      if (!xLabels.includes(xv) || !yLabels.includes(yv)) return;
      const key = `${xv}|${yv}`;
      if (!countMap.has(key)) countMap.set(key, []);
      const zv = zMeta ? (parseNumeric(zMeta.values[i]) ?? 1) : 1;
      countMap.get(key)!.push(zv);
    });
    const matrix = yLabels.map((yl) =>
      xLabels.map((xl) => {
        const vals = countMap.get(`${xl}|${yl}`) ?? [];
        return vals.length ? (zMeta ? vals.reduce((s, v) => s + v, 0) / vals.length : vals.length) : 0;
      })
    );
    const maxVal = Math.max(0, ...matrix.flat());
    return { xLabels, yLabels, matrix, maxVal };
  }, [cols, rows, xCol, yCol, zCol]);

  // 트리맵 — 항목별 비중
  const treemapChartData = useMemo(() => {
    if (!xCol) return [];
    const xMeta = cols.find((c) => c.name === xCol);
    if (!xMeta) return [];
    if (yCol) {
      const yMeta = cols.find((c) => c.name === yCol);
      if (yMeta) {
        const map = new Map<string, number>();
        rows.forEach((_, i) => {
          const xv = String(xMeta.values[i] ?? "");
          const yv = parseNumeric(yMeta.values[i]);
          if (!xv || yv === null) return;
          map.set(xv, (map.get(xv) ?? 0) + yv);
        });
        return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, size], i) => ({ name, size, fill: COLORS[i % COLORS.length] }));
      }
    }
    return makeFrequency(xMeta.values, 20).map((d, i) => ({ name: d.label, size: d.count, fill: COLORS[i % COLORS.length] }));
  }, [cols, rows, xCol, yCol]);

  // ── Excel 멀티시트 선택 화면 ──────────────────────────────
  if (sheetNames.length > 0 && pendingWb) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 flex flex-col items-center">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-1">시트 선택</h2>
          <p className="text-sm text-neutral-500">
            이 Excel 파일에 시트가 {sheetNames.length}개 있습니다. 분석할 시트를 선택하세요.
          </p>
        </div>
        <div className="w-full space-y-2 mb-6">
          {sheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedSheet(name)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
                ${selectedSheet === name ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 hover:border-brand-300 text-neutral-700"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setSheetNames([]); setPendingWb(null); setFileName(null); }}
            className="px-4 py-2 rounded-xl text-sm text-neutral-500 border border-neutral-200 hover:border-neutral-300 transition-colors"
          >
            취소
          </button>
          <button
            onClick={loadSelectedSheet}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            분석 시작
          </button>
        </div>
      </div>
    );
  }

  // ── 업로드 전 화면 ─────────────────────────────────────────
  if (!fileName) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white mb-4">
            <TrendingUp size={30} />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">자동 데이터 분석</h1>
          <p className="text-neutral-500 text-sm">CSV 또는 Excel 파일을 업로드하면 자동으로 통계 분석과 시각화를 제공합니다.</p>
        </div>

        {/* 개인정보 포함 파일 업로드 금지 안내 */}
        <div className="w-full mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">주의:</span> 개인정보(이름, 주민번호, 연락처 등)가 포함된 파일은 업로드하지 마세요.
            업로드된 파일 내용은 분석 목적으로만 처리되며 서버에 저장되지 않습니다.
            단, 지도 기능 사용 시 주소 데이터는 좌표 변환을 위해 외부 지도 서비스(OpenStreetMap)로 전송될 수 있습니다.
          </p>
        </div>

        {/* 드래그 앤 드롭 영역 */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200
            ${dragOver ? "border-brand-500 bg-brand-50" : "border-neutral-300 bg-white hover:border-brand-400 hover:bg-brand-50/40"}`}
        >
          <Upload size={40} className={dragOver ? "text-brand-500" : "text-neutral-400"} />
          <div className="text-center">
            <p className="font-semibold text-neutral-700">파일을 드래그하거나 클릭해서 업로드</p>
            <p className="text-sm text-neutral-400 mt-1">CSV, XLSX, XLS 지원 · 최대 50MB</p>
          </div>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onInputChange} />
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* 지원 포맷 안내 */}
        <div className="mt-8 grid grid-cols-3 gap-4 w-full text-center text-sm">
          {[
            { label: "CSV", desc: "쉼표 구분 텍스트" },
            { label: "XLSX", desc: "Excel 2007+" },
            { label: "XLS", desc: "Excel 구버전" },
          ].map((f) => (
            <div key={f.label} className="bg-white rounded-xl border border-neutral-200 p-4">
              <p className="font-bold text-brand-600">{f.label}</p>
              <p className="text-neutral-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 분석 결과 화면 ─────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-brand-600" />
          <div>
            <h1 className="font-bold text-neutral-900 text-lg">{fileName}</h1>
            <p className="text-xs text-neutral-400">{rows.length.toLocaleString()}행 · {cols.length}열</p>
          </div>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-500 transition-colors">
          <X size={15} /> 파일 초기화
        </button>
      </div>

      {/* 탭 — 위치 데이터 없으면 지도 탭 숨김 */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl mb-6 w-fit">
        {([
          { id: "overview", label: "개요",            icon: <TrendingUp size={14} />, show: true },
          { id: "charts",   label: "차트",             icon: <BarChart2  size={14} />, show: true },
          { id: "table",    label: "데이터 미리보기",  icon: <Table2     size={14} />, show: true },
          { id: "map",      label: "지도",             icon: <MapIcon    size={14} />, show: !!latLng || !!addrDetected, badge: true },
        ] as const).filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative
              ${activeTab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
          >
            {t.icon}{t.label}
            {t.id === "map" && t.badge && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      {/* ── 탭: 개요 ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "전체 행", value: rows.length.toLocaleString() },
              { label: "전체 열", value: cols.length },
              { label: "수치 열", value: numericCols.length },
              { label: "범주 열", value: catCols.length },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-5">
                <p className="text-xs text-neutral-400 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-brand-600">{s.value}</p>
              </div>
            ))}
          </div>

          {/* 수치 열 통계 테이블 */}
          {numericCols.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800">수치형 열 기초 통계</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 text-xs">
                    <tr>
                      {["열 이름", "개수", "평균", "중앙값", "표준편차", "최솟값", "최댓값", "결측값"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {numericCols.map((col) => {
                      const s = calcStats(col.values as (number | null)[]);
                      return (
                        <tr key={col.name} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 font-medium text-neutral-800 whitespace-nowrap">{col.name}</td>
                          <td className="px-4 py-3 text-neutral-600">{s.count}</td>
                          <td className="px-4 py-3 text-neutral-600">{s.mean}</td>
                          <td className="px-4 py-3 text-neutral-600">{s.median}</td>
                          <td className="px-4 py-3 text-neutral-600">{s.std}</td>
                          <td className="px-4 py-3 text-neutral-600">{s.min}</td>
                          <td className="px-4 py-3 text-neutral-600">{s.max}</td>
                          <td className="px-4 py-3 text-neutral-600">{s.nullCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 범주 열 고유값 수 */}
          {catCols.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800">범주형 열 요약</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 text-xs">
                    <tr>
                      {["열 이름", "고유값 수", "최빈값", "결측값"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {catCols.map((col) => {
                      const freq = makeFrequency(col.values, 1);
                      const nullCnt = col.values.filter((v) => v === null || v === "").length;
                      return (
                        <tr key={col.name} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 font-medium text-neutral-800">{col.name}</td>
                          <td className="px-4 py-3 text-neutral-600">
                            {new Set(col.values.filter(Boolean).map(String)).size}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">{freq[0]?.label ?? "-"}</td>
                          <td className="px-4 py-3 text-neutral-600">{nullCnt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 상관관계 행렬 (수치형 비-ID 열 2개 이상 시) */}
          {corrMatrix && numericVizCols.length >= 2 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800">수치형 열 상관관계 (Pearson)</h2>
                <p className="text-xs text-neutral-400 mt-0.5">−1(음의 상관) ↔ 0(무관) ↔ +1(양의 상관)</p>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="text-xs border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="w-24" />
                      {numericVizCols.map((c) => (
                        <th key={c.name} className="px-2 py-1 text-neutral-500 font-medium max-w-[80px]">
                          <div className="truncate max-w-[72px]" title={c.name}>{c.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {numericVizCols.map((row, ri) => (
                      <tr key={row.name}>
                        <td className="pr-2 text-right text-neutral-500 font-medium whitespace-nowrap max-w-[96px]">
                          <div className="truncate max-w-[88px]" title={row.name}>{row.name}</div>
                        </td>
                        {corrMatrix[ri].map((val, ci) => {
                          // 색상: 양의 상관 → 청록, 음의 상관 → 주황, 대각선 → 회색
                          const isDiag = ri === ci;
                          const alpha = isDiag ? 0.15 : Math.abs(val);
                          const bg = isDiag
                            ? "rgba(120,120,120,0.15)"
                            : val > 0
                            ? `rgba(13,115,119,${alpha * 0.7 + 0.05})`
                            : `rgba(234,88,12,${alpha * 0.7 + 0.05})`;
                          const textColor = alpha > 0.5 && !isDiag ? "text-white" : "text-neutral-700";
                          return (
                            <td key={ci} className={`text-center rounded-md px-2 py-1.5 font-mono ${textColor}`}
                              style={{ background: bg, minWidth: 52 }}>
                              {isDiag ? "1.000" : val.toFixed(3)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 수치형 열 레이더 비교 (3개 이상일 때) */}
          {numericVizCols.length >= 3 && (() => {
            const statsMap = new Map(numericVizCols.map(col => {
              const vals = (col.values as (number|null)[]).filter((v): v is number => v !== null);
              if (!vals.length) return [col.name, null];
              const sorted = [...vals].sort((a, b) => a - b);
              const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
              const max = sorted[sorted.length - 1];
              return [col.name, { mean, max, nullRatio: col.values.filter(v => v === null).length / col.values.length }];
            }));
            // 각 열을 최댓값으로 정규화한 레이더 데이터 (열 당 하나의 포인트)
            const radarData = numericVizCols.map(col => {
              const s = statsMap.get(col.name);
              return { col: col.name.length > 8 ? col.name.slice(0, 8) + "…" : col.name, 평균: s ? parseFloat(((s.mean / (s.max || 1)) * 100).toFixed(1)) : 0 };
            });
            return (
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100">
                  <h2 className="font-semibold text-neutral-800">수치형 열 레이더 비교</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">각 열의 평균값을 최댓값 기준으로 정규화 (0~100%)</p>
                </div>
                <div className="p-4 flex justify-center">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="col" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      <Radar name="평균(정규화)" dataKey="평균" stroke="#0D7377" fill="#0D7377" fillOpacity={0.2} dot={{ r: 4, fill: "#0D7377" }} />
                      <Tooltip formatter={(v) => [`${v}%`, "정규화 평균"]} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* 자동 시각화 — 전체 열 미니 차트 (isId 열 제외) */}
          <div>
            <h2 className="font-semibold text-neutral-800 mb-4">자동 시각화</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vizCols.map((col) => {
                const isNum  = col.type === "numeric";
                const isDate = col.type === "date";
                const chartData = isNum
                  ? makeHistogram((col.values as (number | null)[]).filter(isNumeric) as number[], 8)
                  : isDate
                  ? makeDateFrequency(col.values, 12)
                  : makeFrequency(col.values, 8);
                // 범주형 고카디널리티 감지 (고유값 > 50 또는 고유값/행수 > 50%)
                const uniqueCount = !isNum && !isDate
                  ? new Set(col.values.filter(Boolean).map(String)).size
                  : 0;
                const isHighCardinality = !isNum && !isDate && (uniqueCount > 50 || uniqueCount / rows.length > 0.5);

                return (
                  <div key={col.name} className="bg-white rounded-2xl border border-neutral-200 p-4 hover:border-brand-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-neutral-800 truncate">{col.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 flex-shrink-0 ml-2">
                        {isNum ? "수치" : isDate ? "날짜" : "범주"}
                      </span>
                    </div>
                    {isHighCardinality && (
                      <div className="mb-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                        고유값 {uniqueCount}개 — 상위 8개만 표시
                      </div>
                    )}
                    {isNum ? (
                      // 수치형: 히스토그램 막대
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart data={chartData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 8 }} />
                          <Tooltip formatter={(v) => [`${v}`, "빈도"]} contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                            {chartData.map((_, i) => <Cell key={i} fill="#0D7377" />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : isDate ? (
                      // 날짜형: 월별 집계 선 차트
                      <ResponsiveContainer width="100%" height={110}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 8 }} />
                          <Tooltip formatter={(v) => [`${v}건`, "건수"]} contentStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="count" stroke="#0D7377" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      // 범주형: 가로 막대
                      <ResponsiveContainer width="100%" height={Math.max(110, chartData.length * 22)}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                          <XAxis type="number" tick={{ fontSize: 8 }} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 8 }} width={90}
                            tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v} />
                          <Tooltip content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload as { label: string; count: number };
                            return (
                              <div className="bg-white border border-neutral-200 rounded-lg p-2 text-xs shadow-md max-w-[180px]">
                                <p className="font-semibold text-neutral-800 mb-0.5 break-words">{d.label}</p>
                                <p className="text-brand-600">{d.count.toLocaleString()}건</p>
                              </div>
                            );
                          }} />
                          <Bar dataKey="count" radius={[0, 2, 2, 0]} barSize={14}>
                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 탭: 차트 ── */}
      {activeTab === "charts" && (
        <div className="space-y-5">

          {/* STEP 1: 차트 종류 선택 */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">① 차트 종류 선택</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {CHART_TYPES.map(({ id, label, Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => {
                    setSelectedChartType(id);
                    setChartGenerated(false);
                    setXCol(null); setYCol(null); setZCol(null); setRadarCols([]);
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center
                    ${selectedChartType === id
                      ? "border-brand-500 bg-brand-50"
                      : "border-neutral-200 hover:border-brand-300 hover:bg-neutral-50"}`}
                >
                  <Icon size={20} className={selectedChartType === id ? "text-brand-600" : "text-neutral-400"} />
                  <span className={`text-xs font-semibold leading-tight ${selectedChartType === id ? "text-brand-700" : "text-neutral-700"}`}>{label}</span>
                  <span className="text-[10px] text-neutral-400 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: 컬럼 선택 */}
          {selectedChartType && (() => {
            const ct = selectedChartType;
            const isXY = ["bar", "bar-h", "line", "area"].includes(ct);
            const isPie = ["pie", "donut"].includes(ct);
            const isScatter = ct === "scatter";
            const isBubble = ct === "bubble";
            const isHist = ct === "histogram";
            const isRadar = ct === "radar";
            const isHeatmap = ct === "heatmap";
            const isTreemap = ct === "treemap";
            const anyCols = cols.filter((c) => !c.isId);
            const numOnly = numericVizCols;
            const catOnly = vizCols.filter((c) => c.type === "categorical");

            const ColPicker = ({ label, value, onChange, options, note }: {
              label: string; value: string | null; onChange: (v: string) => void;
              options: ColMeta[]; note?: string;
            }) => (
              <div>
                <p className="text-xs text-neutral-500 mb-2 font-medium">
                  {label} {note && <span className="text-neutral-400 font-normal">({note})</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((col) => (
                    <button key={col.name} onClick={() => onChange(col.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${value === col.name ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                      {col.name}
                      <span className={`ml-1 text-[10px] ${value === col.name ? "opacity-70" : "text-neutral-400"}`}>
                        {col.type === "numeric" ? "수치" : col.type === "date" ? "날짜" : "범주"}
                      </span>
                    </button>
                  ))}
                  {options.length === 0 && <p className="text-xs text-neutral-400">해당하는 컬럼이 없습니다.</p>}
                </div>
              </div>
            );

            const canGen =
              (isXY && xCol && yCol) ||
              (isPie && xCol) ||
              (isScatter && xCol && yCol && xCol !== yCol) ||
              (isBubble && xCol && yCol && zCol) ||
              (isHist && xCol) ||
              (isRadar && radarCols.length >= 2) ||
              (isHeatmap && xCol && yCol) ||
              (isTreemap && xCol);

            return (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">② 컬럼 선택</p>

                {isXY && (
                  <>
                    <ColPicker label="X축 컬럼" value={xCol} onChange={setXCol} options={anyCols} />
                    <ColPicker label="Y축 컬럼" value={yCol} onChange={setYCol} options={numOnly} note="수치형만" />
                  </>
                )}
                {isPie && (
                  <>
                    <ColPicker label="항목 컬럼" value={xCol} onChange={setXCol} options={catOnly} note="범주형 권장" />
                    <ColPicker label="값 컬럼" value={yCol} onChange={setYCol} options={numOnly} note="수치형, 선택사항" />
                    {yCol && <button onClick={() => setYCol(null)} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">값 컬럼 제거 (빈도수 사용)</button>}
                  </>
                )}
                {isScatter && (
                  <>
                    <ColPicker label="X축 컬럼" value={xCol} onChange={setXCol} options={numOnly} note="수치형만" />
                    <ColPicker label="Y축 컬럼" value={yCol} onChange={setYCol} options={numOnly} note="수치형만" />
                  </>
                )}
                {isBubble && (
                  <>
                    <ColPicker label="X축 컬럼" value={xCol} onChange={setXCol} options={numOnly} note="수치형만" />
                    <ColPicker label="Y축 컬럼" value={yCol} onChange={setYCol} options={numOnly} note="수치형만" />
                    <ColPicker label="버블 크기 컬럼" value={zCol} onChange={setZCol} options={numOnly} note="수치형만" />
                  </>
                )}
                {isHist && (
                  <ColPicker label="수치 컬럼" value={xCol} onChange={setXCol} options={numOnly} note="수치형만" />
                )}
                {isRadar && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-2 font-medium">수치 컬럼 선택 <span className="text-neutral-400 font-normal">(2개 이상)</span></p>
                    <div className="flex flex-wrap gap-2">
                      {numOnly.map((col) => {
                        const checked = radarCols.includes(col.name);
                        return (
                          <button key={col.name}
                            onClick={() => setRadarCols((prev) => checked ? prev.filter((c) => c !== col.name) : [...prev, col.name])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                              ${checked ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                            {col.name}
                          </button>
                        );
                      })}
                    </div>
                    {radarCols.length > 0 && <p className="text-xs text-neutral-400 mt-2">{radarCols.length}개 선택됨</p>}
                  </div>
                )}
                {isHeatmap && (
                  <>
                    <ColPicker label="X축 컬럼" value={xCol} onChange={setXCol} options={catOnly} note="범주형 권장" />
                    <ColPicker label="Y축 컬럼" value={yCol} onChange={setYCol} options={catOnly} note="범주형 권장" />
                    <ColPicker label="값 컬럼" value={zCol} onChange={setZCol} options={numOnly} note="수치형, 선택사항" />
                    {zCol && <button onClick={() => setZCol(null)} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">값 컬럼 제거 (빈도수 사용)</button>}
                  </>
                )}
                {isTreemap && (
                  <>
                    <ColPicker label="항목 컬럼" value={xCol} onChange={setXCol} options={catOnly} note="범주형 권장" />
                    <ColPicker label="값 컬럼" value={yCol} onChange={setYCol} options={numOnly} note="수치형, 선택사항" />
                    {yCol && <button onClick={() => setYCol(null)} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">값 컬럼 제거 (빈도수 사용)</button>}
                  </>
                )}

                <button
                  onClick={() => setChartGenerated(true)}
                  disabled={!canGen}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95
                    bg-brand-600 hover:bg-brand-700 text-white disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
                >
                  <BarChart2 size={15} /> 차트 생성
                </button>
              </div>
            );
          })()}

          {/* STEP 3: 생성된 차트 */}
          {chartGenerated && selectedChartType && (() => {
            const ct = selectedChartType;
            const isXY = ["bar", "bar-h", "line", "area"].includes(ct);
            const isPie = ["pie", "donut"].includes(ct);
            const isScatter = ct === "scatter";
            const isBubble = ct === "bubble";

            const chartTitle = CHART_TYPES.find((c) => c.id === ct)?.label ?? "";
            const desc = CHART_DESC[ct] ?? "";

            const valid =
              (isXY && aggChartData.length > 0) ||
              (isPie && pieChartData.length > 0) ||
              ((isScatter || isBubble) && scatterChartData.length > 0) ||
              (ct === "histogram" && histChartData.length > 0) ||
              (ct === "radar" && radarChartData.length >= 2) ||
              (ct === "heatmap" && heatmapChartData.xLabels.length > 0) ||
              (ct === "treemap" && treemapChartData.length > 0);

            if (!valid) return (
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-10 text-center text-sm text-neutral-400">
                선택한 컬럼에 유효한 데이터가 없습니다. 다른 컬럼을 선택해주세요.
              </div>
            );

            return (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4" ref={chartRef}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-neutral-900 text-base">{chartTitle}</h2>
                    <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">{desc}</p>
                  </div>
                  <button onClick={downloadChart}
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-brand-600 transition-colors border border-neutral-200 hover:border-brand-300 rounded-lg px-3 py-1.5 flex-shrink-0">
                    <Download size={12} /> PNG 저장
                  </button>
                </div>

                {ct === "bar" && (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={aggChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [v, yCol ?? ""]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {aggChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {ct === "bar-h" && (
                  <ResponsiveContainer width="100%" height={Math.max(300, aggChartData.length * 36)}>
                    <BarChart data={aggChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={140}
                        tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "\u2026" : v} />
                      <Tooltip formatter={(v) => [v, yCol ?? ""]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                        {aggChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {ct === "line" && (
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={aggChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [v, yCol ?? ""]} />
                      <Line type="monotone" dataKey="value" stroke="#0D7377" strokeWidth={2} dot={{ r: 4, fill: "#0D7377" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {ct === "area" && (
                  <ResponsiveContainer width="100%" height={360}>
                    <AreaChart data={aggChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <defs>
                        <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0D7377" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0D7377" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [v, yCol ?? ""]} />
                      <Area type="monotone" dataKey="value" stroke="#0D7377" fill="url(#chartAreaGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {ct === "pie" && (
                  <ResponsiveContainer width="100%" height={380}>
                    <PieChart>
                      <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        outerRadius={pieChartData.length <= 6 ? 130 : 110}
                        label={pieChartData.length <= 6 ? (({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`) : undefined}
                        labelLine={pieChartData.length <= 6}>
                        {pieChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {ct === "donut" && (() => {
                  const total = pieChartData.reduce((s, d) => s + d.value, 0);
                  return (
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={80} outerRadius={130}>
                          {pieChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={18} fontWeight={700} fill="#1a1a1a">
                          {total.toLocaleString()}
                        </text>
                        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#6b7280">합계</text>
                        <Tooltip formatter={(v, name) => [v, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}

                {(isScatter || isBubble) && (() => {
                  const zVals = isBubble ? scatterChartData.map((p) => p.z) : [];
                  const zRange: [number, number] = isBubble && zVals.length > 0 && arrMax(zVals) > arrMin(zVals) ? [20, 500] : [60, 60];
                  const n = scatterChartData.length;
                  const sx = scatterChartData.reduce((s, p) => s + p.x, 0);
                  const sy = scatterChartData.reduce((s, p) => s + p.y, 0);
                  const sxy = scatterChartData.reduce((s, p) => s + p.x * p.y, 0);
                  const sx2 = scatterChartData.reduce((s, p) => s + p.x * p.x, 0);
                  const sy2 = scatterChartData.reduce((s, p) => s + p.y * p.y, 0);
                  const xDenom = n * sx2 - sx * sx;
                  const slope = xDenom !== 0 ? (n * sxy - sx * sy) / xDenom : 0;
                  const intercept = (sy - slope * sx) / n;
                  const rDenom = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
                  const r = rDenom !== 0 ? (n * sxy - sx * sy) / rDenom : 0;
                  const r2 = r * r;
                  const corrLabel = Math.abs(r) < 0.1 ? "거의 없음"
                    : `${r > 0 ? "양의" : "음의"} ${Math.abs(r) >= 0.7 ? "강한" : Math.abs(r) >= 0.4 ? "중간" : "약한"} 상관관계`;
                  const xMin = arrMin(scatterChartData.map((p) => p.x));
                  const xMax = arrMax(scatterChartData.map((p) => p.x));
                  const trendData = [{ x: xMin, trend: slope * xMin + intercept }, { x: xMax, trend: slope * xMax + intercept }];
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="x" type="number" tick={{ fontSize: 11 }}
                            label={{ value: xCol ?? "", position: "insideBottom", offset: -15, fontSize: 12, fill: "#0D7377", fontWeight: 600 }} />
                          <YAxis type="number" tick={{ fontSize: 11 }}
                            label={{ value: yCol ?? "", angle: -90, position: "insideLeft", offset: 15, fontSize: 12, fill: "#10b981", fontWeight: 600 }} />
                          <ZAxis dataKey="z" range={zRange} />
                          <Tooltip content={({ payload }) => {
                            if (!payload?.length) return null;
                            const p = payload[0]?.payload as { x: number; y: number; z?: number };
                            return (
                              <div className="bg-white border border-neutral-200 rounded-xl p-3 text-xs shadow-md">
                                <p><span className="font-semibold text-brand-600">{xCol}</span>: {p.x}</p>
                                <p><span className="font-semibold text-emerald-600">{yCol}</span>: {p.y}</p>
                                {isBubble && p.z !== undefined && <p><span className="font-semibold text-purple-600">{zCol}</span>: {p.z}</p>}
                              </div>
                            );
                          }} />
                          <Scatter data={scatterChartData} fill="#0D7377" fillOpacity={0.55} />
                          {isScatter && <Line dataKey="trend" stroke="#f59e0b" strokeWidth={2} dot={false} type="linear" isAnimationActive={false} strokeDasharray="6 3" />}
                        </ComposedChart>
                      </ResponsiveContainer>
                      {isScatter && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "피어슨 r", value: r.toFixed(3), highlight: Math.abs(r) >= 0.7 },
                            { label: "결정계수 R²", value: r2.toFixed(3), highlight: false },
                            { label: "해석", value: corrLabel, highlight: false },
                          ].map((s) => (
                            <div key={s.label} className="bg-neutral-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-neutral-400 mb-1">{s.label}</p>
                              <p className={`text-sm font-bold ${s.highlight ? "text-brand-600" : "text-neutral-700"}`}>{s.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                {ct === "histogram" && (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={histChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}건`, "빈도"]} />
                      <Bar dataKey="count" fill="#0D7377" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {ct === "radar" && (
                  <ResponsiveContainer width="100%" height={360}>
                    <RadarChart data={radarChartData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="col" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      <Radar name="평균(정규화)" dataKey="value" stroke="#0D7377" fill="#0D7377" fillOpacity={0.25} dot={{ r: 4, fill: "#0D7377" }} />
                      <Tooltip formatter={(v) => [`${v}%`, "정규화 평균"]} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                )}

                {ct === "heatmap" && (() => {
                  const { xLabels, yLabels, matrix, maxVal } = heatmapChartData;
                  const cellSize = Math.min(72, Math.max(40, Math.floor(560 / Math.max(xLabels.length, 1))));
                  return (
                    <div className="overflow-x-auto">
                      <table className="border-collapse mx-auto">
                        <thead>
                          <tr>
                            <td style={{ width: 120 }} />
                            {xLabels.map((xl) => (
                              <td key={xl} style={{ width: cellSize, minWidth: cellSize }} className="text-center pb-2">
                                <span className="text-xs text-neutral-500 font-medium block truncate px-1"
                                  style={{ maxWidth: cellSize, writingMode: xLabels.length > 6 ? ("vertical-rl" as const) : ("horizontal-tb" as const) }}>
                                  {xl}
                                </span>
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {yLabels.map((yl, ri) => (
                            <tr key={yl}>
                              <td className="pr-3 text-right text-xs text-neutral-500 font-medium" style={{ maxWidth: 120 }}>
                                <span className="block truncate">{yl}</span>
                              </td>
                              {matrix[ri].map((val, ci) => {
                                const alpha = maxVal > 0 ? val / maxVal : 0;
                                const bg = `rgba(13,115,119,${0.06 + alpha * 0.94})`;
                                const textColor = alpha > 0.55 ? "white" : "#374151";
                                return (
                                  <td key={ci} title={`${yl} × ${xLabels[ci]}: ${val.toFixed(1)}`}
                                    style={{ width: cellSize, height: cellSize, backgroundColor: bg, border: "2px solid white" }}>
                                    <div className="flex items-center justify-center w-full h-full">
                                      <span style={{ fontSize: cellSize < 50 ? 9 : 11, fontWeight: 700, color: textColor }}>
                                        {val > 0 ? (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(val < 10 ? 1 : 0)) : ""}
                                      </span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {ct === "treemap" && (
                  <ResponsiveContainer width="100%" height={400}>
                    <Treemap data={treemapChartData} dataKey="size" nameKey="name"
                      content={({ x, y, width, height, name, fill }: { x?: number; y?: number; width?: number; height?: number; name?: string; fill?: string }) => {
                        const w = width ?? 0; const h = height ?? 0;
                        if (w < 30 || h < 20) return <rect x={x} y={y} width={w} height={h} fill={fill} rx={2} />;
                        return (
                          <g>
                            <rect x={x} y={y} width={w} height={h} fill={fill} rx={4} stroke="white" strokeWidth={2} />
                            {w > 50 && h > 28 && (
                              <text x={(x ?? 0) + w / 2} y={(y ?? 0) + h / 2} textAnchor="middle" dominantBaseline="middle"
                                fontSize={Math.min(13, w / 7)} fill="white" fontWeight={600}>
                                {(name ?? "").length > 10 ? (name ?? "").slice(0, 10) + "…" : name}
                              </text>
                            )}
                          </g>
                        );
                      }}
                    />
                  </ResponsiveContainer>
                )}
              </div>
            );
          })()}

          {!selectedChartType && (
            <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-2xl p-12 text-center text-neutral-400">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">위에서 차트 종류를 선택하세요.</p>
              <p className="text-xs mt-1">컬럼을 선택하고 차트 생성 버튼을 누르면 원하는 차트 하나가 표시됩니다.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 탭: 지도 ── */}
      {activeTab === "map" && (
        <div className="space-y-4">
          {/* ── 주소 기반 지오코딩 모드 (위도/경도 열 없을 때) ── */}
          {!latLng && addressCol && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700">
                    주소 열 감지됨: <span className="text-brand-600">{addressCol}</span>
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    주소를 좌표로 자동 변환합니다 (고유 주소 최대 80개 · 주소당 약 1초 소요)
                  </p>
                </div>
                {geocodedPts.length > 0 && !geocoding && (
                  <button
                    onClick={() => {
                      setGeocodedPts([]);
                      setGeocodeCount(0);
                      geocodingStartedRef.current = false;
                      geocodeAddresses(addressCol);
                    }}
                    className="text-xs text-neutral-400 hover:text-brand-600 transition-colors"
                  >
                    다시 변환
                  </button>
                )}
              </div>

              {/* 진행 바 */}
              {geocoding && (
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
                    <span>좌표 변환 중...</span>
                    <span>{geocodeCount} / {geocodeTotal}</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: geocodeTotal > 0 ? `${(geocodeCount / geocodeTotal) * 100}%` : "0%" }}
                    />
                  </div>
                  {geocodedPts.length > 0 && (
                    <p className="text-xs text-neutral-400 mt-1.5">
                      지금까지 {geocodedPts.length}개 지점 지도에 표시 중...
                    </p>
                  )}
                </div>
              )}

              {/* 완료 결과 요약 */}
              {!geocoding && geocodedPts.length > 0 && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ {geocodedPts.length}개 지점 변환 완료
                  {geocodeTotal - geocodedPts.length > 0 && (
                    <span className="text-neutral-400 font-normal ml-1">
                      ({geocodeTotal - geocodedPts.length}개 주소 변환 실패)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* 주소 지오코딩 지도 */}
          {!latLng && geocodedPts.length > 0 && MapView && (
            <MapView points={geocodedPts} />
          )}

          {/* ── 위도/경도 열 없고 주소 열도 없을 때: 수동으로 열 선택 ── */}
          {!latLng && !addrDetected && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <p className="text-sm font-semibold text-neutral-700 mb-3">좌표 열을 직접 선택해주세요</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-2">위도 열 (세로 방향)</p>
                  <div className="flex flex-wrap gap-2">
                    {cols.filter((c) => c.type === "numeric").map((c) => (
                      <button key={c.name} onClick={() => setManualLat(c.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${manualLat === c.name ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-2">경도 열 (가로 방향)</p>
                  <div className="flex flex-wrap gap-2">
                    {cols.filter((c) => c.type === "numeric").map((c) => (
                      <button key={c.name} onClick={() => setManualLng(c.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${manualLng === c.name ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {manualLat && manualLng && manualLat === manualLng && (
                <p className="text-xs text-amber-600 mt-3">위도와 경도에 서로 다른 열을 선택해주세요.</p>
              )}
            </div>
          )}

          {/* 지도 렌더링 */}
          {manualLat && manualLng && manualLat !== manualLng && mapPoints.length > 0 && MapView && (
            <MapView points={mapPoints} latCol={manualLat} lngCol={manualLng} />
          )}
          {manualLat && manualLng && manualLat !== manualLng && mapPoints.length === 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center text-sm text-neutral-400">
              유효한 좌표 데이터가 없습니다.
            </div>
          )}
          {(!manualLat || !manualLng) && !latLng && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center text-sm text-neutral-400">
              위도·경도 열을 모두 선택하면 지도가 표시됩니다.
            </div>
          )}
        </div>
      )}

      {/* ── 탭: 데이터 미리보기 ── */}
      {activeTab === "table" && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">데이터 미리보기 (상위 100행)</h2>
            <span className="text-xs text-neutral-400">전체 {rows.length.toLocaleString()}행 중 {Math.min(100, rows.length)}행 표시</span>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-xs whitespace-nowrap">
              <thead className="sticky top-0 bg-neutral-50 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-neutral-400 font-medium border-b border-neutral-200">#</th>
                  {cols.map((col) => (
                    <th key={col.name} className="px-3 py-2.5 text-left text-neutral-600 font-medium border-b border-neutral-200">
                      <div>{col.name}</div>
                      <div className="text-[10px] text-neutral-400 font-normal">
                        {col.type === "numeric" ? "수치" : col.type === "date" ? "날짜" : "범주"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 text-neutral-400">{i + 1}</td>
                    {cols.map((col) => (
                      <td key={col.name} className="px-3 py-2 text-neutral-700">
                        {row[col.name] == null || row[col.name] === "" ? (
                          <span className="text-neutral-300 italic">null</span>
                        ) : String(row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
