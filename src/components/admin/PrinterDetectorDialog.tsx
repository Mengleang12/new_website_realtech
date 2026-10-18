import { useState, useEffect } from "react";
import { AdminDialog } from "./AdminDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Printer,
  Wifi,
  WifiOff,
  RefreshCw,
  Usb,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Sparkles,
  Layers,
  FileText,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  detectConnectedPrinters,
  pairUsbPrinter,
  type PrinterDetectionResult,
} from "@/lib/printer-service";
import { printLabelsUniversal } from "@/lib/label-printer-utils";
import { getGlobalLabelSize } from "@/lib/label-settings";

interface PrinterDetectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrinterSelected?: (printerName: string) => void;
}

export const PrinterDetectorDialog = ({
  open,
  onOpenChange,
  onPrinterSelected,
}: PrinterDetectorDialogProps) => {
  const [scanning, setScanning] = useState(false);
  const [pairingUsb, setPairingUsb] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [result, setResult] = useState<PrinterDetectionResult | null>(null);

  const runDetection = async () => {
    setScanning(true);
    try {
      const res = await detectConnectedPrinters();
      setResult(res);
      if (res.isConnected && res.primaryPrinterName && onPrinterSelected) {
        onPrinterSelected(res.primaryPrinterName);
      }
    } catch (err: any) {
      toast.error("Failed to detect printers: " + (err?.message || "Unknown error"));
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (open) {
      runDetection();
    }
  }, [open]);

  const handlePairUsb = async () => {
    setPairingUsb(true);
    try {
      const res = await pairUsbPrinter();
      if (res.success) {
        toast.success(`Connected USB device: ${res.device?.productName || "Thermal Printer"}`);
        await runDetection();
      } else if (res.error !== "Device selection was cancelled") {
        toast.error(res.error || "Failed to pair USB printer");
      }
    } catch (err: any) {
      toast.error(err?.message || "USB connection failed");
    } finally {
      setPairingUsb(false);
    }
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    try {
      const labelSize = await getGlobalLabelSize();
      const printRes = await printLabelsUniversal({
        printerName: result?.primaryPrinterName,
        labelWidth: labelSize.width || 40,
        labelHeight: labelSize.height || 30,
        labels: [
          {
            name: "Detection Test Label",
            variant: "Thermal Calibration",
            barcode: "TEST-DETECTION-OK",
            serial: `SN-${Date.now().toString().slice(-6)}`,
            price: 0,
            quantity: 1,
          },
        ],
        preferSDK: result?.sdk.available,
      });

      if (printRes.success) {
        if (printRes.method === "sdk") {
          toast.success("Direct SDK test label printed successfully!");
        } else {
          toast.success("Opened test label print dialog!");
        }
      } else {
        toast.error(printRes.error || "Test print failed");
      }
    } catch (err: any) {
      toast.error("Test print error: " + (err?.message || ""));
    } finally {
      setTestPrinting(false);
    }
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2 font-bold text-base">
          <Printer className="w-5 h-5 text-primary" /> Label Printer Hardware Detector
        </span>
      }
      size="2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Main Status Header Card */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            result?.isConnected
              ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-foreground"
              : "bg-muted/40 border-border text-foreground"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
                  result?.isConnected
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {scanning ? (
                  <Activity className="w-5 h-5 animate-pulse text-primary" />
                ) : result?.isConnected ? (
                  <Wifi className="w-5 h-5" />
                ) : (
                  <Printer className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug">
                    {scanning
                      ? "Scanning printer interfaces..."
                      : result?.isConnected
                      ? "Label Printer Connected & Ready"
                      : "Universal Thermal Print Active"}
                  </h3>
                  {result?.isConnected && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0 text-[10px] px-2 py-0.5 whitespace-nowrap">
                      Online ({result.latencyMs}ms)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {result?.message || "Checking for available direct and system printer connections..."}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={runDetection}
              disabled={scanning}
              className="rounded-lg shrink-0 gap-1.5 h-9 font-medium whitespace-nowrap self-start sm:self-center bg-background hover:bg-muted"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Detecting..." : "Scan Interfaces"}
            </Button>
          </div>
        </div>

        {/* 3 Channels Diagnostic Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Channel 1: Desktop Driver / SDK */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-primary shrink-0" /> Driver SDK
                </span>
                {result?.sdk.available ? (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {result?.sdk.available
                  ? `Found ${result.sdk.printers.length} printer(s): ${result.sdk.printers.join(", ")}`
                  : "Detonger/DTPWeb helper service not running on localhost."}
              </p>
            </div>
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
              For direct Detonger/Dothantech high-speed printing.
            </div>
          </div>

          {/* Channel 2: WebUSB Direct Connect */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Usb className="w-3.5 h-3.5 text-primary shrink-0" /> WebUSB
                </span>
                {result?.usb.pairedCount ? (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> {result.usb.pairedCount} Paired
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
                    {result?.usb.supported ? "Supported" : "Unsupported"}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {result?.usb.devices.length
                  ? result.usb.devices.map((d) => d.productName).join(", ")
                  : "Direct USB support for Zebra, Xprinter, TSC, POS-58/80 & Niimbot."}
              </p>
            </div>
            {result?.usb.supported ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePairUsb}
                disabled={pairingUsb}
                className="h-8 text-xs w-full gap-1.5 rounded-lg font-medium"
              >
                {pairingUsb ? <Loader2 className="w-3 h-3 animate-spin" /> : <Usb className="w-3.5 h-3.5" />}
                Pair USB Printer
              </Button>
            ) : (
              <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
                Requires Chrome/Edge on desktop.
              </div>
            )}
          </div>

          {/* Channel 3: Universal Browser Engine */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" /> Universal Roll
                </span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Always Ready
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Exact @page sizing for 30×20, 40×30, 50×30 & 60×40mm thermal rolls.
              </p>
            </div>
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50">
              Zero installation. Works on Windows, Mac, Linux, iOS & Android.
            </div>
          </div>
        </div>

        {/* Diagnostic Recommendations */}
        {result && result.recommendations.length > 0 && (
          <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" /> Tips & Connection Guide
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
              {result.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPrint}
            disabled={testPrinting}
            className="gap-1.5 rounded-lg h-9 text-xs font-medium"
          >
            {testPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            {testPrinting ? "Printing Test Label..." : "Print Test Label"}
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-lg h-9 text-xs font-medium px-5"
          >
            Done
          </Button>
        </div>
      </div>
    </AdminDialog>
  );
};
