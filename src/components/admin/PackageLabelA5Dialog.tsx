import { useState, useEffect, useRef, useCallback } from "react";
import { AdminDialog } from "./AdminDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Printer, Package, AlertTriangle, Phone, MapPin, Building2,
  Truck, DollarSign, User, Hash, RefreshCw, Check, Info, Loader2, ExternalLink,
  Download, Eye, Edit3, Smartphone, Sparkles, ShieldCheck
} from "lucide-react";
import { adminUsersApi, type AdminOrder } from "@/lib/api";
import { getInvoiceBranding } from "@/lib/invoice-branding";
import { getReceivedNotesForOrder } from "@/lib/receivedNotesStorage";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { REALTECH_LOGO_DATA_URI } from "@/lib/logo-data";

export interface PackageLabelPrintData {
  warningText: string;
  senderPhone: string;
  receiverPhone: string;
  city: string;
  branch: string;
  customerName?: string;
  orderId?: string;
  courier?: string;
  codAmount?: string;
  itemsSummary?: string;
  showCustomerName?: boolean;
  showOrderId?: boolean;
  showCod?: boolean;
  showItems?: boolean;
  singleLineLocation?: boolean;
  logoUrl?: string;
  siteName?: string;
  paperSize?: "a5" | "a4" | "thermal_100x150" | "thermal_76x130";
}

export interface CambodiaProvinceDef {
  nameEn: string;
  nameKh: string;
  aliases: string[];
}

export const CAMBODIA_PROVINCES: CambodiaProvinceDef[] = [
  { nameEn: "Phnom Penh", nameKh: "ភ្នំពេញ", aliases: ["phnom penh", "phnompenh", "ភ្នំពេញ", "pp"] },
  { nameEn: "Sihanoukville", nameKh: "ព្រះសីហនុ", aliases: ["sihanoukville", "preah sihanouk", "kampong som", "ព្រះសីហនុ", "កំពង់សោម", "shv", "sihanouk"] },
  { nameEn: "Siem Reap", nameKh: "សៀមរាប", aliases: ["siem reap", "siemreap", "សៀមរាប", "sr"] },
  { nameEn: "Battambang", nameKh: "បាត់ដំបង", aliases: ["battambang", "បាត់ដំបង", "btb"] },
  { nameEn: "Kampot", nameKh: "កំពត", aliases: ["kampot", "កំពត"] },
  { nameEn: "Poipet", nameKh: "ប៉ោយប៉ែត", aliases: ["poipet", "ប៉ោយប៉ែត"] },
  { nameEn: "Banteay Meanchey", nameKh: "បន្ទាយមានជ័យ", aliases: ["banteay meanchey", "banteaymeanchey", "បន្ទាយមានជ័យ", "sisophon", "bmc"] },
  { nameEn: "Kampong Cham", nameKh: "កំពង់ចាម", aliases: ["kampong cham", "kampongcham", "កំពង់ចាម"] },
  { nameEn: "Kandal", nameKh: "កណ្តាល", aliases: ["kandal", "កណ្តាល", "ta khmau", "takhmao", "តាខ្មៅ"] },
  { nameEn: "Kampong Speu", nameKh: "កំពង់ស្ពឺ", aliases: ["kampong speu", "kampongspeu", "កំពង់ស្ពឺ"] },
  { nameEn: "Takeo", nameKh: "តាកែវ", aliases: ["takeo", "តាកែវ"] },
  { nameEn: "Koh Kong", nameKh: "កោះកុង", aliases: ["koh kong", "kohkong", "កោះកុង"] },
  { nameEn: "Kampong Chhnang", nameKh: "កំពង់ឆ្នាំង", aliases: ["kampong chhnang", "kampongchhnang", "កំពង់ឆ្នាំង"] },
  { nameEn: "Pursat", nameKh: "ពោធិ៍សាត់", aliases: ["pursat", "ពោធិ៍សាត់"] },
  { nameEn: "Prey Veng", nameKh: "ព្រៃវែង", aliases: ["prey veng", "preyveng", "ព្រៃវែង"] },
  { nameEn: "Svay Rieng", nameKh: "ស្វាយរៀង", aliases: ["svay rieng", "svayrieng", "ស្វាយរៀង", "bavet", "បាវិត"] },
  { nameEn: "Kratie", nameKh: "ក្រចេះ", aliases: ["kratie", "ក្រចេះ"] },
  { nameEn: "Stung Treng", nameKh: "ស្ទឹងត្រែង", aliases: ["stung treng", "stungtreng", "ស្ទឹងត្រែង"] },
  { nameEn: "Ratanakiri", nameKh: "រតនគិរី", aliases: ["ratanakiri", "រតនគិរី", "banlung", "បានលុង"] },
  { nameEn: "Mondulkiri", nameKh: "មណ្ឌលគិរី", aliases: ["mondulkiri", "មណ្ឌលគិរី", "sen monorom", "សែនមនោរម្យ"] },
  { nameEn: "Preah Vihear", nameKh: "ព្រះវិហារ", aliases: ["preah vihear", "preahvihear", "ព្រះវិហារ"] },
  { nameEn: "Oddar Meanchey", nameKh: "ឧត្តរមានជ័យ", aliases: ["oddar meanchey", "oddarmeanchey", "ឧត្តរមានជ័យ", "samraong", "សំរោង"] },
  { nameEn: "Pailin", nameKh: "ប៉ៃលិន", aliases: ["pailin", "ប៉ៃលិន"] },
  { nameEn: "Kep", nameKh: "កែប", aliases: ["kep", "កែប"] },
  { nameEn: "Tboung Khmum", nameKh: "ត្បូងឃ្មុំ", aliases: ["tboung khmum", "tboungkhmum", "ត្បូងឃ្មុំ", "suong", "សួង"] },
];

export const POPULAR_PROVINCES = [
  "Phnom Penh",
  "Sihanoukville",
  "Siem Reap",
  "Battambang",
  "Kampot",
  "Poipet",
  "Kampong Cham",
  "Kandal",
];

export const COURIER_PRESETS = [
  "None",
  "Virak Buntham (VET)",
  "J&T Express",
  "Capitol Transport",
  "Kerry Express",
  "Flash Express",
  "ZTO Express",
  "Speed Cargo",
];

export const WARNING_PRESETS = [
  "ប្រយ័ត្នបាក់បែក ឬ សើម",
  "ប្រយ័ត្នបាក់បែក (FRAGILE)",
  "ហាមជាន់ ឬ បោះ (DO NOT DROP)",
  "កុំផ្កាប់ ឬ ផ្អៀង (THIS WAY UP)",
];

