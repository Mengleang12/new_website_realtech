import JsBarcode from "jsbarcode";
import { initPrinterService, printLabels as printLabelsSDK, type PrinterStatus, type LabelData } from "./printer-service";
import { getGlobalLabelSize } from "./label-settings";

export interface UniversalLabelItem {
  name: string;
  variant?: string;
  barcode: string;
  serial?: string;
  price: number;
  sku?: string;
  quantity?: number;
}

export interface PrintUniversalOptions {
  printerName?: string;
  labelWidth: number;   // mm, e.g. 40
  labelHeight: number;  // mm, e.g. 30
  labels: UniversalLabelItem[];
  preferSDK?: boolean;
}

/**
 * Generate a standalone printable HTML string for labels with SVG barcodes
 */
export function generatePrintableLabelsHTML(
  labels: UniversalLabelItem[],
  widthMm: number,
  heightMm: number,
  storeName: string = "REALTECH COMPUTER"
): string {
  // Expand quantities
  const expanded: UniversalLabelItem[] = [];
  labels.forEach((item) => {
    const qty = Math.max(1, item.quantity || 1);
    for (let i = 0; i < qty; i++) {
      expanded.push(item);
    }
  });

  // Generate SVG barcodes in memory
  const labelsHtml = expanded
    .map((item, idx) => {
      // Create SVG barcode
      let barcodeSvgHtml = "";
      try {
        const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        JsBarcode(tempSvg, item.barcode || item.serial || "000000", {
          format: "CODE128",
          width: widthMm < 35 ? 1.0 : 1.25,
          height: heightMm < 25 ? 18 : 26,
          displayValue: true,
          fontSize: 8,
          textMargin: 1,
          margin: 1,
          font: "Arial, sans-serif",
          textPosition: "bottom",
        });
        barcodeSvgHtml = tempSvg.outerHTML;
      } catch (e) {
        barcodeSvgHtml = `<div style="font-family: monospace; font-size: 9px; font-weight: bold; border: 1px dashed #999; padding: 2px;">${item.barcode}</div>`;
      }

      const formattedPrice = item.price > 0 ? `$${Number(item.price).toFixed(2)}` : "";
      const isCompact = heightMm <= 20;

      return `
      <div class="label-page" style="width: ${widthMm}mm; height: ${heightMm}mm;">
        <div class="label-inner">
          <div class="label-header">
            <span class="store-name">${storeName}</span>
          </div>

          <div class="product-title" title="${escapeHtml(item.name)}">
            ${escapeHtml(item.name)}
          </div>

          ${item.variant ? `<div class="product-variant">${escapeHtml(item.variant)}</div>` : ""}

          <div class="barcode-container">
            ${barcodeSvgHtml}
          </div>

          <div class="label-footer">
            ${item.serial ? `<span class="serial-text">SN: ${escapeHtml(item.serial)}</span>` : item.sku ? `<span class="serial-text">SKU: ${escapeHtml(item.sku)}</span>` : "<span></span>"}
            ${formattedPrice ? `<span class="price-tag">${formattedPrice}</span>` : ""}
          </div>
        </div>
      </div>
    `;
    })
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print Labels - ${storeName}</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .label-page {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      max-width: ${widthMm}mm;
      max-height: ${heightMm}mm;
      page-break-after: always;
      page-break-inside: avoid;
      break-after: page;
      break-inside: avoid;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 1mm 1.5mm;
      background: #ffffff;
    }
    .label-inner {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      overflow: hidden;
    }
    .label-header {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 1;
      padding-top: 0.5mm;
    }
    .store-name {
      font-size: 6.5pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #111111;
      text-transform: uppercase;
    }
    .product-title {
      width: 100%;
      font-size: 7.5pt;
      font-weight: 700;
      line-height: 1.15;
      max-height: 2.3em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
      color: #000000;
    }
    .product-variant {
      font-size: 6pt;
      font-weight: 600;
      color: #333333;
      line-height: 1;
      margin-top: 0.3mm;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .barcode-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0.3mm 0;
    }
    .barcode-container svg {
      max-width: 95%;
      height: auto;
      max-height: ${Math.max(16, heightMm * 0.9)}px;
      display: block;
    }
    .label-footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-bottom: 0.5mm;
      line-height: 1;
    }
    .serial-text {
      font-size: 5.5pt;
      font-family: "SFMono-Regular", Consolas, Menlo, Monaco, monospace;
      color: #222222;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 55%;
    }
    .price-tag {
      font-size: 8pt;
      font-weight: 900;
      color: #000000;
      margin-left: auto;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }
      .label-page {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border: 1px solid #cbd5e1;
        border-radius: 4px;
      }
    }
  </style>
</head>
<body>
  ${labelsHtml}
</body>
</html>
  `.trim();
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Trigger universal browser print dialog for labels
 */
export function printLabelsBrowser(
  labels: UniversalLabelItem[],
  options: { width: number; height: number; storeName?: string }
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const html = generatePrintableLabelsHTML(
        labels,
        options.width,
        options.height,
        options.storeName || "REALTECH COMPUTER"
      );

      // Create an invisible iframe for printing
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        // Fallback to new window
        const win = window.open("", "_blank");
        if (win) {
          win.document.open();
          win.document.write(html);
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
            resolve(true);
          }, 350);
        } else {
          resolve(false);
        }
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {}
          }, 2000);
          resolve(true);
        } catch (e) {
          console.error("Iframe print failed:", e);
          resolve(false);
        }
      }, 400);
    } catch (err) {
      console.error("Print labels error:", err);
      resolve(false);
    }
  });
}

/**
 * Universal print handler: tries Detonger SDK if available, falls back to Browser Thermal Print
 */
export async function printLabelsUniversal(
  options: PrintUniversalOptions
): Promise<{ success: boolean; method: "sdk" | "browser"; printed: number; error?: string }> {
  const { labels, labelWidth, labelHeight, printerName, preferSDK = true } = options;

  let totalCount = 0;
  labels.forEach((l) => {
    totalCount += l.quantity || 1;
  });

  if (totalCount === 0) {
    return { success: false, method: "browser", printed: 0, error: "No labels to print" };
  }

  // 1. If preferSDK is true and printerName is provided or SDK available, try SDK
  if (preferSDK) {
    try {
      const status = await initPrinterService();
      const targetPrinter = printerName || status.printerName || status.printers[0];

      if (status.available && targetPrinter) {
        const sdkLabels: LabelData[] = [];
        labels.forEach((item) => {
          const qty = item.quantity || 1;
          for (let i = 0; i < qty; i++) {
            sdkLabels.push({
              name: item.name,
              variant: item.variant || "",
              barcode: item.barcode || item.serial || "",
              serial: item.serial || "",
              price: item.price || 0,
            });
          }
        });

        const sdkRes = await printLabelsSDK({
          printerName: targetPrinter,
          labelWidth,
          labelHeight,
          labels: sdkLabels,
        });

        if (sdkRes.success) {
          return { success: true, method: "sdk", printed: sdkRes.printed };
        }
      }
    } catch (err) {
      console.warn("Direct SDK print not available, using universal browser print:", err);
    }
  }

  // 2. Fallback to Browser Print
  const browserSuccess = await printLabelsBrowser(labels, {
    width: labelWidth,
    height: labelHeight,
  });

  return {
    success: browserSuccess,
    method: "browser",
    printed: totalCount,
    error: browserSuccess ? undefined : "Browser print dialog failed to open",
  };
}
