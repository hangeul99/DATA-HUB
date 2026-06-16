"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ComposedChart, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
} from "recharts";
import { Upload, FileText, X, TrendingUp, Table2, BarChart2, AlertCircle, Map as MapIcon, Download } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

// ?Ä?Ä ?Ä???Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
type ColType = "numeric" | "categorical" | "date";

interface ColMeta {
  name: string;
  type: ColType;
  values: (string | number | null)[];
  isId?: boolean; // ?∞Î≤à/ID ?±Í≤© ?????úÍ∞Å???ùÎûµ
}

interface NumericStats {
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  nullCount: number;
  outlierCount: number; // IQR Í∏∞Î∞ò ?¥ÏÉÅÍ∞???}

interface FreqEntry { label: string; count: number }

// ?Ä?Ä ?†Ìã∏ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
function isNumeric(val: unknown): val is number {
  return typeof val === "number" && !isNaN(val);
}

// YYYYMMDD 8?êÎ¶¨ ?ïÏàò ?®ÌÑ¥ (?úÍµ≠ Í≥µÍ≥µ?∞Ïù¥?∞Ïóê???îÌï®)
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

  // YYYYMMDD 8?êÎ¶¨ ?†Ïßú ?∞ÏÑ† Í∞êÏ?
  const yyyymmddCount = sample.filter(isYYYYMMDD).length;
  if (yyyymmddCount / sample.length > 0.8) return "date";

  const numericCount = sample.filter((v) => !isNaN(Number(v))).length;
  if (numericCount / sample.length > 0.8) return "numeric";

  const dateCount = sample.filter((v) => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / sample.length > 0.8) return "date";
  return "categorical";
}

// ?∞Î≤à/ID ?±Í≤© ??Í∞êÏ? (?úÍ∞Å???òÎ? ?ÜÏùå)
const ID_KEYWORDS = ["?∞Î≤à", "Î≤àÌò∏", "?úÎ≤à", "no", "id", "seq", "index", "idx"];
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

  // IQR Í∏∞Î∞ò ?¥ÏÉÅÍ∞?(Tukey fence)
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
  const min = Math.min(...vals);
  const max = Math.max(...vals);
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