export function extractPhoneFromText(text?: string | null): string | null {
  if (!text) return null;
  const patterns = [
    /(?:\+?855|0)[1-9]\d{1,2}[\s.-]?\d{2,3}[\s.-]?\d{3,4}\b/,
    /\b0\d{8,9}\b/,
    /\b0\d{2}[\s.-]\d{3}[\s.-]\d{3,4}\b/,
  ];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

export function resolveCustomerPhone(order?: AdminOrder | null, detailedOrder?: AdminOrder | null): string {
  if (!order && !detailedOrder) return "";
  const o = detailedOrder || order;
  const rawList = [
    detailedOrder?.customer?.phone,
    detailedOrder?.user?.phone,
    order?.customer?.phone,
    order?.user?.phone,
    (detailedOrder as any)?.customer_phone,
    (order as any)?.customer_phone,
    (detailedOrder as any)?.shipping_phone,
    (order as any)?.shipping_phone,
    (detailedOrder as any)?.receiver_phone,
    (order as any)?.receiver_phone,
    (detailedOrder as any)?.phone,
    (order as any)?.phone,
  ];

  for (const p of rawList) {
    if (p && typeof p === "string" && p.trim() && p.trim() !== "—" && p.trim() !== "null" && p.trim() !== "undefined") {
      return p.trim();
    }
  }

  if (o?.id) {
    try {
      const pastNotes = getReceivedNotesForOrder(o.id);
      if (pastNotes.length > 0 && pastNotes[0].receiver_phone?.trim()) {
        return pastNotes[0].receiver_phone.trim();
      }
    } catch {
      // ignore
    }
  }

  const notePhone = extractPhoneFromText(detailedOrder?.notes || order?.notes);
  if (notePhone) return notePhone;

  return "";
}

export function resolveCustomerAddress(order?: AdminOrder | null, detailedOrder?: AdminOrder | null): string {
  if (!order && !detailedOrder) return "";
  const o = detailedOrder || order;
  const rawList = [
    detailedOrder?.customer?.address,
    detailedOrder?.user?.address,
    order?.customer?.address,
    order?.user?.address,
    (detailedOrder as any)?.customer_address,
    (order as any)?.customer_address,
    (detailedOrder as any)?.shipping_address,
    (order as any)?.shipping_address,
    (detailedOrder as any)?.delivery_address,
    (order as any)?.delivery_address,
    (detailedOrder as any)?.address,
    (order as any)?.address,
    (detailedOrder as any)?.receiver_address,
    (order as any)?.receiver_address,
    (detailedOrder as any)?.location,
    (order as any)?.location,
  ];

  for (const a of rawList) {
    if (a && typeof a === "string" && a.trim() && a.trim() !== "—" && a.trim() !== "null" && a.trim() !== "undefined") {
      const trimmed = a.trim();
      if (trimmed.toLowerCase() !== "cambodia") {
        return trimmed;
      }
    }
  }

  if (o?.id) {
    try {
      const pastNotes = getReceivedNotesForOrder(o.id);
      if (pastNotes.length > 0 && pastNotes[0].receiver_address?.trim()) {
        return pastNotes[0].receiver_address.trim();
      }
    } catch {
      // ignore
    }
  }

  const notesText = detailedOrder?.notes || order?.notes;
  if (notesText) {
    const addrLineMatch = notesText.match(/(?:Address|Location|To|Ship to|Del|Delivery|ទីតាំង)[:\-]\s*([^\n,]+(?:,[^\n,]+)*)/i);
    if (addrLineMatch && addrLineMatch[1]) {
      return addrLineMatch[1].trim();
    }
  }

  return "";
}

export function parseCustomerLocation(rawAddress: string, notes?: string): {
  city: string;
  branch: string;
  detectedCourier?: string;
} {
  const combinedText = `${rawAddress || ""} ${notes || ""}`.trim();

  let detectedCourier: string | undefined;
  const lowerCombined = combinedText.toLowerCase();
  if (lowerCombined.includes("virak buntham") || lowerCombined.includes("vet") || lowerCombined.includes("វីរៈប៊ុនថាំ") || lowerCombined.includes("វីរៈ ប៊ុនថាំ")) {
    detectedCourier = "Virak Buntham (VET)";
  } else if (lowerCombined.includes("j&t") || lowerCombined.includes("j and t") || lowerCombined.includes("jnt")) {
    detectedCourier = "J&T Express";
  } else if (lowerCombined.includes("capitol") || lowerCombined.includes("កាពីតូល")) {
    detectedCourier = "Capitol Transport";
  } else if (lowerCombined.includes("kerry")) {
    detectedCourier = "Kerry Express";
  } else if (lowerCombined.includes("flash")) {
    detectedCourier = "Flash Express";
  } else if (lowerCombined.includes("zto")) {
    detectedCourier = "ZTO Express";
  } else if (lowerCombined.includes("speed")) {
    detectedCourier = "Speed Cargo";
  }

  let cleanAddress = (rawAddress || "").replace(/,\s*Cambodia\b/gi, "").replace(/\bCambodia\b/gi, "").trim();
  cleanAddress = cleanAddress.replace(/^[,\s/–-]+|[,\s/–-]+$/g, "");

  if (!cleanAddress && notes) {
    const addrLineMatch = notes.match(/(?:Address|Location|To|Ship to|Del|Delivery|ទីតាំង)[:\-]\s*([^\n,]+(?:,[^\n,]+)*)/i);
    if (addrLineMatch && addrLineMatch[1]) {
      cleanAddress = addrLineMatch[1].trim();
    }
  }

  let detectedCity = "";
  let detectedBranch = cleanAddress;

  if (cleanAddress) {
    for (const prov of CAMBODIA_PROVINCES) {
      for (const alias of prov.aliases) {
        const isKhmer = /[\u1780-\u17FF]/.test(alias);
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = isKhmer ? new RegExp(escaped, "i") : new RegExp(`\\b${escaped}\\b`, "i");

        if (pattern.test(cleanAddress)) {
          detectedCity = prov.nameEn;
          detectedBranch = cleanAddress
            .replace(pattern, "")
            .replace(new RegExp(prov.nameEn, "gi"), "")
            .replace(new RegExp(prov.nameKh, "gi"), "")
            .replace(/^[,\s/–-]+|[,\s/–-]+$/g, "")
            .trim();
          break;
        }
      }
      if (detectedCity) break;
    }

    if (!detectedCity) {
      const ppDistricts = [
        "toul kork", "sen sok", "chamkarmon", "bkk", "bkk1", "bkk2", "bkk3", "boeng keng kang",
        "chroy changvar", "meanchey", "dangkao", "russey keo", "prampir makara", "daun penh",
        "por senchey", "prek pnov", "chbar ampov", "boeung trabek", "toul tom poung",
        "ទួលគោក", "សែនសុខ", "ចំការមន", "បឹងកេងកង", "ជ្រោយចង្វារ", "មានជ័យ", "ដង្កោ", "ឫស្សីកែវ",
        "៧មករា", "ដូនពេញ", "ពោធិ៍សែនជ័យ", "ច្បារអំពៅ"
      ];
      for (const d of ppDistricts) {
        if (cleanAddress.toLowerCase().includes(d.toLowerCase())) {
          detectedCity = "Phnom Penh";
          detectedBranch = cleanAddress;
          break;
        }
      }
    }
  }

  if (detectedCity) {
    return {
      city: detectedCity,
      branch: detectedBranch || "",
      detectedCourier,
    };
  }

  if (cleanAddress) {
    return {
      city: "Phnom Penh",
      branch: cleanAddress,
      detectedCourier,
    };
  }

  return {
    city: "Phnom Penh",
    branch: "",
    detectedCourier,
  };
}

/**
 * High-detail Golden Warning Triangle
 */
export const WarningTriangleSvg = ({ className = "w-28 h-24" }: { className?: string }) => (
  <svg viewBox="0 0 100 88" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 50 6 L 93 79 C 95 83 92 87 87 87 L 13 87 C 8 87 5 83 7 79 L 50 6 Z"
      fill="#FBBF24"
      stroke="#000000"
      strokeWidth="7"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path
      d="M 50 28 L 50 56"
      stroke="#000000"
      strokeWidth="7.5"
      strokeLinecap="round"
    />
    <circle cx="50" cy="71" r="4.5" fill="#000000" />
  </svg>
);

/**
 * Clean Fragile Broken Glass Symbol
 */
export const FragileGlassSvg = ({ className = "w-14 h-14 text-neutral-900" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M8 22h8M19 3v4c0 3.31-2.69 6-6 6h-2c-3.31 0-6-2.69-6-6V3h14zM12 13v9" />
    <path d="M9 7l2 3-2 3" />
  </svg>
);

/**
 * Generate full HTML for printable A5 / A4 / Thermal package label
 * Hierarchy:
 * 0. LOGO ON TOP & BRAND BAR
 * 1. VERY BIG WARNING (Symbols & Headline)
 * 2. SENDER PHONE NUMBER (Directly on top of receiver)
 * 3. RECEIVER SECTION (Huge receiver phone + destination)
 * 4. COD & FOOTER
 */
export function buildPackageLabelHtml(data: PackageLabelPrintData): string {
  const paper = data.paperSize || "a5";
  const isA4 = paper === "a4";
  const is100x150 = paper === "thermal_100x150";
  const is76x130 = paper === "thermal_76x130";

  const pageSizeStyle = isA4
    ? "A4 portrait"
    : is100x150
    ? "100mm 150mm"
    : is76x130
    ? "76mm 130mm"
    : "A5 portrait";

  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>A5_Package_Label_${data.receiverPhone || data.city || "Package"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: ${pageSizeStyle};
      margin: ${isA4 ? "5mm 6mm" : "4mm 4mm"};
    }

    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Kantumruy Pro', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 52px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      font-size: 13px;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-toolbar .btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .print-toolbar .btn:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }
    .print-toolbar .btn-secondary {
      background: #334155;
    }

    .label-page {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      padding: ${isA4 ? "5mm 4mm" : is100x150 ? "3mm 2mm" : "3.5mm 3mm"};
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .outer-border-box {
      width: 100%;
      height: 100%;
      border: 3.5px solid #000000;
      border-radius: 12px;
      padding: ${isA4 ? "5mm 6mm" : "3.5mm 4.5mm"};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #ffffff;
    }

    /* ─── 0. LOGO ON TOP & BRAND BAR ─── */
    .top-logo-bar {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #000000;
      padding-bottom: 2.5mm;
      margin-bottom: 2mm;
    }
    .brand-logo-container {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }
    .brand-logo-img {
      height: ${isA4 ? "42px" : "34px"};
      width: auto;
      max-width: 220px;
      object-fit: contain;
    }
    .brand-tagline {
      font-size: ${isA4 ? "10px" : "8px"};
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 1px;
    }
    .courier-top-badge {
      border: 2px solid #000000;
      background: #000000;
      color: #ffffff;
      padding: 3px 14px;
      border-radius: 6px;
      font-weight: 900;
      font-size: ${isA4 ? "18px" : "13.5px"};
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* ─── 1. VERY BIG WARNING SECTION ─── */
    .top-warning-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-bottom: 2px solid #000000;
      padding-bottom: ${isA4 ? "4.5mm" : "3mm"};
      margin-bottom: 2mm;
      background: #fffbeb;
      border-radius: 8px;
      border: 1.5px dashed #f59e0b;
      padding: 2mm 3mm;
    }

    .warning-symbols-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: ${isA4 ? "28px" : "18px"};
      margin: 1mm 0 1.5mm 0;
      flex-shrink: 0;
    }

    .warning-triangle-svg {
      width: ${isA4 ? "145px" : is100x150 ? "90px" : "120px"};
      height: ${isA4 ? "125px" : is100x150 ? "78px" : "104px"};
    }

    .fragile-glass-svg {
      width: ${isA4 ? "80px" : is100x150 ? "52px" : "66px"};
      height: ${isA4 ? "80px" : is100x150 ? "52px" : "66px"};
      color: #000000;
    }

    .warning-text-headline {
      font-size: ${isA4 ? "34px" : is100x150 ? "21px" : "28px"};
      font-weight: 900;
      line-height: 1.25;
      color: #000000;
      letter-spacing: 0.5px;
      text-align: center;
    }
    .warning-sub-en {
      font-size: ${isA4 ? "13px" : "10px"};
      font-weight: 800;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 1px;
    }

    /* ─── 2. SENDER PHONE NUMBER (TOP OF RECEIVER) ─── */
    .sender-above-receiver {
      width: 100%;
      text-align: center;
      padding: ${isA4 ? "3mm 0" : "2mm 0"};
      border-bottom: 2px dashed #000000;
      font-size: ${isA4 ? "28px" : is100x150 ? "18px" : "23px"};
      font-weight: 900;
      color: #000000;
      letter-spacing: 0.8px;
      background: #f8fafc;
      border-radius: 6px;
      margin: 1.5mm 0;
    }

    /* ─── 3. RECEIVER SECTION ─── */
    .receiver-main-card {
      width: 100%;
      border: 3px solid #000000;
      border-radius: 10px;
      padding: ${isA4 ? "5mm 6mm" : "3.5mm 4.5mm"};
      margin: 1.5mm 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      flex: 1;
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }

    .receiver-badge-label {
      font-size: ${isA4 ? "15px" : "12px"};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #1d4ed8;
      margin-bottom: 1mm;
    }

    .receiver-phone-huge {
      font-size: ${isA4 ? "66px" : is100x150 ? "38px" : "50px"};
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: 2.5px;
      color: #000000;
      font-family: 'Plus Jakarta Sans', monospace, sans-serif;
      margin: 1mm 0;
      white-space: nowrap;
    }

    .receiver-destination {
      font-size: ${isA4 ? "38px" : is100x150 ? "23px" : "30px"};
      font-weight: 900;
      line-height: 1.25;
      color: #000000;
      margin-top: 1.5mm;
      word-break: break-word;
      padding: 0 2mm;
    }
    .city-part {
      font-weight: 900;
      color: #000000;
    }
    .loc-sep {
      color: #71717a;
      margin: 0 8px;
    }
    .branch-part {
      font-weight: 900;
      color: #000000;
    }

    /* ─── 4. COD & FOOTER SECTION ─── */
    .cod-banner-row {
      width: 100%;
      background: #000000;
      color: #ffffff;
      padding: ${isA4 ? "4mm 6mm" : "2.5mm 5mm"};
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1.5mm;
    }
    .cod-banner-label {
      font-size: ${isA4 ? "17px" : "13.5px"};
      font-weight: 900;
      letter-spacing: 1px;
    }
    .cod-banner-amount {
      font-size: ${isA4 ? "34px" : "25px"};
      font-weight: 900;
      color: #fde047;
      font-family: 'Plus Jakarta Sans', monospace, sans-serif;
    }

    .bottom-meta-row {
      width: 100%;
      border-top: 2px solid #000000;
      padding-top: 2mm;
      margin-top: 2mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: ${isA4 ? "13px" : "10.5px"};
      font-weight: 700;
      color: #000000;
    }

    @media screen {
      body {
        padding-top: 60px;
        background: #e2e8f0;
        display: flex;
        justify-content: center;
      }
      .label-page {
        max-width: ${isA4 ? "210mm" : is100x150 ? "100mm" : "148mm"};
        background: #ffffff;
        box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        margin: 20px auto;
        min-height: ${isA4 ? "297mm" : is100x150 ? "150mm" : "210mm"};
      }
    }

    @media print {
      .print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
        background: #ffffff !important;
      }
      .label-page {
        margin: 0 !important;
        box-shadow: none !important;
        height: 100% !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: 800; letter-spacing: 0.5px;">📦 REALTECH A5 PACKAGE LABEL</span>
      <span style="opacity: 0.5;">|</span>
      <span>${data.receiverPhone || data.city || "Package"}</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        Close
      </button>
    </div>
  </div>

  <div class="label-page">
    <div class="outer-border-box">
      <!-- 0. LOGO ON TOP & BRAND BAR -->
      <div class="top-logo-bar">
        <div class="brand-logo-container">
          <img src="${(data.logoUrl && data.logoUrl !== '/realtech-logo.png') ? data.logoUrl : REALTECH_LOGO_DATA_URI}" alt="Realtech Logo" class="brand-logo-img" />
          <span class="brand-tagline">MacBook & Portable Monitor Specialist</span>
        </div>

        ${data.courier && data.courier !== "None" ? `
          <div class="courier-top-badge">${data.courier}</div>
        ` : `
          <div class="courier-top-badge">EXPRESS DISPATCH</div>
        `}
      </div>

      <!-- 1. VERY BIG WARNING AT THE TOP -->
      <div class="top-warning-container">
        <div class="warning-symbols-row">
          <svg viewBox="0 0 100 88" class="warning-triangle-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 6 L 93 79 C 95 83 92 87 87 87 L 13 87 C 8 87 5 83 7 79 L 50 6 Z" fill="#FBBF24" stroke="#000000" stroke-width="7" stroke-linejoin="round" />
            <path d="M 50 28 L 50 56" stroke="#000000" stroke-width="7.5" stroke-linecap="round" />
            <circle cx="50" cy="71" r="4.5" fill="#000000" />
          </svg>

          <svg viewBox="0 0 24 24" class="fragile-glass-svg" fill="none" stroke="#000000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M8 22h8M19 3v4c0 3.31-2.69 6-6 6h-2c-3.31 0-6-2.69-6-6V3h14zM12 13v9" />
            <path d="M9 7l2 3-2 3" />
          </svg>
        </div>

        <div class="warning-text-headline">
          ${data.warningText || "ប្រយ័ត្នបាក់បែក ឬ សើម"}
        </div>
        <div class="warning-sub-en">
          Fragile Tech Package • Handle With Care
        </div>
      </div>

      <!-- 2. SENDER PHONE NUMBER (DIRECTLY ON TOP OF RECEIVER) -->
      ${data.senderPhone ? `
        <div class="sender-above-receiver">
          <span style="font-size: 0.72em; text-transform: uppercase; color: #475569; letter-spacing: 1px; margin-right: 8px;">អ្នកផ្ញើរ / SENDER:</span>
          <span style="font-family: 'Plus Jakarta Sans', monospace, sans-serif; font-weight: 900; letter-spacing: 1.5px;">${data.senderPhone}</span>
        </div>
      ` : ""}

      <!-- 3. RECEIVER SECTION -->
      <div class="receiver-main-card">
        <div class="receiver-badge-label">
          📍 លេខអ្នកទទួល / Recipient Phone
        </div>
        
        <div class="receiver-phone-huge">
          ${data.receiverPhone || "— — —"}
        </div>

        <div class="receiver-destination">
          ${(() => {
            const hasCity = !!(data.city && data.city.trim());
            const hasBranch = !!(data.branch && data.branch.trim());
            if (!hasCity && !hasBranch) return "<span>Phnom Penh</span>";
            if (hasCity && hasBranch) {
              const lowerCity = data.city.toLowerCase().trim();
              const lowerBranch = data.branch.toLowerCase().trim();
              if (lowerBranch.includes(lowerCity)) {
                return `<span class="branch-part">${data.branch}</span>`;
              }
              if (data.singleLineLocation !== false) {
                return `<span class="city-part">${data.city}</span><span class="loc-sep">—</span><span class="branch-part">${data.branch}</span>`;
              }
              return `<div><span class="city-part">${data.city}</span></div><div style="margin-top: 2px;"><span class="branch-part">${data.branch}</span></div>`;
            }
            return `<span class="branch-part">${data.branch || data.city}</span>`;
          })()}
        </div>
      </div>

      <!-- 4. COD STRIP IF ACTIVE -->
      ${data.showCod && data.codAmount ? `
        <div class="cod-banner-row">
          <div class="cod-banner-label">💰 ប្រមូលប្រាក់ / COD:</div>
          <div class="cod-banner-amount">${data.codAmount}</div>
        </div>
      ` : ""}

      <!-- 5. BOTTOM DETAILS & STORE SEAL -->
      <div class="bottom-meta-row">
        <div>
          🛡️ Store Verified Delivery Seal
        </div>

        <div>
          ${data.showCustomerName && data.customerName ? `<span>អតិថិជន: ${data.customerName}</span>` : ""}
          ${data.showOrderId && data.orderId ? `<span style="margin-left: 8px;">Order: ${data.orderId}</span>` : ""}
        </div>

        <div>
          ${data.showItems && data.itemsSummary ? `<span>ទំនិញ: ${data.itemsSummary}</span>` : `<span>Fragile Dispatch</span>`}
        </div>
      </div>
    </div>
  </div>

  <script>
    function triggerPrint() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          setTimeout(function() {
            window.focus();
            try { window.print(); } catch(e) {}
          }, 200);
        });
      } else {
        setTimeout(function() {
          window.focus();
          try { window.print(); } catch(e) {}
        }, 400);
      }
    }
    window.addEventListener("load", triggerPrint);
  </script>
