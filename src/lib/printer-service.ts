import { LPAPIFactory } from "lpapi-dtpweb";

// Singleton LPAPI instance
let api: any = null;
let serviceAvailable = false;

export interface PrinterStatus {
  available: boolean;
  printerName?: string;
  printers: string[];
}

export interface UsbDeviceInfo {
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  vendorId: number;
  productId: number;
}

export interface PrinterDetectionResult {
  isConnected: boolean;
  connectionType: "direct_sdk" | "usb_device" | "browser_system";
  primaryPrinterName?: string;
  latencyMs?: number;
  sdk: {
    available: boolean;
    serviceRunning: boolean;
    printers: string[];
    activePrinter?: string;
    error?: string;
  };
  usb: {
    supported: boolean;
    devices: UsbDeviceInfo[];
    pairedCount: number;
  };
  serial: {
    supported: boolean;
    portsCount: number;
  };
  browser: {
    available: boolean;
  };
  message: string;
  recommendations: string[];
}

/**
 * Initialize the lpapi-dtpweb print service.
 * Requires the Detonger/Dothantech printer driver (which includes the dtpweb print helper) installed on Windows.
 */
export async function initPrinterService(): Promise<PrinterStatus> {
  try {
    api = LPAPIFactory.getInstance({ logLevel: 0 });

    const resp = await api.checkPlugin();
    if (resp.statusCode === 0) {
      serviceAvailable = true;

      // Get list of available printers
      const devices = api.getPrinters() || [];
      const printerNames = devices
        .map((d: any) => d.name || d.printerName || d.deviceId || "")
        .filter(Boolean);

      return {
        available: true,
        printerName: printerNames[0] || undefined,
        printers: printerNames,
      };
    } else {
      serviceAvailable = false;
      return { available: false, printers: [] };
    }
  } catch {
    serviceAvailable = false;
    return { available: false, printers: [] };
  }
}

/**
 * Deep detection of all connected label printers (SDK, WebUSB, Serial, and Browser print)
 */
export async function detectConnectedPrinters(): Promise<PrinterDetectionResult> {
  const startTime = performance.now();
  const recommendations: string[] = [];

  // 1. Check SDK / Driver service
  let sdkStatus: PrinterDetectionResult["sdk"] = {
    available: false,
    serviceRunning: false,
    printers: [],
  };

  try {
    const initRes = await initPrinterService();
    if (initRes.available) {
      sdkStatus.available = true;
      sdkStatus.serviceRunning = true;
      sdkStatus.printers = initRes.printers;
      sdkStatus.activePrinter = initRes.printerName;
    } else {
      sdkStatus.error = "Desktop print service (dtpweb) is not running or not responding";
    }
  } catch (err: any) {
    sdkStatus.error = err?.message || "Failed to initialize driver SDK";
  }

  // 2. Check WebUSB devices
  const usbStatus: PrinterDetectionResult["usb"] = {
    supported: typeof navigator !== "undefined" && "usb" in navigator,
    devices: [],
    pairedCount: 0,
  };

  if (usbStatus.supported) {
    try {
      const devices = await (navigator as any).usb.getDevices();
      usbStatus.pairedCount = devices.length;
      usbStatus.devices = devices.map((d: any) => ({
        productName: d.productName || "USB Thermal Device",
        manufacturerName: d.manufacturerName || "Printer Manufacturer",
        serialNumber: d.serialNumber,
        vendorId: d.vendorId,
        productId: d.productId,
      }));
    } catch {
      /* ignore permission query error */
    }
  }

  // 3. Check Web Serial
  const serialStatus: PrinterDetectionResult["serial"] = {
    supported: typeof navigator !== "undefined" && "serial" in navigator,
    portsCount: 0,
  };

  if (serialStatus.supported) {
    try {
      const ports = await (navigator as any).serial.getPorts();
      serialStatus.portsCount = ports.length;
    } catch {
      /* ignore */
    }
  }

  const browserAvailable = typeof window !== "undefined" && typeof window.print === "function";
  const latencyMs = Math.round(performance.now() - startTime);

  // Determine overall status
  let isConnected = false;
  let connectionType: PrinterDetectionResult["connectionType"] = "browser_system";
  let primaryPrinterName: string | undefined = undefined;
  let message = "";

  if (sdkStatus.available && sdkStatus.printers.length > 0) {
    isConnected = true;
    connectionType = "direct_sdk";
    primaryPrinterName = sdkStatus.activePrinter || sdkStatus.printers[0];
    message = `Direct Driver Connected: ${primaryPrinterName} (${sdkStatus.printers.length} printer found)`;
  } else if (usbStatus.devices.length > 0) {
    isConnected = true;
    connectionType = "usb_device";
    primaryPrinterName = usbStatus.devices[0].productName || "USB Thermal Printer";
    message = `USB Thermal Printer Detected: ${primaryPrinterName}`;
  } else {
    isConnected = false;
    connectionType = "browser_system";
    message = "No direct printer driver detected. Universal Browser & Thermal Roll printing is active.";
    recommendations.push(
      "If using a Detonger/Dothantech label printer, ensure the dtpweb desktop helper service is running.",
      "If using a USB thermal printer, connect it via USB and pair it using the WebUSB button.",
      "You can still print anytime — labels automatically format for 30×20, 40×30, 50×30, and 60×40mm thermal rolls via your system print dialog."
    );
  }

  return {
    isConnected,
    connectionType,
    primaryPrinterName,
    latencyMs,
    sdk: sdkStatus,
    usb: usbStatus,
    serial: serialStatus,
    browser: { available: browserAvailable },
    message,
    recommendations,
  };
}