// ?†Ïßú ???îÎ≥Ñ ÏßëÍ≥Ñ (YYYY-MM ?®ÏúÑ, ?†Ïßú???ïÎ†¨)
// YYYYMMDD 8?êÎ¶¨ ?ïÏàò??Ï≤òÎ¶¨
function makeDateFrequency(vals: (string | number | null)[], maxMonths = 36): FreqEntry[] {
  const map = new Map<string, number>();
  vals.forEach((v) => {
    if (v === null || v === "") return;
    let d: Date;
    const s = String(v);
    if (YYYYMMDD_RE.test(s)) {
      // 20231231 ??2023-12-31
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

// Pearson ?ÅÍ?Í≥ÑÏàò Í≥ÑÏÇ∞
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

// ?Ä?Ä Ïª¨Îü¨ ?îÎ†à???Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
const COLORS = ["#0D7377", "#2A9898", "#4FAFAF", "#0E253C", "#2D5F8F", "#4D7FB1", "#7A9FC5"];

// ?Ä?Ä ?ÑÎèÑ/Í≤ΩÎèÑ ???êÎèô Í∞êÏ? ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
const LAT_NAMES = ["?ÑÎèÑ", "lat", "latitude", "y", "yÏ¢åÌëú", "?ÑÏπòy", "ycoord"];
const LNG_NAMES = ["Í≤ΩÎèÑ", "lng", "lon", "longitude", "x", "xÏ¢åÌëú", "?ÑÏπòx", "xcoord"];

function detectLatLng(cols: ColMeta[]): { latCol: string; lngCol: string } | null {
  const numCols = cols.filter((c) => c.type === "numeric");

  // 1?®Í≥Ñ: ?¥Î¶Ñ?ºÎ°ú Í∞êÏ?
  const byName = (names: string[]) =>
    numCols.find((c) => names.some((n) => c.name.toLowerCase().replace(/\s/g, "") === n));
  const latByName = byName(LAT_NAMES);
  const lngByName = byName(LNG_NAMES);
  if (latByName && lngByName && latByName.name !== lngByName.name) {
    return { latCol: latByName.name, lngCol: lngByName.name };
  }

  // 2?®Í≥Ñ: Í∞?Î≤îÏúÑÎ°?Í∞êÏ? (?ÑÏÑ∏Í≥?Ï¢åÌëú Î≤îÏúÑ)
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

  // ?ÑÎèÑ ?ÑÎ≥¥ Ï§?Î≤îÏúÑ ??Ï¢ÅÏ? Í≤?-90~90), Í≤ΩÎèÑ ?ÑÎ≥¥ Ï§????ìÏ? Í≤?-180~180)
  // Í≤πÏπò???¥Ï? Í∞íÏùò ÏµúÎ?Í∞íÏúºÎ°?Íµ¨Î∂Ñ (Í≤ΩÎèÑÍ∞Ä Î≥¥ÌÜµ ????Í∞?
  for (const lat of latCandidates) {
    for (const lng of lngCandidates) {
      if (lat.name === lng.name) continue;
      const latNums = (lat.values as (number | null)[]).filter((v): v is number => v !== null);
      const lngNums = (lng.values as (number | null)[]).filter((v): v is number => v !== null);
      const latMax = Math.max(...latNums.map(Math.abs));
      const lngMax = Math.max(...lngNums.map(Math.abs));
      if (lngMax > latMax) return { latCol: lat.name, lngCol: lng.name };
    }
  }

  return null;
}

// ?Ä?Ä Ï£ºÏÜå ???êÎèô Í∞êÏ? ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
const ADDR_KEYWORDS = ["Ï£ºÏÜå", "addr", "address", "?åÏû¨ÏßÄ", "?ÑÏπò", "?ÑÎ°úÎ™?, "ÏßÄÎ≤?];
const SIDO = ["?úÏö∏", "Î∂Ä??, "?ÄÍµ?, "?∏Ï≤ú", "Í¥ëÏ£º", "?Ä??, "?∏ÏÇ∞", "?∏Ï¢Ö",
              "Í≤ΩÍ∏∞", "Í∞ïÏõê", "Ï∂©Î∂Å", "Ï∂©ÎÇ®", "?ÑÎ∂Å", "?ÑÎÇ®", "Í≤ΩÎ∂Å", "Í≤ΩÎÇ®", "?úÏ£º"];

function detectAddressCol(cols: ColMeta[]): string | null {
  const catCols = cols.filter((c) => c.type === "categorical");
  // 1?®Í≥Ñ: ???¥Î¶Ñ?ºÎ°ú Í∞êÏ?
  const byName = catCols.find((c) =>
    ADDR_KEYWORDS.some((kw) => c.name.toLowerCase().includes(kw))
  );
  if (byName) return byName.name;
  // 2?®Í≥Ñ: Í∞íÏù¥ Í¥ëÏó≠?úÎèÑÎ°??úÏûë?òÎäî ??Í∞êÏ?
  const byVal = catCols.find((c) => {
    const sample = (c.values.filter(Boolean) as string[]).slice(0, 20);
    if (sample.length < 3) return false;
    return sample.filter((v) => SIDO.some((s) => v.startsWith(s))).length / sample.length >= 0.5;
  });
  return byVal?.name ?? null;
}

// ?Ä?Ä Î©îÏù∏ Ïª¥Ìè¨?åÌä∏ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
export default function AnalysisClient() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cols, setCols] = useState<ColMeta[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "table" | "map">("overview");
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"single" | "scatter">("single");
  const [xCol, setXCol] = useState<string | null>(null);
  const [yCol, setYCol] = useState<string | null>(null);
  const [zCol, setZCol] = useState<string | null>(null);
  const [MapView, setMapView] = useState<React.ComponentType<{ points: {lat:number;lng:number;label?:string}[]; latCol?:string; lngCol?:string }> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Excel Î©Ä?∞Ïãú??  const [sheetNames, setSheetNames]   = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [pendingWb, setPendingWb]     = useState<import("xlsx").WorkBook | null>(null);
  // Ï∞®Ìä∏ SVG export??ref
  const chartRef = useRef<HTMLDivElement>(null);
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");
  // Ï£ºÏÜå Í∏∞Î∞ò ÏßÄ?§ÏΩî???ÅÌÉú
  const [addressCol,   setAddressCol]   = useState<string | null>(null);
  const [geocoding,    setGeocoding]    = useState(false);
  const [geocodedPts,  setGeocodedPts]  = useState<{ lat: number; lng: number; label?: string }[]>([]);
  const [geocodeCount, setGeocodeCount] = useState(0);
  const [geocodeTotal, setGeocodeTotal] = useState(0);
  // ?ÑÏû¨ ?åÏùº???Ä??ÏßÄ?§ÏΩî?©ÏùÑ ?¥Î? ?úÏûë?àÎäîÏßÄ Ï∂îÏ†Å (???ÑÌôò ???¨Ïãú??Î∞©Ï?)
  const geocodingStartedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ?ÑÎèÑ/Í≤ΩÎèÑ ?êÎèô Í∞êÏ?
  const latLng = useMemo(() => detectLatLng(cols), [cols]);
  // Ï£ºÏÜå ???êÎèô Í∞êÏ?
  const addrDetected = useMemo(() => detectAddressCol(cols), [cols]);

  // ?êÎèô Í∞êÏ? Í≤∞Í≥ºÎ°?Ï¥àÍ∏∞Í∞??§Ï†ï
  useEffect(() => {
    if (latLng) {
      setManualLat(latLng.latCol);
      setManualLng(latLng.lngCol);
    }
  }, [latLng]);

  // Ï£ºÏÜå ??Í∞êÏ? Í≤∞Í≥º Î∞òÏòÅ (geocodedPts Ï¥àÍ∏∞?îÎäî processData/reset?êÏÑúÎß?
  useEffect(() => {
    setAddressCol(addrDetected);
  }, [addrDetected]);

  // ÏßÄ????ÏßÑÏûÖ ??MapView ?ôÏ†Å import
  useEffect(() => {
    if (activeTab === "map" && !MapView) {
      import("./MapView").then((m) => setMapView(() => m.default));
    }
  }, [activeTab, MapView]);

  // ÏßÄ??ÎßàÏª§ ?∞Ïù¥??  const mapPoints = useMemo(() => {
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

  // ?Ä?Ä Ï£ºÏÜå ??Ï¢åÌëú Î≥Ä??(Nominatim, Í≥†Ïú† Ï£ºÏÜå ÏµúÎ? 80Í∞? ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const geocodeAddresses = useCallback(async (col: string) => {
    const colMeta = cols.find((c) => c.name === col);
    if (!colMeta) return;

    const allVals = colMeta.values as (string | null)[];
    // Ï§ëÎ≥µ ?úÍ±∞ ??ÏµúÎ? 80Í∞?(Nominatim: 1 req/sec ?úÌïú)
    const unique  = [...new Set(allVals.filter((v): v is string => !!v))].slice(0, 80);

    setGeocoding(true);
    setGeocodedPts([]);
    setGeocodeCount(0);
    setGeocodeTotal(unique.length);

    const cache = new Map<string, { lat: number; lng: number } | null>();

    for (let i = 0; i < unique.length; i++) {
      const addr = unique[i];
      try {
        // Nominatim ?¥Ïö© ?ΩÍ?: 1Ï¥??¥ÏÉÅ Í∞ÑÍ≤© ?ÑÏàò
        await new Promise((r) => setTimeout(r, 1100));
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr + " ?Ä?úÎ?Íµ?)}&format=json&limit=1&accept-language=ko`,
          { headers: { "User-Agent": "Inje-DataHub/1.0 (contact@inje.ac.kr)" } }
        );
        const data: { lat: string; lon: string }[] = res.ok ? await res.json() : [];
        if (data[0]) {
          cache.set(addr, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
          // ?Ä Ï£ºÏÜå ?§Ìå® ????3?†ÌÅ∞(??Íµ?Íµ??òÏ?)?ºÎ°ú ?¨Ïãú??          const short = addr.split(/\s+/).slice(0, 3).join(" ");
          if (short !== addr) {
            await new Promise((r) => setTimeout(r, 1100));
            const res2 = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(short + " ?Ä?úÎ?Íµ?)}&format=json&limit=1&accept-language=ko`,
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

      // Î≥Ä???ÑÎ£å Ï£ºÏÜåÎ∂Ä??ÏßÄ?ÑÏóê ?§ÏãúÍ∞?Î∞òÏòÅ
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

  // ÏßÄ????ÏßÑÏûÖ ???êÎèô ÏßÄ?§ÏΩî????ref ?åÎûòÍ∑∏Î°ú ???ÑÌôò ???¨Ïãú??Î∞©Ï?
  useEffect(() => {
    if (
      activeTab === "map" &&
      !latLng &&
      addressCol &&
      !geocodingStartedRef.current   // ???åÏùº?êÏÑú ?ÑÏßÅ ??Î≤àÎèÑ ?úÏûë ???àÏùÑ ?åÎßå
    ) {
      geocodingStartedRef.current = true;
      geocodeAddresses(addressCol);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, addressCol]);

  // ?Ä?Ä ?åÏùº ?åÏã± ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const processData = useCallback((data: Record<string, unknown>[], name: string) => {
    if (!data || data.length === 0) { setError("?∞Ïù¥?∞Í? ÎπÑÏñ¥ ?àÏäµ?àÎã§."); return; }
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
    setSelectedCol(colMetas[0]?.name ?? null);
    setActiveTab("overview");
    setError(null);
    // ???åÏùº Î°úÎìú ??ÏßÄ?§ÏΩî??+ ?úÌä∏ ?ÅÌÉú Ï¥àÍ∏∞??    setGeocodedPts([]);
    setGeocodeCount(0);
    setGeocodeTotal(0);
    setGeocoding(false);
    geocodingStartedRef.current = false;
    setSheetNames([]);
    setSelectedSheet(null);
    setPendingWb(null);

    // ?Ä?Ä Î∂ÑÏÑù Î°úÍ∑∏ Í∏∞Î°ù (ÎπÑÎèôÍ∏? ?§Ìå®?¥ÎèÑ UX ?ÅÌñ• ?ÜÏùå) ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
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
      // Í∞ôÏ? ?¨Ïö©?êÍ? ?ôÏùº ?åÏùº???¥Î? Î∂ÑÏÑù??Í≤ΩÏö∞ Ï§ëÎ≥µ Î°úÍ∑∏ ?ùÎûµ
      if (user?.id) {
        const { data: dup } = await supabase
          .from("analysis_logs")
          .select("id")
          .eq("user_id", user.id)
          .eq("file_name", name)
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
        // UTF-8Î°?Íπ®Ï?Î©?EUC-KR(CP949)Î°??¨Ïãú??        if (text.includes("Ôø?)) {
          try { text = new TextDecoder("euc-kr").decode(buffer); } catch { /* UTF-8 ?†Ï? */ }
        }
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (res) => processData(res.data as Record<string, unknown>[], file.name),
          error: () => setError("CSV ?åÏùº???ΩÏùÑ ???ÜÏäµ?àÎã§."),
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "binary" });
          if (wb.SheetNames.length > 1) {
            // ?úÌä∏Í∞Ä ?¨Îü¨ Í∞úÎ©¥ ?¨Ïö©?êÍ? ?†ÌÉù?òÎèÑÎ°??ÄÍ∏?            setSheetNames(wb.SheetNames);
            setSelectedSheet(wb.SheetNames[0]);
            setPendingWb(wb);
            setFileName(file.name); // ?åÏùºÎ™ÖÎßå Î®ºÏ? ?úÏãú
          } else {
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
            processData(data, file.name);
          }
        } catch {
          setError("Excel ?åÏùº???ΩÏùÑ ???ÜÏäµ?àÎã§.");
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setError("CSV ?êÎäî Excel(.xlsx/.xls) ?åÏùºÎß?ÏßÄ?êÌï©?àÎã§.");
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
    setFileName(null); setRows([]); setCols([]); setSelectedCol(null); setError(null);
    setGeocodedPts([]); setGeocodeCount(0); setGeocodeTotal(0); setGeocoding(false);
    geocodingStartedRef.current = false;
    setSheetNames([]); setSelectedSheet(null); setPendingWb(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Excel ?úÌä∏ ?†ÌÉù ??Î∂ÑÏÑù ?úÏûë
  const loadSelectedSheet = useCallback(() => {
    if (!pendingWb || !selectedSheet || !fileName) return;
    const ws = pendingWb.Sheets[selectedSheet];
    const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
    setSheetNames([]);
    setPendingWb(null);
    processData(data, fileName);
  }, [pendingWb, selectedSheet, fileName, processData]);

  // Ï∞®Ìä∏ SVG ??PNG ?§Ïö¥Î°úÎìú
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
      link.download = `chart_${selectedCol ?? "export"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  }, [selectedCol]);

  // ?Ä?Ä ?µÍ≥Ñ Í≥ÑÏÇ∞ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  // isId ???úÏô∏ ???úÍ∞Å?îÏö© ??Î™©Î°ù
  const numericCols = cols.filter((c) => c.type === "numeric");
  const vizCols = cols.filter((c) => !c.isId); // ÎØ∏ÎãàÏ∞®Ìä∏/Ï∞®Ìä∏?êÏÑú ?¨Ïö©
  const catCols = cols.filter((c) => c.type === "categorical");
  const numericVizCols = numericCols.filter((c) => !c.isId);

  // Pearson ?ÅÍ??âÎ†¨ (?òÏπò??Îπ?ID ??2Í∞??¥ÏÉÅ ??
  const corrMatrix = useMemo(() => {
    if (numericVizCols.length < 2) return null;
    return numericVizCols.map((a) => numericVizCols.map((b) => {
      // Í∞ôÏ? ???∏Îç±??Í∏∞Ï??ºÎ°ú ????Î™®Îëê ?†Ìö®??Í∞íÎßå ?¨Ïö©
      const pairs: [number[], number[]] = [[], []];
      (a.values as (number | null)[]).forEach((av, i) => {
        const bv = (b.values as (number | null)[])[i];
        if (av !== null && bv !== null) { pairs[0].push(av); pairs[1].push(bv); }
      });
      return pearsonCorr(pairs[0], pairs[1]);
    }));
  }, [numericVizCols]);

  const selectedMeta = cols.find((c) => c.name === selectedCol);
  const selectedStats = selectedMeta?.type === "numeric"
    ? calcStats(selectedMeta.values as (number | null)[])
    : null;
  const selectedHist = selectedMeta?.type === "numeric"
    ? makeHistogram((selectedMeta.values as (number | null)[]).filter(isNumeric) as number[])
    : null;
  const selectedFreq = selectedMeta?.type === "categorical"
    ? makeFrequency(selectedMeta.values)
    : null;
  // ?†Ïßú???? ?îÎ≥Ñ ÏßëÍ≥Ñ
  const selectedDateFreq = selectedMeta?.type === "date"
    ? makeDateFrequency(selectedMeta.values)
    : null;

  // ?Ä?Ä Excel Î©Ä?∞Ïãú???†ÌÉù ?îÎ©¥ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  if (sheetNames.length > 0 && pendingWb) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 flex flex-col items-center">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-1">?úÌä∏ ?†ÌÉù</h2>
          <p className="text-sm text-neutral-500">
            ??Excel ?åÏùº???úÌä∏Í∞Ä {sheetNames.length}Í∞??àÏäµ?àÎã§. Î∂ÑÏÑù???úÌä∏Î•??†ÌÉù?òÏÑ∏??
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
            Ï∑®ÏÜå
          </button>
          <button
            onClick={loadSelectedSheet}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Î∂ÑÏÑù ?úÏûë
          </button>
        </div>
      </div>
    );
  }

  // ?Ä?Ä ?ÖÎ°ú?????îÎ©¥ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  if (!fileName) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white mb-4">
            <TrendingUp size={30} />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">?êÎèô ?∞Ïù¥??Î∂ÑÏÑù</h1>
          <p className="text-neutral-500 text-sm">CSV ?êÎäî Excel ?åÏùº???ÖÎ°ú?úÌïòÎ©??êÎèô?ºÎ°ú ?µÍ≥Ñ Î∂ÑÏÑùÍ≥??úÍ∞Å?îÎ? ?úÍ≥µ?©Îãà??</p>
        </div>

        {/* Í∞úÏù∏?ïÎ≥¥ ?¨Ìï® ?åÏùº ?ÖÎ°ú??Í∏àÏ? ?àÎÇ¥ */}
        <div className="w-full mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Ï£ºÏùò:</span> Í∞úÏù∏?ïÎ≥¥(?¥Î¶Ñ, Ï£ºÎ?Î≤àÌò∏, ?∞ÎùΩÏ≤???Í∞Ä ?¨Ìï®???åÏùº?Ä ?ÖÎ°ú?úÌïòÏßÄ ÎßàÏÑ∏??
            ?ÖÎ°ú?úÎêú ?åÏùº?Ä Î∂ÑÏÑù Î™©Ï†Å?ºÎ°úÎß?Ï≤òÎ¶¨?òÎ©∞ ?úÎ≤Ñ???Ä?•ÎêòÏßÄ ?äÏäµ?àÎã§.
          </p>
        </div>

        {/* ?úÎûòÍ∑????úÎ°≠ ?ÅÏó≠ */}
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
            <p className="font-semibold text-neutral-700">?åÏùº???úÎûòÍ∑∏ÌïòÍ±∞ÎÇò ?¥Î¶≠?¥ÏÑú ?ÖÎ°ú??/p>
            <p className="text-sm text-neutral-400 mt-1">CSV, XLSX, XLS ÏßÄ??¬∑ ÏµúÎ? 50MB</p>
          </div>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onInputChange} />
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* ÏßÄ???¨Îß∑ ?àÎÇ¥ */}
        <div className="mt-8 grid grid-cols-3 gap-4 w-full text-center text-sm">
          {[
            { label: "CSV", desc: "?ºÌëú Íµ¨Î∂Ñ ?çÏä§?? },
            { label: "XLSX", desc: "Excel 2007+" },
            { label: "XLS", desc: "Excel Íµ¨Î≤Ñ?? },
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

  // ?Ä?Ä Î∂ÑÏÑù Í≤∞Í≥º ?îÎ©¥ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* ?§Îçî */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-brand-600" />
          <div>
            <h1 className="font-bold text-neutral-900 text-lg">{fileName}</h1>
            <p className="text-xs text-neutral-400">{rows.length.toLocaleString()}??¬∑ {cols.length}??/p>
          </div>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-500 transition-colors">
          <X size={15} /> ?åÏùº Ï¥àÍ∏∞??        </button>
      </div>

      {/* ?????ÑÏπò ?∞Ïù¥???ÜÏúºÎ©?ÏßÄ?????®Í? */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl mb-6 w-fit">
        {([
          { id: "overview", label: "Í∞úÏöî",            icon: <TrendingUp size={14} />, show: true },
          { id: "charts",   label: "Ï∞®Ìä∏",             icon: <BarChart2  size={14} />, show: true },
          { id: "table",    label: "?∞Ïù¥??ÎØ∏Î¶¨Î≥¥Í∏∞",  icon: <Table2     size={14} />, show: true },
          { id: "map",      label: "ÏßÄ??,             icon: <MapIcon    size={14} />, show: !!latLng || !!addrDetected, badge: true },
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

      {/* ?Ä?Ä ?? Í∞úÏöî ?Ä?Ä */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ?îÏïΩ Ïπ¥Îìú */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "?ÑÏ≤¥ ??, value: rows.length.toLocaleString() },
              { label: "?ÑÏ≤¥ ??, value: cols.length },
              { label: "?òÏπò ??, value: numericCols.length },
              { label: "Î≤îÏ£º ??, value: catCols.length },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 p-5">
                <p className="text-xs text-neutral-400 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-brand-600">{s.value}</p>
              </div>
            ))}
          </div>

          {/* ?òÏπò ???µÍ≥Ñ ?åÏù¥Î∏?*/}
          {numericCols.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800">?òÏπò????Í∏∞Ï¥à ?µÍ≥Ñ</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 text-xs">
                    <tr>
                      {["???¥Î¶Ñ", "Í∞úÏàò", "?âÍ∑†", "Ï§ëÏïôÍ∞?, "?úÏ??∏Ï∞®", "ÏµúÏÜüÍ∞?, "ÏµúÎåìÍ∞?, "Í≤∞Ï∏°Í∞?].map((h) => (
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

          {/* Î≤îÏ£º ??Í≥†Ïú†Í∞???*/}
          {catCols.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800">Î≤îÏ£º?????îÏïΩ</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 text-xs">
                    <tr>
                      {["???¥Î¶Ñ", "Í≥†Ïú†Í∞???, "ÏµúÎπàÍ∞?, "Í≤∞Ï∏°Í∞?].map((h) => (
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

          {/* ?ÅÍ?Í¥ÄÍ≥??âÎ†¨ (?òÏπò??Îπ?ID ??2Í∞??¥ÏÉÅ ?? */}
          {corrMatrix && numericVizCols.length >= 2 && (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="font-semibold text-neutral-800">?òÏπò?????ÅÍ?Í¥ÄÍ≥?(Pearson)</h2>
                <p className="text-xs text-neutral-400 mt-0.5">??(?åÏùò ?ÅÍ?) ??0(Î¨¥Í?) ??+1(?ëÏùò ?ÅÍ?)</p>
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
                          // ?âÏÉÅ: ?ëÏùò ?ÅÍ? ??Ï≤?°ù, ?åÏùò ?ÅÍ? ??Ï£ºÌô©, ?ÄÍ∞ÅÏÑ† ???åÏÉâ
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

          {/* ?òÏπò?????àÏù¥??ÎπÑÍµê (3Í∞??¥ÏÉÅ???? */}
          {numericVizCols.length >= 3 && (() => {
            const statsMap = new Map(numericVizCols.map(col => {
              const vals = (col.values as (number|null)[]).filter((v): v is number => v !== null);
              if (!vals.length) return [col.name, null];
              const sorted = [...vals].sort((a, b) => a - b);
              const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
              const max = sorted[sorted.length - 1];
              return [col.name, { mean, max, nullRatio: col.values.filter(v => v === null).length / col.values.length }];
            }));
            // Í∞??¥ÏùÑ ÏµúÎåìÍ∞íÏúºÎ°??ïÍ∑ú?îÌïú ?àÏù¥???∞Ïù¥??(?????òÎÇò???¨Ïù∏??
            const radarData = numericVizCols.map(col => {
              const s = statsMap.get(col.name);
              return { col: col.name.length > 8 ? col.name.slice(0, 8) + "?? : col.name, ?âÍ∑†: s ? parseFloat(((s.mean / (s.max || 1)) * 100).toFixed(1)) : 0 };
            });
            return (
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100">
                  <h2 className="font-semibold text-neutral-800">?òÏπò?????àÏù¥??ÎπÑÍµê</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Í∞??¥Ïùò ?âÍ∑†Í∞íÏùÑ ÏµúÎåìÍ∞?Í∏∞Ï??ºÎ°ú ?ïÍ∑ú??(0~100%)</p>
                </div>
                <div className="p-4 flex justify-center">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="col" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                      <Radar name="?âÍ∑†(?ïÍ∑ú??" dataKey="?âÍ∑†" stroke="#0D7377" fill="#0D7377" fillOpacity={0.2} dot={{ r: 4, fill: "#0D7377" }} />
                      <Tooltip formatter={(v) => [`${v}%`, "?ïÍ∑ú???âÍ∑†"]} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* ?êÎèô ?úÍ∞Å?????ÑÏ≤¥ ??ÎØ∏Îãà Ï∞®Ìä∏ (isId ???úÏô∏) */}
          <div>
            <h2 className="font-semibold text-neutral-800 mb-4">?êÎèô ?úÍ∞Å??/h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vizCols.map((col) => {
                const isNum  = col.type === "numeric";
                const isDate = col.type === "date";
                const chartData = isNum
                  ? makeHistogram((col.values as (number | null)[]).filter(isNumeric) as number[], 8)
                  : isDate
                  ? makeDateFrequency(col.values, 12)
                  : makeFrequency(col.values, 8);
                // Î≤îÏ£º??Í≥†Ïπ¥?îÎÑêÎ¶¨Ìã∞ Í∞êÏ? (Í≥†Ïú†Í∞?> 50 ?êÎäî Í≥†Ïú†Í∞??âÏàò > 50%)
                const uniqueCount = !isNum && !isDate
                  ? new Set(col.values.filter(Boolean).map(String)).size
                  : 0;
                const isHighCardinality = !isNum && !isDate && (uniqueCount > 50 || uniqueCount / rows.length > 0.5);

                return (
                  <div key={col.name} className="bg-white rounded-2xl border border-neutral-200 p-4 hover:border-brand-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-neutral-800 truncate">{col.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 flex-shrink-0 ml-2">
                        {isNum ? "?òÏπò" : isDate ? "?†Ïßú" : "Î≤îÏ£º"}
                      </span>
                    </div>
                    {isHighCardinality && (
                      <div className="mb-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                        Í≥†Ïú†Í∞?{uniqueCount}Í∞????ÅÏúÑ 8Í∞úÎßå ?úÏãú
                      </div>
                    )}
                    {isNum ? (
                      // ?òÏπò?? ?àÏä§?†Í∑∏??ÎßâÎ?
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart data={chartData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 8 }} />
                          <Tooltip formatter={(v) => [`${v}`, "ÎπàÎèÑ"]} contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                            {chartData.map((_, i) => <Cell key={i} fill="#0D7377" />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : isDate ? (
                      // ?†Ïßú?? ?îÎ≥Ñ ÏßëÍ≥Ñ ??Ï∞®Ìä∏
                      <ResponsiveContainer width="100%" height={110}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 7 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 8 }} />
                          <Tooltip formatter={(v) => [`${v}Í±?, "Í±¥Ïàò"]} contentStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="count" stroke="#0D7377" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      // Î≤îÏ£º?? Í∞ÄÎ°?ÎßâÎ?
                      <ResponsiveContainer width="100%" height={Math.max(110, chartData.length * 22)}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                          <XAxis type="number" tick={{ fontSize: 8 }} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 8 }} width={90}
                            tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "?? : v} />
                          <Tooltip content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload as { label: string; count: number };
                            return (
                              <div className="bg-white border border-neutral-200 rounded-lg p-2 text-xs shadow-md max-w-[180px]">
                                <p className="font-semibold text-neutral-800 mb-0.5 break-words">{d.label}</p>
                                <p className="text-brand-600">{d.count.toLocaleString()}Í±?/p>
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

      {/* ?Ä?Ä ?? Ï∞®Ìä∏ ?Ä?Ä */}
      {activeTab === "charts" && (
        <div className="space-y-5">

          {/* Î™®Îìú ?†ÌÉù */}
          <div className="flex gap-2">
            {(["single", "scatter"] as const).filter((m) => m === "single" || numericCols.length >= 2).map((m) => (
              <button key={m} onClick={() => setChartMode(m)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2
                  ${chartMode === m ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-500 hover:border-brand-300"}`}>
                {m === "single" ? "?®Ïùº ??Î∂ÑÏÑù" : "?∞Ï†ê??(X vs Y)"}
              </button>
            ))}
          </div>

          {/* ?Ä?Ä ?®Ïùº ??Î™®Îìú ?Ä?Ä */}
          {chartMode === "single" && (
            <>
              {/* ???†ÌÉù */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5">Î∂ÑÏÑù????/p>
                <div className="flex flex-wrap gap-2">
                  {cols.map((col) => (
                    <button key={col.name} onClick={() => setSelectedCol(col.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${selectedCol === col.name ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                      {col.name}
                      <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded ${selectedCol === col.name ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-400"}`}>
                        {col.type === "numeric" ? "?òÏπò" : col.type === "date" ? "?†Ïßú" : "Î≤îÏ£º"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ï∞®Ìä∏ + ?µÍ≥Ñ ???†ÌÉù???¥Ïóê ?¥Îãπ?òÎäî Î™®Îì† Ï∞®Ìä∏ ?ôÏãú ?úÏãú */}
              {selectedMeta && (
                <div className="space-y-5" ref={chartRef}>

                  {/* ?òÏπò???µÍ≥Ñ ?îÏïΩ */}
                  {selectedStats && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-neutral-800">{selectedMeta.name} ??Í∏∞Ï¥à ?µÍ≥Ñ</h2>
                        <button onClick={downloadChart}
                          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-brand-600 transition-colors border border-neutral-200 hover:border-brand-300 rounded-lg px-3 py-1.5"
                          title="Ï∞®Ìä∏ PNG ?Ä??>
                          <Download size={12} /> PNG ?Ä??                        </button>
                      </div>
                      <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                        {[
                          { label: "?âÍ∑†",    val: selectedStats.mean,         warn: false },
                          { label: "Ï§ëÏïôÍ∞?,  val: selectedStats.median,       warn: false },
                          { label: "?úÏ??∏Ï∞®",val: selectedStats.std,          warn: false },
                          { label: "ÏµúÏÜüÍ∞?,  val: selectedStats.min,          warn: false },
                          { label: "ÏµúÎåìÍ∞?,  val: selectedStats.max,          warn: false },
                          { label: "Í≤∞Ï∏°Í∞?,  val: selectedStats.nullCount,    warn: selectedStats.nullCount > 0 },
                          { label: "?¥ÏÉÅÍ∞?,  val: selectedStats.outlierCount, warn: selectedStats.outlierCount > 0 },
                        ].map(({ label, val, warn }) => (
                          <div key={label} className={`rounded-xl p-3 text-center ${warn && val > 0 ? "bg-amber-50" : "bg-neutral-50"}`}>
                            <p className="text-[10px] text-neutral-400 mb-1">{label}</p>
                            <p className={`font-bold text-sm ${warn && val > 0 ? "text-amber-600" : "text-brand-600"}`}>{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ?òÏπò?? ?àÏä§?†Í∑∏??(ÎßâÎ?) */}
                  {selectedHist && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <p className="text-sm font-semibold text-neutral-700 mb-4">ÎßâÎ? (?àÏä§?†Í∑∏??</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={selectedHist} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}Í±?, "ÎπàÎèÑ"]} />
                          <Bar dataKey="count" fill="#0D7377" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ?òÏπò?? ??Ï∞®Ìä∏ */}
                  {selectedHist && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <p className="text-sm font-semibold text-neutral-700 mb-4">??Ï∞®Ìä∏</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={selectedHist} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}Í±?, "ÎπàÎèÑ"]} />
                          <Line type="monotone" dataKey="count" stroke="#2D5F8F" strokeWidth={2} dot={{ r: 3, fill: "#2D5F8F" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ?òÏπò?? ?ÅÏó≠ Ï∞®Ìä∏ */}
                  {selectedHist && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <p className="text-sm font-semibold text-neutral-700 mb-4">?ÅÏó≠ Ï∞®Ìä∏</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={selectedHist} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4FAFAF" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#4FAFAF" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}Í±?, "ÎπàÎèÑ"]} />
                          <Area type="monotone" dataKey="count" stroke="#4FAFAF" fill="url(#areaGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ?òÏπò?? Î∞ïÏä§?åÎ°Ø */}
                  {selectedMeta.type === "numeric" && selectedStats && (() => {
                    const { min, max, mean } = selectedStats;
                    const vals = (selectedMeta.values as (number|null)[]).filter((v): v is number => v !== null);
                    const sorted = [...vals].sort((a, b) => a - b);
                    const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? min;
                    const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? max;
                    const median = sorted[Math.floor(sorted.length * 0.5)] ?? mean;
                    const range = max - min || 1;
                    const toX = (v: number) => ((v - min) / range) * 560 + 40;
                    const outliers = vals.filter(v => v < q1 - 1.5 * (q3 - q1) || v > q3 + 1.5 * (q3 - q1));
                    return (
                      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                        <p className="text-sm font-semibold text-neutral-700 mb-4">Î∞ïÏä§?åÎ°Ø</p>
                        <div className="overflow-x-auto py-4">
                          <svg width={640} height={140} className="mx-auto">
                            <line x1={toX(min)} y1={70} x2={toX(q1)} y2={70} stroke="#94a3b8" strokeWidth={2} />
                            <line x1={toX(q3)} y1={70} x2={toX(max)} y2={70} stroke="#94a3b8" strokeWidth={2} />
                            <line x1={toX(min)} y1={55} x2={toX(min)} y2={85} stroke="#94a3b8" strokeWidth={2} />
                            <line x1={toX(max)} y1={55} x2={toX(max)} y2={85} stroke="#94a3b8" strokeWidth={2} />
                            <rect x={toX(q1)} y={45} width={toX(q3) - toX(q1)} height={50} fill="#0D737720" stroke="#0D7377" strokeWidth={2} rx={4} />
                            <line x1={toX(median)} y1={45} x2={toX(median)} y2={95} stroke="#0D7377" strokeWidth={3} />
                            <polygon points={`${toX(mean)},40 ${toX(mean)-6},52 ${toX(mean)+6},52`} fill="#f97316" opacity={0.8} />
                            {outliers.slice(0, 60).map((v, i) => (
                              <circle key={i} cx={toX(v)} cy={70} r={4} fill="#ef444480" />
                            ))}
                            <text x={toX(min)} y={115} textAnchor="middle" fontSize={10} fill="#64748b">{Number(min).toLocaleString()}</text>
                            <text x={toX(q1)} y={115} textAnchor="middle" fontSize={10} fill="#64748b">Q1</text>
                            <text x={toX(median)} y={115} textAnchor="middle" fontSize={10} fill="#0D7377" fontWeight={600}>Ï§ëÏïôÍ∞?/text>
                            <text x={toX(q3)} y={115} textAnchor="middle" fontSize={10} fill="#64748b">Q3</text>
                            <text x={toX(max)} y={115} textAnchor="middle" fontSize={10} fill="#64748b">{Number(max).toLocaleString()}</text>
                            <text x={toX(mean)} y={35} textAnchor="middle" fontSize={10} fill="#f97316">?âÍ∑†</text>
                          </svg>
                          <div className="flex justify-center gap-6 mt-2 text-xs text-neutral-500">
                            <span><span className="inline-block w-3 h-3 rounded bg-[#0D737720] border border-[#0D7377] mr-1" />IQR (Q1?ìQ3)</span>
                            <span><span className="inline-block w-3 h-0.5 bg-[#0D7377] mr-1 align-middle" />Ï§ëÏïôÍ∞?/span>
                            <span><span className="inline-block w-2 h-2 bg-orange-400 mr-1 rotate-45 align-middle" />?âÍ∑†</span>
                            <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1 align-middle" />?¥ÏÉÅÍ∞?/span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ?òÏπò?? ?ÑÏ†Å Î∂ÑÌè¨ */}
                  {selectedMeta.type === "numeric" && selectedHist && (() => {
                    let cum = 0;
                    const total = selectedHist.reduce((s, d) => s + d.count, 0);
                    const cumData = selectedHist.map(d => { cum += d.count; return { label: d.label, pct: parseFloat(((cum / total) * 100).toFixed(1)) }; });
                    return (
                      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                        <p className="text-sm font-semibold text-neutral-700 mb-4">?ÑÏ†Å Î∂ÑÌè¨ (CDF)</p>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={cumData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                            <Tooltip formatter={(v) => [`${v}%`, "?ÑÏ†Å ÎπÑÏú®"]} />
                            <Area type="monotone" dataKey="pct" stroke="#6366f1" fill="url(#cumGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* Î≤îÏ£º?? ÎßâÎ? Ï∞®Ìä∏ */}
                  {selectedFreq && selectedFreq.length > 0 && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <p className="text-sm font-semibold text-neutral-700 mb-4">ÎßâÎ? Ï∞®Ìä∏ (ÎπàÎèÑ ?ÅÏúÑ 15Í∞?</p>
                      <ResponsiveContainer width="100%" height={Math.max(300, selectedFreq.length * 38)}>
                        <BarChart data={selectedFreq} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={160}
                            tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "?? : v} />
                          <Tooltip content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload as { label: string; count: number };
                            return (
                              <div className="bg-white border border-neutral-200 rounded-xl p-3 text-xs shadow-md max-w-[220px]">
                                <p className="font-semibold text-neutral-800 mb-1 break-words">{d.label}</p>
                                <p className="text-brand-600">{d.count.toLocaleString()}Í±?/p>
                              </div>
                            );
                          }} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                            {selectedFreq.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Î≤îÏ£º?? ?åÏù¥ Ï∞®Ìä∏ */}
                  {selectedFreq && selectedFreq.length > 0 && (() => {
                    const pieData = selectedFreq.slice(0, 12);
                    const showLabel = pieData.length <= 6;
                    const total = pieData.reduce((s, r) => s + r.count, 0);
                    return (
                      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                        <p className="text-sm font-semibold text-neutral-700 mb-1">?åÏù¥ Ï∞®Ìä∏</p>
                        {pieData.length < selectedFreq.length && (
                          <p className="text-xs text-neutral-400 mb-3">?ÅÏúÑ {pieData.length}Í∞???™© ?úÏãú (?ÑÏ≤¥ {selectedFreq.length}Í∞?</p>
                        )}
                        <ResponsiveContainer width="100%" height={showLabel ? 360 : 300}>
                          <PieChart>
                            <Pie data={pieData} dataKey="count" nameKey="label" cx="50%" cy="50%"
                              outerRadius={showLabel ? 110 : 100}
                              label={showLabel ? (({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`) : undefined}
                              labelLine={showLabel}>
                              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={({ payload }) => {
                              if (!payload?.length) return null;
                              const d = payload[0]?.payload as { label: string; count: number };
                              return (
                                <div className="bg-white border border-neutral-200 rounded-xl p-3 text-xs shadow-md max-w-[220px]">
                                  <p className="font-semibold text-neutral-800 mb-1 break-words">{d.label}</p>
                                  <p className="text-brand-600">{d.count.toLocaleString()}Í±?/p>
                                  <p className="text-neutral-400">{((d.count / total) * 100).toFixed(1)}%</p>
                                </div>
                              );
                            }} />
                            <Legend formatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "?? : v} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* Î≤îÏ£º?? ?∏Î¶¨Îß?*/}
                  {selectedFreq && selectedFreq.length > 0 && (() => {
                    const tmData = selectedFreq.slice(0, 20).map((d, i) => ({ name: d.label, size: d.count, fill: COLORS[i % COLORS.length] }));
                    return (
                      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                        <p className="text-sm font-semibold text-neutral-700 mb-4">?∏Î¶¨Îß?/p>
                        <ResponsiveContainer width="100%" height={360}>
                          <Treemap data={tmData} dataKey="size" nameKey="name"
                            content={({ x, y, width, height, name, fill }: { x?: number; y?: number; width?: number; height?: number; name?: string; fill?: string }) => {
                              const w = width ?? 0; const h = height ?? 0;
                              if (w < 30 || h < 20) return <rect x={x} y={y} width={w} height={h} fill={fill} rx={2} />;
                              return (
                                <g>
                                  <rect x={x} y={y} width={w} height={h} fill={fill} rx={4} stroke="white" strokeWidth={2} />
                                  {w > 50 && h > 28 && (
                                    <text x={(x ?? 0) + w / 2} y={(y ?? 0) + h / 2} textAnchor="middle" dominantBaseline="middle"
                                      fontSize={Math.min(13, w / 7)} fill="white" fontWeight={600}>
                                      {(name ?? "").length > 10 ? (name ?? "").slice(0, 10) + "?? : name}
                                    </text>
                                  )}
                                </g>
                              );
                            }}
                          />
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* ?†Ïßú?? ?îÎ≥Ñ ÎßâÎ? */}
                  {selectedDateFreq && selectedDateFreq.length > 0 && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <p className="text-sm font-semibold text-neutral-700 mb-4">?îÎ≥Ñ ÎßâÎ? Ï∞®Ìä∏</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={selectedDateFreq} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}Í±?, "Í±¥Ïàò"]} />
                          <Bar dataKey="count" fill="#0D7377" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ?†Ïßú?? ?îÎ≥Ñ ??Ï∞®Ìä∏ */}
                  {selectedDateFreq && selectedDateFreq.length > 0 && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <p className="text-sm font-semibold text-neutral-700 mb-4">?îÎ≥Ñ ??Ï∞®Ìä∏</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={selectedDateFreq} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}Í±?, "Í±¥Ïàò"]} />
                          <Line type="monotone" dataKey="count" stroke="#2D5F8F" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ?†Ïßú?? ?îÎ≥Ñ ?ÅÏó≠ Ï∞®Ìä∏ */}
                  {selectedDateFreq && selectedDateFreq.length > 0 && (
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                      <p className="text-sm font-semibold text-neutral-700 mb-4">?îÎ≥Ñ ?ÅÏó≠ Ï∞®Ìä∏</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={selectedDateFreq} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                          <defs>
                            <linearGradient id="dateAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4FAFAF" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#4FAFAF" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}Í±?, "Í±¥Ïàò"]} />
                          <Area type="monotone" dataKey="count" stroke="#4FAFAF" fill="url(#dateAreaGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ?†Ïßú?? ?∞Ïù¥???ÜÏùå */}
                  {selectedMeta.type === "date" && selectedDateFreq?.length === 0 && (
                    <div className="bg-white rounded-2xl border border-neutral-200 py-12 text-center text-sm text-neutral-400">
                      ?†ÏßúÎ°??∏Ïãù??Í∞íÏù¥ ?ÜÏäµ?àÎã§.
                    </div>
                  )}

                </div>
              )}
            </>
          )}

          {/* ?Ä?Ä ?∞Ï†ê??Î™®Îìú ?Ä?Ä */}
          {chartMode === "scatter" && (
            <div className="space-y-5">
              {/* Ï∂??†ÌÉù */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Ï∂??†ÌÉù (?òÏπò???¥Îßå)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">XÏ∂?/p>
                    <div className="flex flex-wrap gap-2">
                      {numericCols.map((col) => (
                        <button key={col.name} onClick={() => setXCol(col.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                            ${xCol === col.name ? "bg-brand-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                          {col.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">YÏ∂?/p>
                    <div className="flex flex-wrap gap-2">
                      {numericCols.map((col) => (
                        <button key={col.name} onClick={() => setYCol(col.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                            ${yCol === col.name ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                          {col.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">Î≤ÑÎ∏î ?¨Í∏∞ <span className="text-neutral-400 font-normal">(?†ÌÉù)</span></p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setZCol(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${zCol === null ? "bg-neutral-700 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                        ?ÜÏùå
                      </button>
                      {numericCols.map((col) => (
                        <button key={col.name} onClick={() => setZCol(col.name)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                            ${zCol === col.name ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                          {col.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ?∞Ï†ê??+ ?åÍ???/ Î≤ÑÎ∏î Ï∞®Ìä∏ */}
              {xCol && yCol && xCol !== yCol && (() => {
                const xMeta = cols.find((c) => c.name === xCol)!;
                const yMeta = cols.find((c) => c.name === yCol)!;
                const zMeta = zCol ? cols.find((c) => c.name === zCol) ?? null : null;

                const scatterData = rows.map((_, i) => ({
                  x: xMeta.values[i] as number | null,
                  y: yMeta.values[i] as number | null,
                  z: zMeta ? (zMeta.values[i] as number | null) ?? 1 : 1,
                })).filter((p) => p.x !== null && p.y !== null) as { x: number; y: number; z: number }[];

                // ?åÍ???Í≥ÑÏÇ∞
                const n = scatterData.length;
                const sx  = scatterData.reduce((s, p) => s + p.x, 0);
                const sy  = scatterData.reduce((s, p) => s + p.y, 0);
                const sxy = scatterData.reduce((s, p) => s + p.x * p.y, 0);
                const sx2 = scatterData.reduce((s, p) => s + p.x * p.x, 0);
                const sy2 = scatterData.reduce((s, p) => s + p.y * p.y, 0);
                const xDenom = n * sx2 - sx * sx;
                const slope = xDenom !== 0 ? (n * sxy - sx * sy) / xDenom : 0;
                const intercept = (sy - slope * sx) / n;
                const rDenom = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
                const r = rDenom !== 0 ? (n * sxy - sx * sy) / rDenom : 0;
                const r2 = r * r;
                const corrLabel = Math.abs(r) < 0.1 ? "Í±∞Ïùò ?ÜÏùå"
                  : `${r > 0 ? "?ëÏùò" : "?åÏùò"} ${Math.abs(r) >= 0.7 ? "Í∞ïÌïú" : Math.abs(r) >= 0.4 ? "Ï§ëÍ∞Ñ" : "?ΩÌïú"} ?ÅÍ?Í¥ÄÍ≥?;

                const xMin = Math.min(...scatterData.map((p) => p.x));
                const xMax = Math.max(...scatterData.map((p) => p.x));
                const trendData = [
                  { x: xMin, trend: slope * xMin + intercept },
                  { x: xMax, trend: slope * xMax + intercept },
                ];

                const zVals = zMeta ? scatterData.map((p) => p.z) : [];
                const zRange: [number, number] = zMeta && Math.max(...zVals) > Math.min(...zVals)
                  ? [20, 500] : [60, 60];

                return (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="font-semibold text-neutral-800 mb-1">
                          {zMeta ? "Î≤ÑÎ∏î Ï∞®Ìä∏" : "?∞Ï†ê??+ ?åÍ???}
                        </h2>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                            <span className="inline-block w-3 h-3 rounded-sm bg-brand-600" /> X ??<strong>{xCol}</strong>
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" /> Y ??<strong>{yCol}</strong>
                          </span>
                          {zMeta && (
                            <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                              <span className="inline-block w-3 h-3 rounded-full bg-purple-500" /> ?¨Í∏∞ ??<strong>{zCol}</strong>
                            </span>
                          )}
                          <span className="text-xs text-neutral-400 ml-auto">{scatterData.length.toLocaleString()}Í∞?/span>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={420}>
                      <ComposedChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="x" type="number" tick={{ fontSize: 11 }}
                          label={{ value: xCol, position: "insideBottom", offset: -15, fontSize: 12, fill: "#0D7377", fontWeight: 600 }} />
                        <YAxis type="number" tick={{ fontSize: 11 }}
                          label={{ value: yCol, angle: -90, position: "insideLeft", offset: 15, fontSize: 12, fill: "#10b981", fontWeight: 600 }} />
                        <ZAxis dataKey="z" range={zRange} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
                          if (!payload?.length) return null;
                          const p = payload[0]?.payload as { x: number; y: number; z?: number };
                          return (
                            <div className="bg-white border border-neutral-200 rounded-xl p-3 text-xs shadow-md">
                              <p className="mb-1"><span className="font-semibold text-brand-600">{xCol}</span>: {p.x}</p>
                              <p className="mb-1"><span className="font-semibold text-emerald-600">{yCol}</span>: {p.y}</p>
                              {zMeta && p.z !== undefined && (
                                <p><span className="font-semibold text-purple-600">{zCol}</span>: {p.z}</p>
                              )}
                            </div>
                          );
                        }} />
                        <Scatter data={scatterData} fill="#0D7377" fillOpacity={0.55} />
                        {!zMeta && (
                          <Line dataKey="trend" stroke="#f59e0b" strokeWidth={2}
                            dot={false} type="linear" isAnimationActive={false} strokeDasharray="6 3" />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                    {/* ?ÅÍ? ?µÍ≥Ñ */}
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="bg-neutral-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-neutral-400 mb-1">?ºÏñ¥???ÅÍ?Í≥ÑÏàò (r)</p>
                        <p className={`text-lg font-bold ${Math.abs(r) >= 0.7 ? "text-brand-600" : Math.abs(r) >= 0.4 ? "text-amber-500" : "text-neutral-500"}`}>
                          {r.toFixed(3)}
                        </p>
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-neutral-400 mb-1">Í≤∞Ï†ïÍ≥ÑÏàò (R¬≤)</p>
                        <p className="text-lg font-bold text-neutral-700">{r2.toFixed(3)}</p>
                      </div>
                      <div className="bg-neutral-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-neutral-400 mb-1">?¥ÏÑù</p>
                        <p className="text-sm font-semibold text-neutral-700">{corrLabel}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {xCol && yCol && xCol === yCol && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
                  XÏ∂ïÍ≥º YÏ∂ïÏóê ?úÎ°ú ?§Î•∏ ?¥ÏùÑ ?†ÌÉù?¥Ï£º?∏Ïöî.
                </div>
              )}
              {(!xCol || !yCol) && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center text-sm text-neutral-400">
                  XÏ∂ïÍ≥º YÏ∂??¥ÏùÑ Î™®Îëê ?†ÌÉù?òÎ©¥ ?∞Ï†ê?ÑÍ? ?úÏãú?©Îãà??
                </div>
              )}

              {/* ?ÅÍ?Í¥ÄÍ≥??àÌä∏Îß????òÏπò????2Í∞??¥ÏÉÅ?¥Î©¥ ??ÉÅ ?úÏãú */}
              {numericCols.length >= 2 && (() => {
                const nc = numericCols;
                const cellSize = Math.min(64, Math.floor(480 / nc.length));
                const getCorr = (i: number, j: number) => {
                  const paired = rows.map((_, idx) => ({
                    x: nc[i].values[idx], y: nc[j].values[idx],
                  })).filter((p) => isNumeric(p.x) && isNumeric(p.y)) as { x: number; y: number }[];
                  const pn = paired.length;
                  if (pn < 2) return i === j ? 1 : 0;
                  const sx = paired.reduce((s, p) => s + p.x, 0);
                  const sy = paired.reduce((s, p) => s + p.y, 0);
                  const sxy = paired.reduce((s, p) => s + p.x * p.y, 0);
                  const sx2 = paired.reduce((s, p) => s + p.x * p.x, 0);
                  const sy2 = paired.reduce((s, p) => s + p.y * p.y, 0);
                  const d = Math.sqrt((pn * sx2 - sx * sx) * (pn * sy2 - sy * sy));
                  return d !== 0 ? (pn * sxy - sx * sy) / d : (i === j ? 1 : 0);
                };
                const getColor = (r: number) => {
                  const a = Math.abs(r);
                  return r >= 0
                    ? `rgba(13,115,119,${0.08 + a * 0.92})`
                    : `rgba(239,68,68,${0.08 + a * 0.92})`;
                };
                return (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                    <h2 className="font-semibold text-neutral-800 mb-1">?ÅÍ?Í¥ÄÍ≥??àÌä∏Îß?/h2>
                    <p className="text-xs text-neutral-400 mb-5">?òÏπò????Í∞ÑÏùò ?ºÏñ¥???ÅÍ?Í≥ÑÏàò (?? ~ +1)</p>
                    <div className="overflow-x-auto">
                      <table className="border-collapse mx-auto">
                        <thead>
                          <tr>
                            <td style={{ width: cellSize, minWidth: cellSize }} />
                            {nc.map((col) => (
                              <td key={col.name} style={{ width: cellSize, minWidth: cellSize, height: cellSize }} className="text-center pb-1">
                                <span className="text-xs text-neutral-500 font-medium block truncate px-1"
                                  style={{ maxWidth: cellSize, writingMode: nc.length > 5 ? "vertical-rl" : "horizontal-tb" }}>
                                  {col.name}
                                </span>
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {nc.map((rowCol, i) => (
                            <tr key={rowCol.name}>
                              <td className="pr-2 text-right" style={{ maxWidth: cellSize }}>
                                <span className="text-xs text-neutral-500 font-medium block truncate">{rowCol.name}</span>
                              </td>
                              {nc.map((_, j) => {
                                const rv = getCorr(i, j);
                                return (
                                  <td key={j} title={`${nc[i].name} √ó ${nc[j].name}: ${rv.toFixed(3)}`}
                                    style={{ width: cellSize, height: cellSize, backgroundColor: getColor(rv), border: "2px solid white" }}>
                                    <div className="flex items-center justify-center w-full h-full">
                                      <span style={{ fontSize: cellSize < 50 ? 9 : 11, fontWeight: 700, color: Math.abs(rv) > 0.5 ? "white" : "#374151" }}>
                                        {rv.toFixed(2)}
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
                    <div className="flex items-center justify-center gap-8 mt-5">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <div className="w-16 h-3 rounded" style={{ background: "linear-gradient(to right, rgba(13,115,119,0.08), rgba(13,115,119,1))" }} />
                        ?ëÏùò ?ÅÍ? (+1)
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <div className="w-16 h-3 rounded" style={{ background: "linear-gradient(to right, rgba(239,68,68,0.08), rgba(239,68,68,1))" }} />
                        ?åÏùò ?ÅÍ? (??)
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ?Ä?Ä ?? ÏßÄ???Ä?Ä */}
      {activeTab === "map" && (
        <div className="space-y-4">
          {/* ?Ä?Ä Ï£ºÏÜå Í∏∞Î∞ò ÏßÄ?§ÏΩî??Î™®Îìú (?ÑÎèÑ/Í≤ΩÎèÑ ???ÜÏùÑ ?? ?Ä?Ä */}
          {!latLng && addressCol && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-700">
                    Ï£ºÏÜå ??Í∞êÏ??? <span className="text-brand-600">{addressCol}</span>
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Ï£ºÏÜåÎ•?Ï¢åÌëúÎ°??êÎèô Î≥Ä?òÌï©?àÎã§ (Í≥†Ïú† Ï£ºÏÜå ÏµúÎ? 80Í∞?¬∑ Ï£ºÏÜå????1Ï¥??åÏöî)
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
                    ?§Ïãú Î≥Ä??                  </button>
                )}
              </div>

              {/* ÏßÑÌñâ Î∞?*/}
              {geocoding && (
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
                    <span>Ï¢åÌëú Î≥Ä??Ï§?..</span>
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
                      ÏßÄÍ∏àÍπåÏßÄ {geocodedPts.length}Í∞?ÏßÄ??ÏßÄ?ÑÏóê ?úÏãú Ï§?..
                    </p>
                  )}
                </div>
              )}

              {/* ?ÑÎ£å Í≤∞Í≥º ?îÏïΩ */}
              {!geocoding && geocodedPts.length > 0 && (
                <p className="text-xs text-emerald-600 font-medium">
                  ??{geocodedPts.length}Í∞?ÏßÄ??Î≥Ä???ÑÎ£å
                  {geocodeTotal - geocodedPts.length > 0 && (
                    <span className="text-neutral-400 font-normal ml-1">
                      ({geocodeTotal - geocodedPts.length}Í∞?Ï£ºÏÜå Î≥Ä???§Ìå®)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Ï£ºÏÜå ÏßÄ?§ÏΩî??ÏßÄ??*/}
          {!latLng && geocodedPts.length > 0 && MapView && (
            <MapView points={geocodedPts} />
          )}

          {/* ?Ä?Ä ?ÑÎèÑ/Í≤ΩÎèÑ ???ÜÍ≥† Ï£ºÏÜå ?¥ÎèÑ ?ÜÏùÑ ?? ?òÎèô?ºÎ°ú ???†ÌÉù ?Ä?Ä */}
          {!latLng && !addrDetected && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <p className="text-sm font-semibold text-neutral-700 mb-3">Ï¢åÌëú ?¥ÏùÑ ÏßÅÏ†ë ?†ÌÉù?¥Ï£º?∏Ïöî</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-2">?ÑÎèÑ ??(?∏Î°ú Î∞©Ìñ•)</p>
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
                  <p className="text-xs text-neutral-500 mb-2">Í≤ΩÎèÑ ??(Í∞ÄÎ°?Î∞©Ìñ•)</p>
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
                <p className="text-xs text-amber-600 mt-3">?ÑÎèÑ?Ä Í≤ΩÎèÑ???úÎ°ú ?§Î•∏ ?¥ÏùÑ ?†ÌÉù?¥Ï£º?∏Ïöî.</p>
              )}
            </div>
          )}

          {/* ÏßÄ???åÎçîÎß?*/}
          {manualLat && manualLng && manualLat !== manualLng && mapPoints.length > 0 && MapView && (
            <MapView points={mapPoints} latCol={manualLat} lngCol={manualLng} />
          )}
          {manualLat && manualLng && manualLat !== manualLng && mapPoints.length === 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center text-sm text-neutral-400">
              ?†Ìö®??Ï¢åÌëú ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§.
            </div>
          )}
          {(!manualLat || !manualLng) && !latLng && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center text-sm text-neutral-400">
              ?ÑÎèÑ¬∑Í≤ΩÎèÑ ?¥ÏùÑ Î™®Îëê ?†ÌÉù?òÎ©¥ ÏßÄ?ÑÍ? ?úÏãú?©Îãà??
            </div>
          )}
        </div>
      )}

      {/* ?Ä?Ä ?? ?∞Ïù¥??ÎØ∏Î¶¨Î≥¥Í∏∞ ?Ä?Ä */}
      {activeTab === "table" && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">?∞Ïù¥??ÎØ∏Î¶¨Î≥¥Í∏∞ (?ÅÏúÑ 100??</h2>
            <span className="text-xs text-neutral-400">?ÑÏ≤¥ {rows.length.toLocaleString()}??Ï§?{Math.min(100, rows.length)}???úÏãú</span>
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
                        {col.type === "numeric" ? "?òÏπò" : col.type === "date" ? "?†Ïßú" : "Î≤îÏ£º"}
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
