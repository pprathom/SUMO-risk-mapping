/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import {
  Upload,
  AlertTriangle,
  FileText,
  Map as MapIcon,
  Info,
  ChevronRight,
  Filter,
  Download,
  AlertOctagon,
  Clock,
  X,
  Activity,
  Navigation,
  Navigation2
} from 'lucide-react';
import { XMLParser } from 'fast-xml-parser';
import proj4 from 'proj4';
import { motion, AnimatePresence } from 'motion/react';
import * as pako from 'pako';
import AccidentLayer from './components/AccidentLayer';
import type { Accident } from './components/AccidentLayer';
import HeatLayer from './components/HeatLayer';
import HelpModal from './components/HelpModal';
import { PROVINCES, findNearestProvince } from './data/provinces';

interface SumoLocation {
  netOffset: [number, number];
  convBoundary: [number, number, number, number];
  origBoundary: [number, number, number, number];
  projParameter: string;
}

interface ConflictMetric {
  time: number;
  position: [number, number];
  geoPosition?: [number, number];
  type: string;
  value: number;
  speed: number;
}

interface Conflict {
  id: string;
  begin: number;
  end: number;
  ego: string;
  foe: string;
  minTTC?: ConflictMetric;
  maxDRAC?: ConflictMetric;
  PET?: ConflictMetric;
  riskScore: number;
}

const RISK_THRESHOLDS = {
  TTC: 1.5,
  DRAC: 3.5,
};

const CONFLICT_DESCRIPTIONS: Record<string, { label: string, desc: string }> = {
  "2": { label: "FOLLOWING_FOLLOWER", desc: "ยานพาหนะหลัก (ego) กำลังขับตามยานพาหนะคู่กรณี (foe) sumo.dlr" },
  "3": { label: "FOLLOWING_LEADER", desc: "ยานพาหนะคู่กรณี (foe) กำลังขับตามยานพาหนะหลัก (ego)" },
  "6": { label: "MERGING_LEADER", desc: "สถานการณ์รวมเลน (merging) โดยคู่กรณี (foe) ถึงจุดรวมเลนก่อน ego" },
  "7": { label: "MERGING_FOLLOWER", desc: "สถานการณ์รวมเลน (merging) โดย ego ถึงจุดรวมเลนก่อนคู่กรณี (foe)" },
  "10": { label: "CROSSING_LEADER", desc: "สถานการณ์ตัดกันที่ทางแยก โดย ego ถึงจุดตัดก่อนคู่กรณี (foe)" },
  "11": { label: "CROSSING_FOLLOWER", desc: "สถานการณ์ตัดกันที่ทางแยก โดยคู่กรณี (foe) ถึงจุดตัดก่อน ego" }
};

const isValidCoord = (p: any): p is [number, number] => {
  return Array.isArray(p) &&
         p.length === 2 &&
         typeof p[0] === 'number' &&
         typeof p[1] === 'number' &&
         Number.isFinite(p[0]) &&
         Number.isFinite(p[1]) &&
         (Math.abs(p[0]) > 0.000001 || Math.abs(p[1]) > 0.000001);
};

const getRiskColor = (conflict: Conflict) => {
  if (conflict.minTTC && conflict.minTTC.value < 1.0) return '#ef4444';
  if (conflict.minTTC && conflict.minTTC.value < 2.5) return '#f97316';
  if (conflict.maxDRAC && conflict.maxDRAC.value > 3.0) return '#fbbf24';
  return '#22c55e';
};

function MapRecenter({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && typeof bounds.isValid === 'function' && bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch (e) {
        console.warn("fitBounds failed", e);
      }
    }
  }, [bounds, map]);
  return null;
}

function MapEvents({ onMapClick, enabled }: { onMapClick: (lat: number, lon: number) => void, enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick, enabled]);
  return null;
}

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    const container = map.getContainer();
    if (container) resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [map]);
  return null;
}

const CARTO_API_KEY = 'cb1_3106_1_c281e24bf3fb043df74a3b66';