/**
 * Request WebUSB connection to a thermal or label printer
 */
export async function pairUsbPrinter(): Promise<{ success: boolean; device?: any; error?: string }> {
  if (typeof navigator === "undefined" || !("usb" in navigator)) {
    return { success: false, error: "WebUSB is not supported in this browser. Please use Chrome or Edge." };
  }

  try {
    // Thermal & POS Printer common Vendor IDs
    const device = await (navigator as any).usb.requestDevice({
      filters: [
        { vendorId: 0x0a5f }, // Zebra
        { vendorId: 0x0416 }, // Winbond / POS
        { vendorId: 0x0483 }, // STMicroelectronics / Xprinter
        { vendorId: 0x1fc9 }, // NXP / POS
        { vendorId: 0x0fe6 }, // ICS / POS
        { vendorId: 0x1203 }, // TSC
        { vendorId: 0x0922 }, // Dymo
        { vendorId: 0x04b8 }, // Seiko Epson
        { vendorId: 0x04f9 }, // Brother
        { vendorId: 0x6868 }, // Detonger
      ],
    });

    if (device) {
      return { success: true, device };
    }
    return { success: false, error: "No device selected" };
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      return { success: false, error: "Device selection was cancelled" };
    }
    return { success: false, error: err?.message || "Failed to pair USB printer" };
  }
}

export function isPrinterServiceAvailable(): boolean {
  return serviceAvailable && api !== null;
}

export function getApi(): any {
  return api;
}

export interface LabelData {
  name: string;
  variant: string;
  barcode: string;
  serial: string;
  price: number;
}

export interface PrintOptions {
  printerName: string;
  labelWidth: number; // mm
  labelHeight: number; // mm
  labels: LabelData[];
}

export interface CustomerLabelData {
  senderText: string;
  address: string;
  phone: string;
}

export interface CustomerLabelPrintOptions {
  printerName: string;
  labelWidth: number; // mm
  labelHeight: number; // mm
  label: CustomerLabelData;
}

/**
 * Print product labels directly to the Detonger printer via lpapi-dtpweb SDK.
 * No browser print dialog is shown.
 */