</body>
</html>`;
}

/**
 * Universal print helper for A5 package label with font preloading and sync
 */
export function printA5PackageLabel(data: PackageLabelPrintData, mode: "auto" | "window" = "auto"): void {
  const html = buildPackageLabelHtml(data);
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (mode === "window" || isMobile) {
    try {
      const win = window.open("", "_blank");
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        return;
      }
    } catch (err) {
      console.warn("window.open failed, trying iframe fallback:", err);
    }
  }

  const existingFrame = document.getElementById("a5-package-label-print-frame");
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement("iframe");
  iframe.id = "a5-package-label-print-frame";
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  let printExecuted = false;
  const executePrint = () => {
    if (printExecuted) return;
    printExecuted = true;

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn("Direct iframe print failed, trying window.open fallback:", err);
      try {
        const win = window.open("", "_blank");
        if (win) {
          win.document.open();
          win.document.write(html);
          win.document.close();
        }
      } catch (e2) {
        toast.error("Could not trigger print dialog. Please allow popups.");
      }
    }

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 6000);
  };

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    const iframeWindow = iframe.contentWindow as any;
    if (iframeWindow && iframeWindow.document && iframeWindow.document.fonts) {
      iframeWindow.document.fonts.ready.then(() => {
        setTimeout(executePrint, 250);
      }).catch(() => {
        setTimeout(executePrint, 400);
      });
    } else {
      setTimeout(executePrint, 450);
    }
  }
}

interface PackageLabelA5DialogProps {
  order?: AdminOrder | null;
  initialData?: Partial<PackageLabelPrintData>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PackageLabelA5Dialog = ({ order, initialData, open, onOpenChange }: PackageLabelA5DialogProps) => {
  const [warningText, setWarningText] = useState("ប្រយ័ត្នបាក់បែក ឬ សើម");
  const [senderPhone, setSenderPhone] = useState("087 75 3939");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [city, setCity] = useState("Phnom Penh");
  const [branch, setBranch] = useState("");
  const [courier, setCourier] = useState("None");
  const [customerName, setCustomerName] = useState("");
  const [orderId, setOrderId] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [itemsSummary, setItemsSummary] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [paperSize, setPaperSize] = useState<"a5" | "a4" | "thermal_100x150" | "thermal_76x130">("a5");
  const [smartPasteText, setSmartPasteText] = useState("");

  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const hasUserEditedRef = useRef(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const receiverPhoneInputRef = useRef<HTMLInputElement>(null);

  const [showCustomerName, setShowCustomerName] = useState(false);
  const [showOrderId, setShowOrderId] = useState(false);
  const [showCod, setShowCod] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [singleLineLocation, setSingleLineLocation] = useState(true);

  const applyOrderData = useCallback((orderToUse: AdminOrder, fromApi = false) => {
    const phone = resolveCustomerPhone(orderToUse);
    if (phone) {
      setReceiverPhone(phone);
    }

    const name = orderToUse.customer?.full_name || orderToUse.user?.full_name || (orderToUse as any).customer_name || "";
    if (name) {
      setCustomerName(name);
    }

    const formattedId = `#${orderToUse.id.slice(0, 8).toUpperCase()}`;
    setOrderId(formattedId);

    const rawAddress = resolveCustomerAddress(orderToUse);
    const parsedLoc = parseCustomerLocation(rawAddress, orderToUse.notes);

    setCity(parsedLoc.city);
    setBranch(parsedLoc.branch);

    if (parsedLoc.detectedCourier) {
      setCourier(parsedLoc.detectedCourier);
    }

    const isUnpaid = orderToUse.status !== "paid" && orderToUse.status !== "cancelled";
    if (isUnpaid) {
      const amt = typeof orderToUse.amount === "string" ? parseFloat(orderToUse.amount) : orderToUse.amount;
      const paid = (orderToUse.payments || []).reduce((s: number, p: any) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
      const remaining = Math.max(0, amt - paid);
      if (remaining > 0) {
        setCodAmount(`$${remaining.toFixed(2)}`);
      } else {
        setCodAmount("");
      }
    } else {
      setCodAmount("");
    }

    if (orderToUse.items && orderToUse.items.length > 0) {
      setItemsSummary(orderToUse.items.map(i => `${i.product_name} ×${i.quantity}`).join(", "));
    } else if (orderToUse.product_name) {
      setItemsSummary(orderToUse.product_name);
    }

    if (fromApi) {
      toast.success(`Synced customer info from Invoice ${formattedId}`);
    }
  }, []);

  const syncFromApi = useCallback(async (targetOrderId: string, force = false) => {
    if (!targetOrderId) return;
    if (hasUserEditedRef.current && !force) {
      return;
    }
    setIsLoadingDetail(true);
    try {
      const res = await adminUsersApi.getOrderDetail(targetOrderId);
      if (res?.order) {
        applyOrderData(res.order, force);
      }
    } catch (err) {
      console.warn("Could not fetch detailed order:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [applyOrderData]);

  useEffect(() => {
    if (!open) return;
    hasUserEditedRef.current = false;
    setMobileTab("edit");

    getInvoiceBranding().then(b => {
      if (b.support_phone?.trim()) {
        setSenderPhone(b.support_phone.trim());
      } else {
        setSenderPhone("087 75 3939");
      }
    }).catch(() => {
      setSenderPhone("087 75 3939");
    });

    if (initialData) {
      if (initialData.warningText) setWarningText(initialData.warningText);
      if (initialData.senderPhone) setSenderPhone(initialData.senderPhone);
      if (initialData.receiverPhone) setReceiverPhone(initialData.receiverPhone);

      if (initialData.city) {
        setCity(initialData.city);
        if (initialData.branch) setBranch(initialData.branch);
      } else if (initialData.branch) {
        const parsed = parseCustomerLocation(initialData.branch);
        setCity(parsed.city);
        setBranch(parsed.branch);
        if (parsed.detectedCourier && !initialData.courier) {
          setCourier(parsed.detectedCourier);
        }
      }

      if (initialData.courier) setCourier(initialData.courier);
      if (initialData.customerName) setCustomerName(initialData.customerName);
      if (initialData.orderId) setOrderId(initialData.orderId);
      if (initialData.codAmount) {
        setCodAmount(initialData.codAmount);
        setShowCod(true);
      }
      if (initialData.itemsSummary) {
        setItemsSummary(initialData.itemsSummary);
        setShowItems(true);
      }
      if (initialData.paperSize) setPaperSize(initialData.paperSize);
      return;
    }

    if (!order) return;

    applyOrderData(order, false);

    if (order.id) {
      syncFromApi(order.id, false);
    }
  }, [order, initialData, open, applyOrderData, syncFromApi]);

  const handleSmartPaste = (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    hasUserEditedRef.current = true;
    const trimmed = rawText.trim();

    const phoneMatch = trimmed.match(/(?:(?:\+?855|0)[1-9][0-9\s\-]{6,12})/);
    if (phoneMatch) {
      const cleanPhone = phoneMatch[0].replace(/[\s\-]/g, '');
      setReceiverPhone(cleanPhone);
    }

    const parsed = parseCustomerLocation(trimmed);
    if (parsed.city) setCity(parsed.city);
    if (parsed.branch) setBranch(parsed.branch);
    if (parsed.detectedCourier) setCourier(parsed.detectedCourier);

    toast.success("Customer data parsed & auto-filled!");
    setSmartPasteText("");
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleSmartPaste(text);
      } else {
        toast.error("Clipboard is empty");
      }
    } catch {
      toast.error("Please paste directly into the box");
    }
  };

  const handleClearForm = () => {
    hasUserEditedRef.current = true;
    setReceiverPhone("");
    setCity("Phnom Penh");
    setBranch("");
    setCourier("None");
    setCustomerName("");
    setCodAmount("");
    setSmartPasteText("");
    toast.info("Cleared fields for next entry");
    receiverPhoneInputRef.current?.focus();
  };

  const getSnapshotData = (): PackageLabelPrintData => ({
    warningText,
    senderPhone,
    receiverPhone,
    city,
    branch,
    customerName,
    orderId,
    courier,
    codAmount,
    itemsSummary,
    showCustomerName,
    showOrderId,
    showCod,
    showItems,
    singleLineLocation,
    logoUrl: REALTECH_LOGO_DATA_URI,
    siteName: "REALTECH",
    paperSize,
  });

  const handlePrint = (mode: "auto" | "window" = "auto") => {
    printA5PackageLabel(getSnapshotData(), mode);
    toast.success(mode === "window" ? "Opening label in new tab..." : "Opening print dialog...");
  };

  const handleDownloadPdf = async () => {
    const target = exportContainerRef.current || previewRef.current;
    if (!target) {
      toast.error("Preview not ready");
      return;
    }
    setIsExportingPdf(true);
    toast.info("Generating high-resolution A5 PDF...");
    try {
      await new Promise(r => setTimeout(r, 150));

      const canvas = await html2canvas(target, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      let pdfWidth = 148;
      let pdfHeight = 210;
      if (paperSize === "a4") {
        pdfWidth = 210;
        pdfHeight = 297;
      } else if (paperSize === "thermal_100x150") {
        pdfWidth = 100;
        pdfHeight = 150;
      } else if (paperSize === "thermal_76x130") {
        pdfWidth = 76;
        pdfHeight = 130;
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const cleanPhone = (receiverPhone || "").replace(/[^0-9]/g, "");
      const fileName = `Package_Label_${cleanPhone || city || "A5"}.pdf`;
      pdf.save(fileName);
      toast.success(`PDF downloaded: ${fileName}`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("PDF download fallback: opening print window to save as PDF");
      handlePrint("window");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      size="5xl"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 pr-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Package className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-foreground block leading-tight">
                Print A5 Package Label
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                High-Impact Logistics Dispatch Label
              </span>
            </div>
          </div>
          {order?.id && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground border-border/80 bg-background/50">
                Invoice #{order.id.slice(0, 8).toUpperCase()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => syncFromApi(order.id, true)}
                disabled={isLoadingDetail}
                title="Force re-sync info from invoice database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetail ? "animate-spin text-amber-500" : ""}`} />
                <span>{isLoadingDetail ? "Syncing..." : "Re-sync"}</span>
              </Button>
            </div>
          )}
        </div>
      }
      description="Official Realtech logo on top, giant caution symbols & sender phone right on top of receiver"
    >
      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden items-center p-1 bg-muted/70 rounded-xl mb-4 border border-border">
        <button
          type="button"
          onClick={() => setMobileTab("edit")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mobileTab === "edit"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Information
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mobileTab === "preview"
              ? "bg-background text-foreground shadow-xs font-bold text-amber-600 dark:text-amber-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview Label
          {receiverPhone && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className={`lg:col-span-6 space-y-4 ${mobileTab === "edit" ? "block" : "hidden lg:block"}`}>
          {/* Paper Size Selector */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                Paper Format & Standard
              </Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {paperSize === "a4" ? "210 × 297 mm" : paperSize === "thermal_100x150" ? "100 × 150 mm" : paperSize === "thermal_76x130" ? "76 × 130 mm" : "148 × 210 mm"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: "a5", label: "A5 Standard", sub: "Most Popular" },
                { id: "a4", label: "A4 Full Sheet", sub: "Standard Desk" },
                { id: "thermal_100x150", label: "100×150 mm", sub: "Thermal Box" },
                { id: "thermal_76x130", label: "76×130 mm", sub: "Thermal Roll" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaperSize(p.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paperSize === p.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold shadow-2xs ring-1 ring-amber-500/30"
                      : "border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-xs">{p.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{p.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Auto-fill */}
          <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                Quick Customer Auto-Fill
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Paste Clipboard
                </button>
                <span className="text-border">•</span>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-[11px] text-destructive hover:underline font-semibold cursor-pointer"
                >
                  Clear Form
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={smartPasteText}
                onChange={(e) => setSmartPasteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSmartPaste(smartPasteText);
                  }
                }}
                placeholder="Paste customer phone, address, or branch note..."
                className="text-xs h-9 bg-background"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 px-3 text-xs shrink-0 font-semibold cursor-pointer"
                onClick={() => handleSmartPaste(smartPasteText)}
              >
                Auto-fill
              </Button>
            </div>
          </div>

          {/* Warning Headline */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Top Warning Text (អក្សរប្រយ័ត្នធំផ្នែកខាងលើ)
            </Label>
            <Input
              value={warningText}
              onChange={(e) => {
                hasUserEditedRef.current = true;
                setWarningText(e.target.value);
              }}
              placeholder="ប្រយ័ត្នបាក់បែក ឬ សើម"
              className="font-medium text-sm h-9"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {WARNING_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    hasUserEditedRef.current = true;
                    setWarningText(preset);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    warningText === preset
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200 font-bold"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Sender Phone (Positioned directly above receiver) */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Sender Phone (លេខអ្នកផ្ញើរ - Directly above Receiver)
              </Label>
              <button
                type="button"
                onClick={() => {
                  hasUserEditedRef.current = true;
                  setSenderPhone("087 75 3939");
                }}
                className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-semibold cursor-pointer"
              >
                Set: 087 75 3939
              </button>
            </div>
            <Input
              value={senderPhone}
              onChange={(e) => {
                hasUserEditedRef.current = true;
                setSenderPhone(e.target.value);
              }}
              placeholder="e.g. 087 75 3939"
              className="font-mono text-base font-bold text-foreground h-10 bg-background"
            />
          </div>

          {/* Recipient Phone (Primary Focus) */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Recipient Phone (លេខអ្នកទទួល)
              </Label>
              {receiverPhone && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Live Synced
                </span>
              )}
            </div>
            <Input
              ref={receiverPhoneInputRef}
              value={receiverPhone}
              onChange={(e) => {
                hasUserEditedRef.current = true;
                setReceiverPhone(e.target.value);
              }}
              placeholder="e.g. 069696397"
              className="font-mono text-base font-bold text-foreground tracking-wider h-10 bg-background"
            />
            {!receiverPhone && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" /> Enter recipient phone to appear in big font on label
              </p>
            )}
          </div>

          {/* City / Province */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Destination Province / City (ខេត្ត / ក្រុង)
              </Label>
              <span className="text-[10px] text-muted-foreground">Quick select or type</span>
            </div>
            <Input
              value={city}
              onChange={(e) => {
                hasUserEditedRef.current = true;
                setCity(e.target.value);
              }}
              placeholder="e.g. Phnom Penh, Sihanoukville, Siem Reap..."
              className="font-semibold text-sm h-9"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {POPULAR_PROVINCES.map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => {
                    hasUserEditedRef.current = true;
                    setCity(prov);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    city.toLowerCase() === prov.toLowerCase()
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Branch / Address */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                Branch / Depot / Street (សាខា / ឃ្លាំង / ទីតាំងទទួល)
              </Label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <span className="text-[11px] text-muted-foreground font-medium">Keep on 1 line:</span>
                <Switch
                  checked={singleLineLocation}
                  onCheckedChange={setSingleLineLocation}
                  className="scale-75 origin-right"
                />
              </label>
            </div>
            <Input
              value={branch}
              onChange={(e) => {
                hasUserEditedRef.current = true;
                setBranch(e.target.value);
              }}
              placeholder="e.g. Khan Toul Kork, St 271 / ឃ្លាំងឯករាជ្យ / ផ្សារលើ..."
              className="font-medium text-sm h-9"
            />
          </div>

          {/* Courier Service */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <Truck className="w-3.5 h-3.5 text-indigo-500" />
              Courier Service (ក្រុមហ៊ុនដឹកជញ្ជូន)
            </Label>
            <Select
              value={courier}
              onValueChange={(val) => {
                hasUserEditedRef.current = true;
                setCourier(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select courier" />
              </SelectTrigger>
              <SelectContent>
                {COURIER_PRESETS.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs font-medium">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Options */}
          <div className="border border-border/80 rounded-xl p-3.5 bg-muted/20 space-y-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Optional Package Details
            </span>

            {/* COD Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="toggle-cod" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  COD / Collect on Delivery (ប្រមូលប្រាក់)
                </Label>
                {showCod && (
                  <Input
                    value={codAmount}
                    onChange={(e) => {
                      hasUserEditedRef.current = true;
                      setCodAmount(e.target.value);
                    }}
                    placeholder="e.g. $35.00"
                    className="h-8 text-xs font-mono font-bold mt-1.5 w-36"
                  />
                )}
              </div>
              <Switch id="toggle-cod" checked={showCod} onCheckedChange={setShowCod} />
            </div>

            {/* Customer Name Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="space-y-0.5">
                <Label htmlFor="toggle-name" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Show Customer Name
                </Label>
                {showCustomerName && (
                  <Input
                    value={customerName}
                    onChange={(e) => {
                      hasUserEditedRef.current = true;
                      setCustomerName(e.target.value);
                    }}
                    placeholder="Customer full name"
                    className="h-8 text-xs mt-1.5 w-48"
                  />
                )}
              </div>
              <Switch id="toggle-name" checked={showCustomerName} onCheckedChange={setShowCustomerName} />
            </div>

            {/* Order # Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="space-y-0.5">
                <Label htmlFor="toggle-orderid" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  Show Order Reference #
                </Label>
                {showOrderId && (
                  <Input
                    value={orderId}
                    onChange={(e) => {
                      hasUserEditedRef.current = true;
                      setOrderId(e.target.value);
                    }}
                    placeholder="#ORD-..."
                    className="h-8 text-xs font-mono mt-1.5 w-36"
                  />
                )}
              </div>
              <Switch id="toggle-orderid" checked={showOrderId} onCheckedChange={setShowOrderId} />
            </div>

            {/* Items Summary Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div className="space-y-0.5">
                <Label htmlFor="toggle-items" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  Show Package Content / Items
                </Label>
                {showItems && (
                  <Input
                    value={itemsSummary}
                    onChange={(e) => {
                      hasUserEditedRef.current = true;
                      setItemsSummary(e.target.value);
                    }}
                    placeholder="e.g. MacBook Pro M2, Arzopa Monitor"
                    className="h-8 text-xs mt-1.5 w-56"
                  />
                )}
              </div>
              <Switch id="toggle-items" checked={showItems} onCheckedChange={setShowItems} />
            </div>
          </div>
        </div>

        {/* Right Column: Live Sheet Preview */}
        <div className={`lg:col-span-6 flex flex-col items-center justify-between bg-slate-100/70 dark:bg-slate-900/40 p-3.5 sm:p-5 rounded-2xl border border-border/80 w-full ${mobileTab === "preview" ? "flex" : "hidden lg:flex"}`}>
          {/* Preview Header */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Live Realistic Sheet Preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border/60">
                {paperSize === "a4" ? "A4 (210×297mm)" : paperSize === "thermal_100x150" ? "100×150mm" : paperSize === "thermal_76x130" ? "76×130mm" : "A5 (148×210mm)"}
              </span>
            </div>
          </div>

          {/* Physical Sheet Simulation Container */}
          <div className="w-full flex items-center justify-center py-2 overflow-x-auto">
            <div
              ref={previewRef}
              className={`w-full max-w-[340px] sm:max-w-[375px] ${
                paperSize === "a4" ? "aspect-[1/1.414]" : paperSize === "thermal_100x150" ? "aspect-[10/15]" : paperSize === "thermal_76x130" ? "aspect-[76/130]" : "aspect-[1/1.414]"
              } bg-white text-black shadow-2xl rounded-xl border-3 border-black p-3.5 sm:p-4.5 flex flex-col justify-between text-center select-none overflow-hidden my-auto transition-all`}
              style={{
                fontFamily: "'Kantumruy Pro', 'Plus Jakarta Sans', -apple-system, sans-serif",
              }}
            >
              {/* 0. BRAND LOGO ON TOP & COURIER TAG */}
              <div className="w-full flex items-center justify-between border-b-2 border-black pb-2 mb-1.5 shrink-0">
                <div className="flex flex-col items-start text-left">
                  <img
                    src={REALTECH_LOGO_DATA_URI}
                    alt="Realtech Logo"
                    className="h-8 sm:h-9 w-auto max-w-[190px] object-contain"
                  />
                  <span className="text-[7.5px] sm:text-[8px] font-extrabold text-slate-700 uppercase tracking-widest mt-0.5">
                    MacBook & Monitor Specialist
                  </span>
                </div>

                <div className="flex flex-col items-end text-right">
                  {courier && courier !== "None" ? (
                    <span className="border-2 border-black bg-black text-white px-2.5 py-0.5 rounded text-[10.5px] sm:text-[11.5px] font-black uppercase tracking-wider shadow-2xs">
                      {courier}
                    </span>
                  ) : (
                    <span className="border border-black bg-slate-100 text-black px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider">
                      Express Parcel
                    </span>
                  )}
                  <span className="text-[7.5px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                    Store Dispatch
                  </span>
                </div>
              </div>

              {/* 1. VERY BIG WARNING AT THE TOP */}
              <div className="w-full flex flex-col items-center justify-center border-b-2 border-black pb-2 mb-1 shrink-0 bg-amber-50/70 border border-amber-300 rounded-lg p-2">
                {/* Big Warning Symbols */}
                <div className="flex items-center justify-center gap-3.5 my-0.5 shrink-0">
                  <WarningTriangleSvg className="w-22 h-18 sm:w-26 sm:h-22 drop-shadow-sm" />
                  <FragileGlassSvg className="w-11 h-11 sm:w-13 sm:h-13 text-black drop-shadow-xs" />
                </div>

                {/* Big Warning Headline */}
                <div className="font-black text-[17px] sm:text-[20px] text-amber-950 leading-tight tracking-wide px-1">
                  {warningText || "ប្រយ័ត្នបាក់បែក ឬ សើម"}
                </div>
                <div className="text-[8.5px] sm:text-[9.5px] font-black text-amber-900 uppercase tracking-widest mt-0.5">
                  Fragile Tech Package • Handle With Utmost Care
                </div>
              </div>

              {/* 2. SENDER PHONE NUMBER (DIRECTLY ON TOP OF RECEIVER) */}
              {senderPhone && (
                <div className="w-full text-center py-1.5 my-1 bg-slate-50 border-y-2 border-dashed border-black text-black font-black text-[13px] sm:text-[15px] tracking-normal shrink-0 flex items-center justify-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-700">អ្នកផ្ញើរ / Sender:</span>
                  <span className="font-mono text-[15px] sm:text-[17px] text-black tracking-wide font-black">{senderPhone}</span>
                </div>
              )}

              {/* 3. RECEIVER SECTION */}
              <div className="border-3 border-black rounded-xl p-2.5 sm:p-3 my-1 bg-white shadow-xs text-center flex flex-col justify-center flex-1">
                <div className="text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-wider text-blue-700 flex items-center justify-center gap-1 mb-0.5">
                  <Phone className="w-3 h-3" />
                  លេខអ្នកទទួល / Recipient Phone
                </div>

                <div className="font-black text-[27px] sm:text-[33px] tracking-widest text-black font-sans my-0.5 whitespace-nowrap overflow-hidden text-ellipsis leading-none">
                  {receiverPhone || "000 000 000"}
                </div>

                {/* Location */}
                {(city || branch) && (
                  <div className="font-black text-[15px] sm:text-[18px] text-black leading-snug px-1 mt-0.5 max-w-full">
                    {city && branch && !branch.toLowerCase().includes(city.toLowerCase()) ? (
                      singleLineLocation ? (
                        <div className="flex items-center justify-center gap-1.5 truncate">
                          <span className="font-extrabold text-blue-950">{city}</span>
                          <span className="text-neutral-400 font-normal">—</span>
                          <span className="font-black text-black">{branch}</span>
                        </div>
                      ) : (
                        <>
                          <div className="font-extrabold text-[13px] text-blue-950">{city}</div>
                          <div className="font-black text-[16px] text-black">{branch}</div>
                        </>
                      )
                    ) : (
                      <div className="truncate font-black text-black">{branch || city}</div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. COD BADGE IF ACTIVE */}
              {showCod && codAmount && (
                <div className="bg-black text-white px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] sm:text-[12px] font-black my-1 shrink-0 shadow-xs">
                  <span className="text-amber-300">ប្រមូលប្រាក់ / COD:</span>
                  <span className="font-mono text-[15px] text-amber-300 font-black">{codAmount}</span>
                </div>
              )}

              {/* 5. FOOTER DETAILS & STORE BRAND */}
              {(showCustomerName || showOrderId || (showItems && itemsSummary)) ? (
                <div className="w-full pt-1.5 mt-0.5 border-t-2 border-black text-[9.5px] font-bold text-left space-y-0.5 shrink-0">
                  {showCustomerName && customerName && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">អតិថិជន:</span>
                      <span className="font-black text-black">{customerName}</span>
                    </div>
                  )}
                  {showOrderId && orderId && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">វិក្កយបត្រ:</span>
                      <span className="font-mono font-black text-black">{orderId}</span>
                    </div>
                  )}
                  {showItems && itemsSummary && (
                    <div className="flex justify-between truncate">
                      <span className="text-neutral-600">ទំនិញ:</span>
                      <span className="font-black text-black truncate max-w-[200px]">{itemsSummary}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full pt-1.5 mt-0.5 border-t-2 border-black flex items-center justify-between text-[8.5px] font-bold text-slate-800 shrink-0">
                  <span>🛡️ Realtech Store Certified Dispatch</span>
                  <span className="font-mono text-slate-500">Phnom Penh, Cambodia</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full text-center text-[11px] text-muted-foreground mt-2">
            Top Logo & Branding • Very Big Warning Symbols • Sender Phone on top of Receiver
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="w-full flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 mt-4 border-t border-border/80">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer font-medium"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* New Tab View */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex-1 sm:flex-initial"
            onClick={() => handlePrint("window")}
            title="Open in dedicated browser window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Tab</span>
          </Button>

          {/* Download PDF button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isExportingPdf}
            className="gap-2 text-xs font-bold cursor-pointer flex-1 sm:flex-initial shadow-xs"
            onClick={handleDownloadPdf}
            title="Download high-resolution A5 PDF directly"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Download className="w-3.5 h-3.5 text-primary" />
            )}
            <span>{isExportingPdf ? "Generating..." : "Download PDF"}</span>
          </Button>

          {/* Print Label to Printer */}
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold shadow-sm cursor-pointer flex-1 sm:flex-initial"
            onClick={() => handlePrint("auto")}
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </Button>
        </div>
      </div>

      {/* Dedicated offscreen container for pixel-perfect PDF export (renders regardless of active mobile tab or window scale) */}
      <div
        ref={exportContainerRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: paperSize === "a4" ? "794px" : paperSize === "thermal_100x150" ? "378px" : paperSize === "thermal_76x130" ? "287px" : "560px",
          minHeight: paperSize === "a4" ? "1123px" : paperSize === "thermal_100x150" ? "567px" : paperSize === "thermal_76x130" ? "491px" : "792px",
          background: "#ffffff",
          color: "#000000",
          zIndex: -9999,
          pointerEvents: "none",
          padding: "16px",
          boxSizing: "border-box",
          fontFamily: "'Kantumruy Pro', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            border: "4px solid #000000",
            borderRadius: "14px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
            background: "#ffffff",
            textAlign: "center",
          }}
        >
          {/* 0. Brand Logo on Top */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "2px solid #000000",
              paddingBottom: "10px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
              <img
                src={REALTECH_LOGO_DATA_URI}
                alt="REALTECH"
                style={{ height: "42px", width: "auto", objectFit: "contain" }}
              />
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginTop: "2px",
                }}
              >
                MacBook & Portable Monitor Specialist
              </span>
            </div>
            <div
              style={{
                border: "2px solid #000000",
                background: "#000000",
                color: "#ffffff",
                padding: "4px 14px",
                borderRadius: "6px",
                fontWeight: 900,
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {courier && courier !== "None" ? courier : "EXPRESS DISPATCH"}
            </div>
          </div>

          {/* 1. Very Big Warning at the Top */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#fffbeb",
              border: "2px dashed #f59e0b",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "22px", marginBottom: "4px" }}>
              <WarningTriangleSvg className="w-24 h-20" />
              <FragileGlassSvg className="w-14 h-14 text-black" />
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#000000", lineHeight: 1.2 }}>
              {warningText || "ប្រយ័ត្នបាក់បែក ឬ សើម"}
            </div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#b45309",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginTop: "2px",
              }}
            >
              Fragile Tech Package • Handle With Utmost Care
            </div>
          </div>

          {/* 2. Sender Phone Number (Directly on top of receiver) */}
          {senderPhone && (
            <div
              style={{
                width: "100%",
                textAlign: "center",
                padding: "8px 0",
                borderTop: "2px dashed #000000",
                borderBottom: "2px dashed #000000",
                fontSize: "18px",
                fontWeight: 900,
                color: "#000000",
                background: "#f8fafc",
                borderRadius: "6px",
                margin: "6px 0",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginRight: "8px", letterSpacing: "1px" }}>
                អ្នកផ្ញើរ / SENDER:
              </span>
              <span style={{ fontFamily: "'Plus Jakarta Sans', monospace, sans-serif", fontSize: "20px", fontWeight: 900, letterSpacing: "1.5px" }}>
                {senderPhone}
              </span>
            </div>
          )}

          {/* 3. Receiver Section */}
          <div
            style={{
              border: "3px solid #000000",
              borderRadius: "12px",
              padding: "14px",
              margin: "6px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "#1d4ed8",
                marginBottom: "4px",
              }}
            >
              📍 លេខអ្នកទទួល / RECIPIENT PHONE
            </div>
            <div
              style={{
                fontSize: "38px",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "2.5px",
                color: "#000000",
                fontFamily: "'Plus Jakarta Sans', monospace, sans-serif",
                margin: "4px 0",
                whiteSpace: "nowrap",
              }}
            >
              {receiverPhone || "— — —"}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: "#000000", marginTop: "6px" }}>
              {city && branch ? `${city} — ${branch}` : (branch || city || "Phnom Penh")}
            </div>
          </div>

          {/* 4. COD */}
          {showCod && codAmount && (
            <div
              style={{
                background: "#000000",
                color: "#ffffff",
                padding: "10px 18px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                margin: "6px 0",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "1px" }}>💰 ប្រមូលប្រាក់ / COD:</span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#fde047",
                  fontFamily: "'Plus Jakarta Sans', monospace, sans-serif",
                }}
              >
                {codAmount}
              </span>
            </div>
          )}

          {/* 5. Bottom Meta */}
          <div
            style={{
              borderTop: "2px solid #000000",
              paddingTop: "8px",
              marginTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            <span>🛡️ Realtech Store Certified Dispatch</span>
            {customerName && <span>អតិថិជន: {customerName}</span>}
            {orderId && <span>Order: {orderId}</span>}
          </div>
        </div>
      </div>
    </AdminDialog>
  );
};