const MAP_STYLES = {
  voyager: {
    name: 'CARTO Voyager',
    url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
  },
  dark: {
    name: 'CARTO Dark',
    url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
  },
  standard: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

function ConflictVisualization({ conflict }: { conflict: Conflict }) {
  const metric = conflict.minTTC;
  if (!metric) return null;

  const type = metric.type;
  const speed = metric.speed * 3.6;
  const ttc = metric.value;

  return (
    <div className="space-y-4">
      <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Activity size={10} className="text-blue-500" /> Relative Dynamics
          </span>
          <span className="text-[9px] font-mono text-slate-500">at t={metric.time}s</span>
        </div>

        <div className="space-y-3">
          <div className="relative h-6 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (speed / 120) * 100)}%` }}
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center px-2"
            >
              <span className="text-[8px] font-black text-white whitespace-nowrap">VEHICLE SPEED: {speed.toFixed(1)} km/hr</span>
            </motion.div>
          </div>

          <div className="flex justify-between items-end px-1">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase font-bold">Severity Index</span>
              <span className={`text-[10px] font-black ${ttc < 1.5 ? 'text-red-500' : 'text-orange-500'}`}>
                {ttc < 1.0 ? 'CRITICAL' : ttc < 2.0 ? 'IMMINENT' : 'MONITORED'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-slate-500 uppercase font-bold">Max Braking</span>
              <span className="text-[10px] font-black text-white block">
                {conflict.maxDRAC?.value.toFixed(2) || '0.00'} <span className="text-[8px] font-normal text-slate-500 font-sans">m/s²</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [netFile, setNetFile] = useState<File | null>(null);
  const [ssmFile, setSsmFile] = useState<File | null>(null);
  const [sumoLocation, setSumoLocation] = useState<SumoLocation | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('voyager');
  const [displayLimit, setDisplayLimit] = useState<number>(500);

  const [typeFilters, setTypeFilters] = useState<string[]>(['2', '3', '6', '7', '10', '11']);
  const [riskFilters, setRiskFilters] = useState<string[]>(['high', 'moderate', 'low']);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProvince, setSelectedProvince] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  const [severityId, setSeverityId] = useState(1);
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [showAccidents, setShowAccidents] = useState(false);
  const [loadingAccidents, setLoadingAccidents] = useState(false);
  const [accidentError, setAccidentError] = useState<string | null>(null);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [accidentLimit, setAccidentLimit] = useState(5000);
  const [accidentTotal, setAccidentTotal] = useState(0);
  const [accidentViewMode, setAccidentViewMode] = useState<'points' | 'heat'>('points');
  const [helpOpen, setHelpOpen] = useState(false);

  const getRiskLevel = (conflict: Conflict) => {
    if (conflict.minTTC && conflict.minTTC.value < 1.5) return 'high';
    if (conflict.minTTC && conflict.minTTC.value < 3.0) return 'moderate';
    return 'low';
  };

  const filteredConflicts = useMemo(() => {
    return conflicts
      .filter(c => {
        const typeMatch = typeFilters.includes(c.minTTC?.type || "");
        const riskMatch = riskFilters.includes(getRiskLevel(c));
        return typeMatch && riskMatch;
      })
      .sort((a, b) => {
        const valA = a.minTTC?.value ?? 999;
        const valB = b.minTTC?.value ?? 999;
        return valA - valB;
      });
  }, [conflicts, typeFilters, riskFilters]);

  const mapBounds = useMemo(() => {
    if (filteredConflicts.length === 0) return null;
    const points = filteredConflicts
      .flatMap(c => [c.minTTC?.geoPosition, c.maxDRAC?.geoPosition, c.PET?.geoPosition])
      .filter(isValidCoord);

    if (points.length === 0) return null;
    try {
      const bounds = L.latLngBounds(points);
      return bounds.pad(0.1);
    } catch (e) {
      console.warn("Invalid bounds calculation attempt", e);
      return null;
    }
  }, [filteredConflicts]);

  const filteredProvinces = useMemo(() => {
    if (!provinceSearch.trim()) return PROVINCES;
    const q = provinceSearch.toLowerCase();
    return PROVINCES.filter(
      p => p.nameTH.includes(provinceSearch) || p.nameEN.toLowerCase().includes(q)
    );
  }, [provinceSearch]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'net' | 'ssm') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'net') setNetFile(file);
    else setSsmFile(file);
  };

  const processFiles = async () => {
    if (!netFile || !ssmFile) {
      setError("Please upload both network and SSM output files.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
      });

      const getAttr = (obj: any, key: string) => {
        if (!obj) return undefined;
        return obj[key] ?? obj[`@_${key}`];
      };

      let parsedLocation: SumoLocation | null = null;
      try {
        if (netFile) {
          let netText: string;
          if (netFile.name.toLowerCase().endsWith('.gz')) {
            try {
              const head = new Uint8Array(await netFile.slice(0, 2).arrayBuffer());
              const isGzip = head[0] === 0x1f && head[1] === 0x8b;
              if (!isGzip) {
                setError("ไฟล์ไม่ใช่ gzip ที่ถูกต้อง (magic bytes ไม่ตรง)");
                setIsLoading(false);
                return;
              }
              const compressed = new Uint8Array(await netFile.arrayBuffer());
              const decompressed = pako.ungzip(compressed);
              netText = new TextDecoder().decode(decompressed);
            } catch (decompErr) {
              console.error("Decompression failed:", decompErr);
              setError(`Decompress ไฟล์ .gz ล้มเหลว: ${decompErr instanceof Error ? decompErr.message : String(decompErr)}`);
              setIsLoading(false);
              return;
            }
          } else {
            netText = await netFile.text();
          }
          console.log("Network file loaded, length:", netText.length);
          const netData = parser.parse(netText);
          const loc = netData.net?.location || netData.location;

          if (loc) {
            parsedLocation = {
              netOffset: (getAttr(loc, 'netOffset') || "0,0").split(',').map(Number) as [number, number],
              convBoundary: (getAttr(loc, 'convBoundary') || "0,0,1000,1000").split(',').map(Number) as [number, number, number, number],
              origBoundary: (getAttr(loc, 'origBoundary') || "0,0,1000,1000").split(',').map(Number) as [number, number, number, number],
              projParameter: getAttr(loc, 'projParameter') || "!",
            };
            setSumoLocation(parsedLocation);

            const cb = parsedLocation.convBoundary;
            const centerX = (cb[0] + cb[2]) / 2;
            const centerY = (cb[1] + cb[3]) / 2;

            const targetProj = '+proj=longlat +datum=WGS84 +no_defs';
            let geoX = centerX;
            let geoY = centerY;

            if (parsedLocation.projParameter && parsedLocation.projParameter !== '!') {
              try {
                const adjX = centerX - (parsedLocation.netOffset[0] || 0);
                const adjY = centerY - (parsedLocation.netOffset[1] || 0);
                const result = proj4(parsedLocation.projParameter, targetProj, [adjX, adjY]);
                if (result && Number.isFinite(result[0]) && Number.isFinite(result[1])) {
                  geoX = result[0];
                  geoY = result[1];
                }
              } catch (e) {
                console.warn("proj4 conversion failed for reverse-geocode", e);
              }
            } else {
              geoX = centerY;
              geoY = centerX;
            }

            if (isValidCoord([geoY, geoX])) {
              const nearest = findNearestProvince(geoY, geoX);
              if (nearest) {
                setSelectedProvince(nearest.code);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse net.xml", e);
      }

      const ssmText = await ssmFile.text();
      const ssmData = parser.parse(ssmText);

      let rawConflicts = ssmData.SSMLog?.conflict || ssmData.conflict || ssmData['ssm-results']?.SSMLog?.conflict;

      if (!rawConflicts) {
        const findConflicts = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.conflict) return obj.conflict;
          for (const key in obj) {
            const found = findConflicts(obj[key]);
            if (found) return found;
          }
          return null;
        };
        rawConflicts = findConflicts(ssmData);
      }
      if (!rawConflicts) {
        setConflicts([]);
        setError("No conflicts found in the SSM output.");
        setIsLoading(false);
        return;
      }

      if (!Array.isArray(rawConflicts)) {
        rawConflicts = [rawConflicts];
      }

        const targetProj = '+proj=longlat +datum=WGS84 +no_defs';

        const convertCoord = (x: number, y: number): [number, number] | undefined => {
          if (!parsedLocation || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;

          const adjustedX = x - (parsedLocation.netOffset[0] || 0);
          const adjustedY = y - (parsedLocation.netOffset[1] || 0);

          if (parsedLocation.projParameter === '!' || !parsedLocation.projParameter) {
            if (isValidCoord([y, x])) return [y, x];
            return undefined;
          }

          try {
            const result = proj4(parsedLocation.projParameter, targetProj, [adjustedX, adjustedY]);
            if (!result || !Number.isFinite(result[0]) || !Number.isFinite(result[1])) return undefined;
            const final: [number, number] = [result[1], result[0]];
            return isValidCoord(final) ? final : undefined;
          } catch (e) {
            return undefined;
          }
        };

      const processedConflicts: Conflict[] = rawConflicts.map((c: any, index: number) => {
        const parseMetric = (m: any): ConflictMetric | undefined => {
          if (!m) return undefined;
          const val = getAttr(m, 'value');
          if (val === 'NA' || val === undefined) return undefined;

          const posStr = getAttr(m, 'position');
          const posRaw = posStr ? posStr.split(',').map(v => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
          }) : [0, 0];
          const pos: [number, number] = [posRaw[0] ?? 0, posRaw[1] ?? 0];

          const metricValue = Number(val);
          const metricSpeed = Number(getAttr(m, 'speed'));

          return {
            time: Number(getAttr(m, 'time')),
            position: pos,
            geoPosition: convertCoord(pos[0], pos[1]),
            type: getAttr(m, 'type'),
            value: Number.isFinite(metricValue) ? metricValue : 0,
            speed: Number.isFinite(metricSpeed) ? metricSpeed : 0,
          };
        };

        const minTTC = parseMetric(c.minTTC);
        const maxDRAC = parseMetric(c.maxDRAC);
        const PET = parseMetric(c.PET);

        return {
          id: `conflict-${index}`,
          begin: Number(getAttr(c, 'begin')),
          end: Number(getAttr(c, 'end')),
          ego: getAttr(c, 'ego'),
          foe: getAttr(c, 'foe'),
          minTTC,
          maxDRAC,
          PET,
        };
      });

      setConflicts(processedConflicts);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred while processing files.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccidents = async (offset = 0, append = false) => {
    if (!selectedProvince) {
      setAccidentError("กรุณาเลือกจังหวัด");
      return;
    }
    setLoadingAccidents(true);
    setAccidentError(null);
    try {
      const res = await fetch('/api/accidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: 3,
          severity_id: severityId,
          geocode: selectedProvince,
          start_date: startDate,
          end_date: endDate,
          limit: accidentLimit,
          offset,
        }),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server returned invalid response (HTTP ${res.status}) — ตรวจสอบว่า backend รันอยู่ที่พอร์ต 3001`);
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || 'Failed to fetch accidents');
      }
      const items: Accident[] = (json.data || []).filter((a: Accident) =>
        Array.isArray(a.location) && a.location.length === 2
      );
      setAccidentTotal(json.total || 0);
      setAccidents(prev => append ? [...prev, ...items] : items);
      setShowAccidents(true);
    } catch (err) {
      console.error(err);
      setAccidentError(err instanceof Error ? err.message : 'Failed to fetch accidents');
    } finally {
      setLoadingAccidents(false);
    }
  };

  const clearSumo = () => {
    setConflicts([]);
    setSelectedConflict(null);
    setSumoLocation(null);
    setNetFile(null);
    setSsmFile(null);
    setError(null);
    setTypeFilters(['2', '3', '6', '7', '10', '11']);
    setRiskFilters(['high', 'moderate', 'low']);
    setDisplayLimit(500);
  };

  const clearAccidents = () => {
    setAccidents([]);
    setShowAccidents(false);
    setAccidentError(null);
  };

  const exportToCSV = () => {
    if (filteredConflicts.length === 0) return;

    const headers = [
      "ID", "Time", "Begin", "End", "Ego", "Foe",
      "Type", "Type Description", "TTC", "DRAC", "PET",
      "Latitude", "Longitude", "InternalX", "InternalY"
    ];

    const rows = filteredConflicts.map(c => {
      const type = c.minTTC?.type || "";
      const typeDesc = type && CONFLICT_DESCRIPTIONS[type] ? CONFLICT_DESCRIPTIONS[type].label : "";

      return [
        c.id,
        c.minTTC?.time || "",
        c.begin,
        c.end,
        c.ego,
        c.foe,
        type,
        `"${typeDesc}"`,
        c.minTTC?.value || "",
        c.maxDRAC?.value || "",
        c.PET?.value || "",
        c.minTTC?.geoPosition?.[0] || "",
        c.minTTC?.geoPosition?.[1] || "",
        c.minTTC?.position[0] || "",
        c.minTTC?.position[1] || ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => (val === undefined || val === null ? "" : val)).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sumo_conflicts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0F172A] text-slate-200 font-sans overflow-hidden">
      <div className="w-80 flex-shrink-0 bg-[#1E293B] border-r border-slate-700 flex flex-col shadow-2xl z-50 h-full">
        <div className="relative p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold flex items-center gap-2 text-white">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            SUMO Risk Insight
          </h1>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-widest">
            v2.4.1 // SSMLog Analyzer
          </p>
          <button
            onClick={() => setHelpOpen(true)}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all"
            title="คู่มือการใช้งาน"
          >
            ?
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          <div className="space-y-3">
            <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
              <Upload size={12} /> Simulation Assets
            </h2>

            <div className="space-y-2">
              <label className="block">
                <div className={`relative group border border-dashed rounded-lg p-2.5 transition-all ${netFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'}`}>
                  <input type="file" accept=".xml,.xml.gz" onChange={(e) => handleFileUpload(e, 'net')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${netFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      <MapIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-300 truncate">
                        {netFile ? netFile.name : 'osm.net.xml'}
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Network & Projection</p>
                    </div>
                    {netFile && <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">LOADED</span>}
                  </div>
                </div>
              </label>

              <label className="block">
                <div className={`relative group border border-dashed rounded-lg p-2.5 transition-all ${ssmFile ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'}`}>
                  <input type="file" accept=".xml" onChange={(e) => handleFileUpload(e, 'ssm')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${ssmFile ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-300 truncate">
                        {ssmFile ? ssmFile.name : 'ssm_output.xml'}
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Conflict Metrics</p>
                    </div>
                    {ssmFile && <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">LOADED</span>}
                  </div>
                </div>
              </label>

              {conflicts.length > 0 && (
                <button
                  onClick={clearSumo}
                  className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
                >
                  <X size={12} />
                  Clear SUMO Data
                </button>
              )}

              <button
                onClick={processFiles}
                disabled={!netFile || !ssmFile || isLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-[11px] font-black transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {conflicts.length > 0 ? "Reprocess Analysis" : "Process Visualization"}
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-700/50">
            <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
              <AlertTriangle size={12} /> Real Accident Data (iTIC)
            </h2>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาจังหวัด..."
                  value={provinceSearch}
                  onChange={(e) => setProvinceSearch(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={selectedProvince ?? ''}
                onChange={(e) => setSelectedProvince(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">-- เลือกจังหวัด --</option>
                {filteredProvinces.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.nameTH} ({p.nameEN})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] text-slate-500 uppercase font-bold">จากวันที่</label>
                  <input
                    type="date"
                    value={startDate}
                    min="2023-01-01"
                    max="2025-12-31"
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-500 uppercase font-bold">ถึงวันที่</label>
                  <input
                    type="date"
                    value={endDate}
                    min="2023-01-01"
                    max="2025-12-31"
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[8px] text-slate-500 uppercase font-bold">ความรุนแรง</label>
                <select
                  value={severityId}
                  onChange={(e) => setSeverityId(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value={1}>ทั้งหมด</option>
                  <option value={2}>เสียชีวิต</option>
                  <option value={3}>บาดเจ็บ</option>
                </select>
              </div>

              <div>
                <label className="text-[8px] text-slate-500 uppercase font-bold">จำนวนข้อมูลต่อครั้ง</label>
                <select
                  value={accidentLimit}
                  onChange={(e) => setAccidentLimit(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                  <option value={20000}>20,000</option>
                  <option value={50000}>50,000</option>
                </select>
              </div>

              <button
                onClick={() => fetchAccidents(0, false)}
                disabled={loadingAccidents || !selectedProvince}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-[11px] font-black transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                {loadingAccidents ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Load Accidents
                    <Download size={14} />
                  </>
                )}
              </button>

              {accidentError && (
                <p className="text-[10px] text-red-400">{accidentError}</p>
              )}

              {accidents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-lg px-2.5 py-2">
                    <span className="text-[10px] font-bold text-purple-300">
                      แสดง {accidents.length.toLocaleString()} จาก {accidentTotal.toLocaleString()} รายการ
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setAccidentViewMode(v => v === 'points' ? 'heat' : 'points')}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 transition-all"
                        title="สลับโหมดแสดงผล"
                      >
                        {accidentViewMode === 'points' ? 'Heat' : 'Points'}
                      </button>
                      <button
                        onClick={() => setShowAccidents(v => !v)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${
                          showAccidents
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {showAccidents ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={clearAccidents}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {accidents.length < accidentTotal && (
                    <button
                      onClick={() => fetchAccidents(accidents.length, true)}
                      disabled={loadingAccidents}
                      className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
                    >
                      {loadingAccidents ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Load More ({(accidentTotal - accidents.length).toLocaleString()} เหลือ)</>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-700/50">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-black text-emerald-500 uppercase tracking-widest">Analysis Ready</span>
                  <span className="font-mono text-emerald-400 font-bold">{conflicts.length.toLocaleString()} RISKS</span>
                </div>
              </div>

              {sumoLocation && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
                  <h3 className="text-[10px] font-black text-blue-500 tracking-widest uppercase flex items-center gap-1.5">
                    <MapIcon size={12} /> Projection
                  </h3>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-bold uppercase">Offset</span>
                    <span className="font-mono text-blue-300/80">{sumoLocation.netOffset[0].toFixed(0)}, {sumoLocation.netOffset[1].toFixed(0)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="space-y-3">
                  <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
                    <Filter size={12} /> Conflict Selection
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CONFLICT_DESCRIPTIONS).map(([id, info]) => (
                      <button
                        key={id}
                        onClick={() => setTypeFilters(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                        className={`text-[9px] font-bold p-2 rounded-lg border transition-all text-left flex flex-col gap-1 ${
                          typeFilters.includes(id)
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        <span className="opacity-70 text-[8px] uppercase tracking-tighter">Type {id}</span>
                        <span className="leading-tight">{info.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
                    <AlertTriangle size={12} /> Intensity Scale
                  </h2>
                  <div className="flex gap-2">
                    {(['low', 'moderate', 'high'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setRiskFilters(prev => prev.includes(level) ? prev.filter(x => x !== level) : [...prev, level])}
                        className={`flex-1 text-[9px] font-black uppercase tracking-widest p-2 rounded-lg border transition-all ${
                          riskFilters.includes(level)
                            ? level === 'high' ? 'bg-red-500/20 border-red-500/50 text-red-500' :
                              level === 'moderate' ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' :
                              'bg-emerald-500/20 border-emerald-500/50 text-emerald-500'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-2">
                    <MapIcon size={12} /> Map Display Limit
                  </h2>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[100, 500, 1000, 2000, 5000].map((limit) => (
                      <button
                        key={limit}
                        onClick={() => setDisplayLimit(limit)}
                        className={`text-[9px] font-black py-1.5 rounded-lg border transition-all ${
                          displayLimit === limit
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {limit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h2 className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Registry Feed ({filteredConflicts.length})</h2>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[9px] font-black uppercase tracking-widest transition-all border border-slate-700"
                  title="Export Filtered Conflict Data to CSV"
                >
                  <Download size={10} />
                  Export
                </button>
              </div>

              <div className="flex-1 min-h-0 flex flex-col border border-slate-700/50 rounded-xl bg-slate-900/30 overflow-hidden" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {filteredConflicts.slice(0, 50).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConflict(c)}
                      className={`w-full p-2.5 rounded-lg text-left transition-all border ${
                        selectedConflict?.id === c.id
                          ? 'bg-blue-500/20 border-blue-500/50 shadow-inner'
                          : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                          (c.minTTC?.value || 10) < 1.5 ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 text-slate-400'
                        }`}>
                          #{c.id.split('-')[1]}
                        </span>
                        <div className="flex items-center gap-2">
                          {c.minTTC?.geoPosition && (
                            <span className="text-[7px] font-mono text-slate-600">
                              GPS: {c.minTTC.geoPosition[0].toFixed(3)},{c.minTTC.geoPosition[1].toFixed(3)}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-slate-500">{c.minTTC?.time}s</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">
                          {c.ego} <span className="text-slate-600">x</span> {c.foe}
                        </div>
                        <div className="text-[11px] font-black text-blue-400">
                          {c.minTTC?.value.toFixed(2)}s
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-500">
            <Info size={12} />
            <span className="text-[10px] font-mono">PROJ: {sumoLocation?.projParameter || 'RAW_COORDS'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-[#0B0F1A]">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700 shadow-2xl">
          {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((style) => (
            <button
              key={style}
              onClick={() => setMapStyle(style)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                mapStyle === style
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {MAP_STYLES[style].name}
            </button>
          ))}
        </div>

        <MapContainer
          center={[13.75, 100.5]}
          zoom={10}
          className="h-full w-full outline-none"
          scrollWheelZoom={true}
          preferCanvas={true}
        >
          <MapResizeHandler />
          <TileLayer
            key={mapStyle}
            attribution={MAP_STYLES[mapStyle].attribution}
            url={MAP_STYLES[mapStyle].url}
          />

          <MapRecenter bounds={mapBounds} />

          {filteredConflicts.slice(0, displayLimit).map((c) => {
            const pos = c.minTTC?.geoPosition || c.maxDRAC?.geoPosition;
            if (!isValidCoord(pos)) return null;

            return (
              <CircleMarker
                key={c.id}
                center={pos}
                radius={c.id === selectedConflict?.id ? 10 : 6}
                pathOptions={{
                  fillColor: getRiskColor(c),
                  fillOpacity: 0.6,
                  color: selectedConflict?.id === c.id ? '#ffffff' : 'transparent',
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedConflict(c),
                }}
              />
            );
          })}

          {showAccidents && accidentViewMode === 'points' && <AccidentLayer accidents={accidents} />}
          {showAccidents && accidentViewMode === 'heat' && (
            <HeatLayer accidents={accidents} />
          )}
        </MapContainer>

        <AnimatePresence>
          {selectedConflict && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="absolute right-6 top-6 bottom-6 w-[280px] bg-[#1E293B] rounded-xl shadow-2xl z-[1000] border border-slate-700 flex flex-col overflow-hidden pointer-events-auto"
            >
              <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900 shadow-inner flex-shrink-0">
                <div>
                  <h3 className="text-[10px] font-black tracking-widest uppercase text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ background: getRiskColor(selectedConflict) }} />
                    Conflict Scan
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 group"
                >
                  <X size={14} className="group-hover:text-white transition-colors" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div className="space-y-2">
                  <h4 className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Actor Telemetry</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900/50 border border-slate-800 p-2 rounded-lg text-center">
                      <span className="text-[8px] text-slate-600 uppercase font-black block mb-0.5">Ego</span>
                      <span className="text-[10px] font-bold text-slate-200 truncate block">{selectedConflict.ego}</span>
                    </div>
                    <div className="text-slate-700 font-black text-[9px]">VS</div>
                    <div className="flex-1 bg-slate-900/50 border border-slate-800 p-2 rounded-lg text-center">
                      <span className="text-[8px] text-slate-600 uppercase font-black block mb-0.5">Foe</span>
                      <span className="text-[10px] font-bold text-slate-200 truncate block">{selectedConflict.foe}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedConflict.minTTC?.type && CONFLICT_DESCRIPTIONS[selectedConflict.minTTC.type] && (
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 border-l-4 border-l-blue-500">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="text-[8px] uppercase font-black text-blue-500 mb-0.5">Interaction Profile</p>
                          <p className="text-[10px] font-bold text-white leading-tight">{CONFLICT_DESCRIPTIONS[selectedConflict.minTTC.type].label}</p>
                        </div>
                        <span className="text-[7px] font-mono p-1 bg-slate-800 text-slate-500 rounded border border-slate-700">CODE_{selectedConflict.minTTC.type}</span>
                      </div>
                      <p className="text-[9px] text-slate-300 leading-tight mb-2 italic">"{CONFLICT_DESCRIPTIONS[selectedConflict.minTTC.type].desc}"</p>

                      <div className="pt-2 border-t border-slate-800">
                         <ConflictVisualization conflict={selectedConflict} />
                      </div>

                      <div className="pt-3 space-y-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-[#94A3B8]">Summary & Mitigation (สรุปความเสี่ยงและมาตรการ)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5 col-span-2">
                            <p className="text-[10px] text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                              <AlertTriangle size={10} className="text-orange-500" />
                              {selectedConflict.minTTC.type === "2" && "รูปแบบ: เสี่ยงการชนท้าย (Rear-end) - ขับตามคันหน้า"}
                              {selectedConflict.minTTC.type === "3" && "รูปแบบ: เสี่ยงถูกชนท้าย (Rear-end) - ถูกขับตามหลัง"}
                              {selectedConflict.minTTC.type === "6" && "รูปแบบ: เสี่ยงปะทะด้านข้าง (Merging Collision) - คู่กรณีเข้าจุดรวมก่อน"}
                              {selectedConflict.minTTC.type === "7" && "รูปแบบ: เสี่ยงปะทะด้านข้าง (Merging Collision) - เข้าจุดรวมก่อนคู่กรณี"}
                              {selectedConflict.minTTC.type === "10" && "รูปแบบ: เสี่ยงปะทะกลางทางแยก (Crossing) - เข้าจุดตัดก่อนคู่กรณี"}
                              {selectedConflict.minTTC.type === "11" && "รูปแบบ: เสี่ยงปะทะกลางทางแยก (Crossing) - คู่กรณีเข้าจุดตัดก่อน"}
                            </p>
                            <div className="space-y-1">
                              <p className="text-[9px] text-slate-400 leading-snug">
                                <span className="text-blue-400 font-bold">สถานะ:</span> ความเร็วปัจจุบัน {(selectedConflict.minTTC.speed * 3.6).toFixed(1)} km/h ระยะเวลาวิกฤต {selectedConflict.minTTC.value.toFixed(2)} วินาที
                              </p>
                              <p className="text-[9px] text-slate-400 leading-snug">
                                <span className="text-red-400 font-bold">การตอบสนอง:</span> จำเป็นต้องใช้แรงเบรกอย่างน้อย <span className="text-white font-black">{(selectedConflict.maxDRAC?.value || 0).toFixed(2)} m/s²</span> เพื่อหยุดยานพาหนะให้ปลอดภัยจากจุดปะทะ
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-slate-500 flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-blue-500" /> TTC
                      </span>
                      <span className="text-[8px] font-mono text-slate-600">INF</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-light text-white leading-none">
                        {selectedConflict.minTTC?.value.toFixed(3) || 'N/A'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">s</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-slate-500 flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-orange-500" /> DRAC
                      </span>
                      <span className="text-[8px] font-mono text-slate-600">MAX</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-light text-orange-400 leading-none">
                        {selectedConflict.maxDRAC?.value.toFixed(3) || 'N/A'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">m/s²</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-2">
                    <h4 className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Spatial Reference</h4>
                    <span className="text-[8px] font-mono text-slate-600">EPSG:4326</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="bg-slate-950/40 p-2 rounded-lg border border-white/5">
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-slate-500 uppercase font-black">Internal (Cartesian)</span>
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-slate-300">
                        <span>X: {selectedConflict.minTTC?.position[0].toFixed(2)}</span>
                        <span>Y: {selectedConflict.minTTC?.position[1].toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-blue-500/5 p-2 rounded-lg border border-blue-500/20">
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-blue-500 uppercase font-black">Geodetic (GPS)</span>
                        <MapIcon size={8} className="text-blue-500" />
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-blue-400 font-bold">
                        <span>LAT: {selectedConflict.minTTC?.geoPosition?.[0].toFixed(6)}</span>
                        <span>LON: {selectedConflict.minTTC?.geoPosition?.[1].toFixed(6)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] px-1">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock size={10} /> Active Time
                      </span>
                      <span className="font-mono text-white">
                        {selectedConflict.begin}s - {selectedConflict.end}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto p-4 bg-slate-950/80 backdrop-blur-sm flex items-center gap-3 border-t border-slate-800">
                <div className="p-2 bg-slate-800 flex items-center justify-center rounded-lg border border-slate-700">
                  <FileText className="text-blue-500" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-tight">Log Reference</p>
                  <p className="text-[10px] text-slate-300 font-mono mt-0.5 truncate italic">
                    {ssmFile?.name || 'LOG_DATA'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-8 left-8 flex items-center gap-6 bg-[#0F172A]/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700 shadow-2xl z-[500]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
            <span className="text-[11px] font-bold text-slate-300">High Risk (TTC {"<"} 1.5s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span>
            <span className="text-[11px] font-bold text-slate-300">Moderate (1.5 - 3.0s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-500"></span>
            <span className="text-[11px] font-bold text-slate-500">Low Risk ({">"} 3.0s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(124,58,237,0.5)]"></span>
            <span className="text-[11px] font-bold text-slate-300">เสียชีวิต (iTIC)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></span>
            <span className="text-[11px] font-bold text-slate-300">บาดเจ็บ (iTIC)</span>
          </div>
        </div>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        .leaflet-popup-content-wrapper {
          background: #1E293B;
          color: #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          border: 1px solid #334155;
        }
        .leaflet-popup-tip {
          background: #1E293B;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .custom-popup .leaflet-popup-close-button {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