export async function printLabels(
  options: PrintOptions
): Promise<{ success: boolean; printed: number; error?: string }> {
  if (!api) {
    return {
      success: false,
      printed: 0,
      error: "Print service not initialized. Please check the printer connection first.",
    };
  }

  const { printerName, labelWidth, labelHeight, labels } = options;

  try {
    const openResp = await api.openPrinter(printerName);
    if (openResp.statusCode !== 0) {
      return {
        success: false,
        printed: 0,
        error: `Failed to connect to printer "${printerName}": ${openResp.errMsg || "Unknown error"}`,
      };
    }

    let printed = 0;

    for (const label of labels) {
      api.startJob({ width: labelWidth, height: labelHeight });

      const padding = 1.5;
      const contentWidth = labelWidth - padding * 2;
      const isLarge = labelHeight >= 30;

      const nameFontHeight = isLarge ? 2.5 : 2;
      const varFontHeight = isLarge ? 2 : 1.8;
      const barcodeHeight = isLarge ? labelHeight * 0.28 : labelHeight * 0.25;
      const barcodeTextHeight = isLarge ? 2 : 1.5;
      const priceFontHeight = isLarge ? 4 : 3.5;
      const serialFontHeight = isLarge ? 1.8 : 1.5;

      let totalHeight = 0;
      totalHeight += nameFontHeight + 0.8;
      if (label.variant) totalHeight += varFontHeight + 0.5;
      totalHeight += barcodeHeight + 1;
      totalHeight += priceFontHeight + 0.5;
      totalHeight += serialFontHeight;

      let yPos = Math.max(padding, (labelHeight - totalHeight) / 2);

      // Product name
      api.drawText({
        text: label.name,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: nameFontHeight + 1,
        fontHeight: nameFontHeight,
        fontStyle: 1,
        horizontalAlignment: 1,
      });
      yPos += nameFontHeight + 0.8;

      // Variant
      if (label.variant) {
        api.drawText({
          text: label.variant,
          x: padding,
          y: yPos,
          width: contentWidth,
          height: varFontHeight + 0.5,
          fontHeight: varFontHeight,
          horizontalAlignment: 1,
        });
        yPos += varFontHeight + 0.5;
      }

      // Barcode
      api.draw1DBarcode({
        text: label.barcode,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: barcodeHeight,
        textHeight: barcodeTextHeight,
        horizontalAlignment: 1,
      });
      yPos += barcodeHeight + 1;

      // Price
      api.drawText({
        text: `$${label.price.toFixed(2)}`,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: priceFontHeight + 0.5,
        fontHeight: priceFontHeight,
        fontStyle: 1,
        horizontalAlignment: 1,
      });
      yPos += priceFontHeight + 0.5;

      // Serial number
      api.drawText({
        text: label.serial,
        x: padding,
        y: yPos,
        width: contentWidth,
        height: serialFontHeight + 0.5,
        fontHeight: serialFontHeight,
        horizontalAlignment: 1,
      });

      const commitResult = await api.commitJob();
      if (commitResult?.statusCode === 0) {
        printed++;
      }
    }

    await api.closePrinter();
    return {
      success: printed > 0,
      printed,
      error: printed === 0 ? "No labels were printed" : undefined,
    };
  } catch (err: any) {
    try {
      await api.closePrinter();
    } catch {}
    return { success: false, printed: 0, error: err?.message || "Print failed" };
  }
}

/**
 * Print a customer/shipping label directly to the Detonger printer via lpapi-dtpweb SDK.
 */
export async function printCustomerLabel(
  options: CustomerLabelPrintOptions
): Promise<{ success: boolean; error?: string }> {
  if (!api) {
    return {
      success: false,
      error: "Print service not initialized. Please check the printer connection first.",
    };
  }

  const { printerName, labelWidth, labelHeight, label } = options;

  try {
    const openResp = await api.openPrinter(printerName);
    if (openResp.statusCode !== 0) {
      return {
        success: false,
        error: `Failed to connect to printer "${printerName}": ${openResp.errMsg || "Unknown error"}`,
      };
    }

    api.startJob({ width: labelWidth, height: labelHeight });

    const paddingLeft = 1;
    const paddingRight = 3;
    const contentWidth = labelWidth - paddingLeft - paddingRight;
    const usableHeight = labelHeight - paddingLeft * 2;

    const sections: { text: string; weight: number }[] = [];
    if (label.senderText) sections.push({ text: label.senderText, weight: 1 });
    if (label.address) sections.push({ text: label.address, weight: 1.4 });
    if (label.phone) sections.push({ text: label.phone, weight: 1.2 });

    const totalWeight = sections.reduce((s, sec) => s + sec.weight, 0);
    const gap = sections.length > 1 ? 1 : 0;
    const availableForText = usableHeight - gap * (sections.length - 1);

    let yPos = paddingLeft;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const sectionHeight = (sec.weight / totalWeight) * availableForText;
      const fontHeight = sectionHeight * 0.7;

      api.drawText({
        text: sec.text,
        x: paddingLeft,
        y: yPos,
        width: contentWidth,
        height: sectionHeight,
        fontHeight: fontHeight,
        fontStyle: 1,
        horizontalAlignment: 1,
        verticalAlignment: 1,
      });
      yPos += sectionHeight + gap;
    }

    const commitResult = await api.commitJob();
    await api.closePrinter();

    if (commitResult?.statusCode === 0) {
      return { success: true };
    } else {
      return { success: false, error: "Print command failed" };
    }
  } catch (err: any) {
    try {
      await api.closePrinter();
    } catch {}
    return { success: false, error: err?.message || "Print failed" };
  }
}
