import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignatureCanvas } from "@/components/common/SignatureCanvas";
import {
  saveReceivedNote,
  getReceivedNotesForOrder,
  generateReceivedNoteId,
  prepareNewReceivedNoteItems,
  deleteReceivedNote,
  getOrderDeliveryStatus,
} from "@/lib/receivedNotesStorage";
import { printReceivedNote, generateReceivedNoteHtml } from "@/lib/printReceivedNote";
import type { AdminOrder } from "@/lib/api";
import type {
  CustomerReceivedNote,
  ReceivedNoteItem,
  DeliveryType,
  ReceiverRelation,
  ItemCondition,
} from "@/types/receivedNote";
import {
  CheckCircle,
  AlertTriangle,
  Printer,
  FileCheck2,
  Trash2,
  History,
  Clock,
  User,
  Phone,
  MapPin,
  Sparkles,
  Eye,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface CustomerReceivedNoteDialogProps {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (note: CustomerReceivedNote) => void;
}

export const CustomerReceivedNoteDialog: React.FC<CustomerReceivedNoteDialogProps> = ({
  order,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Form states
  const [items, setItems] = useState<ReceivedNoteItem[]>([]);
  const [receiverName, setReceiverName] = useState<string>("");
  const [receiverPhone, setReceiverPhone] = useState<string>("");
  const [receiverRelation, setReceiverRelation] = useState<ReceiverRelation>("self");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("store_pickup");
  const [receiverAddress, setReceiverAddress] = useState<string>("");
  const [deliveredByName, setDeliveredByName] = useState<string>("Realtech Store Staff");
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [customerSignature, setCustomerSignature] = useState<string>("");
  const [isSignatureEmpty, setIsSignatureEmpty] = useState<boolean>(true);
  const [conditionVerified, setConditionVerified] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Previewing a past note signature
  const [previewNote, setPreviewNote] = useState<CustomerReceivedNote | null>(null);

  // Full document preview modal
  const [documentPreview, setDocumentPreview] = useState<{
    note: CustomerReceivedNote;
    pageSize: "A4" | "A5";
    blankSignature?: boolean;
  } | null>(null);
  const [documentPreviewHtml, setDocumentPreviewHtml] = useState<string>("");

  // Existing notes list for this order
  const [existingNotes, setExistingNotes] = useState<CustomerReceivedNote[]>([]);

  // Update HTML when documentPreview changes
  useEffect(() => {
    if (!documentPreview) {
      setDocumentPreviewHtml("");
      return;
    }
    let isCurrent = true;
    generateReceivedNoteHtml(documentPreview.note, {
      pageSize: documentPreview.pageSize,
      blankSignature: documentPreview.blankSignature,
    }).then((html) => {
      if (isCurrent) setDocumentPreviewHtml(html);
    });
    return () => {
      isCurrent = false;
    };
  }, [documentPreview]);

  // Load / reset form when order changes or dialog opens
  useEffect(() => {
    if (!order || !open) return;

    const notes = getReceivedNotesForOrder(order.id);
    setExistingNotes(notes);

    const initialItems = prepareNewReceivedNoteItems(order);
    setItems(initialItems);

    const cName = order.customer?.full_name || order.user?.full_name || "Customer";
    const cPhone = order.customer?.phone || order.user?.phone || "";
    const cAddress = order.customer?.address || order.user?.address || "";

    setReceiverName(cName);
    setReceiverPhone(cPhone);
    setReceiverAddress(cAddress);
    setDeliveryType(cAddress ? "home_delivery" : "store_pickup");
    setReceiverRelation("self");
    setDeliveredByName("Realtech Store Staff");
    setGeneralNotes("");
    setCustomerSignature("");
    setIsSignatureEmpty(true);
    setConditionVerified(true);
    setActiveTab(notes.length > 0 ? "new" : "new");
  }, [order, open]);

  // Derived totals
  const totalOrderedItems = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.ordered_quantity || 0), 0);
  }, [items]);

  const totalReceivingInThisNote = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.receiving_quantity || 0), 0);
  }, [items]);

  const totalPreviouslyDelivered = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.previously_received || 0), 0);
  }, [items]);

  const totalPendingRemaining = useMemo(() => {
    return Math.max(0, totalOrderedItems - (totalPreviouslyDelivered + totalReceivingInThisNote));
  }, [totalOrderedItems, totalPreviouslyDelivered, totalReceivingInThisNote]);

  const isFullReceipt = totalPendingRemaining === 0 && totalReceivingInThisNote > 0;
  const isPartialReceipt = totalPendingRemaining > 0;

  // Quantity modification handlers
  const handleQuantityChange = (index: number, val: number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = next[index];
      const maxAllowed = Math.max(0, item.ordered_quantity - item.previously_received);
      const safeVal = Math.min(maxAllowed, Math.max(0, isNaN(val) ? 0 : val));
      const remaining = item.ordered_quantity - (item.previously_received + safeVal);

      next[index] = {
        ...item,
        receiving_quantity: safeVal,
        remaining_quantity: Math.max(0, remaining),
      };
      return next;
    });
  };

  const handleSetAllFull = () => {
    setItems((prev) =>
      prev.map((item) => {
        const unreceived = Math.max(0, item.ordered_quantity - item.previously_received);
        return {
          ...item,
          receiving_quantity: unreceived,
          remaining_quantity: 0,
        };
      })
    );
    toast.info("All items set to receive full available quantities");
  };

  const handleSetAllZero = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        receiving_quantity: 0,
        remaining_quantity: Math.max(0, item.ordered_quantity - item.previously_received),
      }))
    );
  };

  const handleConditionChange = (index: number, condition: ItemCondition) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], condition };
      return next;
    });
  };

  const handleItemNoteChange = (index: number, noteText: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], item_notes: noteText };
      return next;
    });
  };

  // Submit and save received note
  const handleSubmit = async () => {
    if (!order) return;

    if (totalReceivingInThisNote === 0) {
      toast.error("Please enter a receiving quantity of at least 1 item.");
      return;
    }

    if (!receiverName.trim()) {
      toast.error("Please enter the receiver's name.");
      return;
    }

    if (isSignatureEmpty || !customerSignature) {
      toast.error("Customer digital signature is required to confirm receipt.");
      return;
    }

    setIsSubmitting(true);
    try {
      const noteId = generateReceivedNoteId();
      const invoiceRef = order.id.slice(0, 8).toUpperCase();

      const newNote: CustomerReceivedNote = {
        id: noteId,
        order_id: order.id,
        invoice_ref: invoiceRef,
        created_at: new Date().toISOString(),
        delivery_type: deliveryType,
        receipt_type: isFullReceipt ? "full" : "partial",
        receiver_name: receiverName.trim(),
        receiver_phone: receiverPhone.trim(),
        receiver_relation: receiverRelation,
        receiver_address: receiverAddress.trim(),
        delivered_by_name: deliveredByName.trim(),
        items: items.map((i) => ({
          ...i,
          remaining_quantity: Math.max(0, i.ordered_quantity - (i.previously_received + i.receiving_quantity)),
        })),
        total_ordered_items: totalOrderedItems,
        total_received_in_this_note: totalReceivingInThisNote,
        total_pending_remaining: totalPendingRemaining,
        general_notes: generalNotes.trim(),
        customer_signature: customerSignature,
        customer_signed_at: new Date().toISOString(),
        is_verified: true,
      };

      const saved = saveReceivedNote(newNote);
      toast.success(
        isFullReceipt
          ? "Customer Received Note created (Full Delivery Signed)!"
          : "Customer Received Note created (Partial Delivery Signed)!"
      );

      // Refresh list
      setExistingNotes(getReceivedNotesForOrder(order.id));

      if (onSuccess) {
        onSuccess(saved);
      }

      // Automatically offer to print
      printReceivedNote(saved);
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating received note:", err);
      toast.error("Failed to save received note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (!order) return;
    if (confirm("Are you sure you want to delete this received note? This cannot be undone.")) {
      deleteReceivedNote(noteId);
      setExistingNotes(getReceivedNotesForOrder(order.id));
      setItems(prepareNewReceivedNoteItems(order));
      toast.success("Received note deleted.");
    }
  };

  const handlePrintA5Blank = async () => {
    if (!order) return;
    const receivingItems = items.filter((it) => (it.receiving_quantity || 0) > 0);
    if (receivingItems.length === 0) {
      toast.error("Please enter at least 1 item quantity to receive/deliver.");
      return;
    }

    const tempNote: CustomerReceivedNote = {
      id: `RN-${order.id.slice(0, 6).toUpperCase()}-DRAFT`,
      order_id: order.id,
      invoice_ref: order.id.slice(0, 8).toUpperCase(),
      receipt_type: totalReceivingInThisNote < summary.totalPending ? "partial" : "full",
      items: receivingItems.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        variant_id: it.variant_id,
        variant_label: it.variant_label,
        serial_number: it.serial_number,
        ordered_quantity: it.ordered_quantity,
        previously_received: it.previously_received,
        receiving_quantity: it.receiving_quantity,
        remaining_quantity: it.remaining_quantity,
        condition: it.condition,
        item_notes: it.item_notes,
      })),
      total_ordered_items: totalOrderedItems,
      total_received_in_this_note: totalReceivingInThisNote,
      total_pending_remaining: totalPendingRemaining,
      receiver_name: receiverName.trim() || order.customer?.full_name || order.user?.full_name || (order as any).customer_name || "Valued Customer",
      receiver_phone: receiverPhone.trim() || order.customer?.phone || order.user?.phone || "",
      receiver_address: receiverAddress.trim() || order.customer?.address || order.user?.address || "",
      receiver_relation: receiverRelation,
      delivery_type: deliveryType,
      delivered_by_name: deliveredByName.trim() || "Realtech Computer Staff",
      general_notes: generalNotes.trim() || "",
      customer_signature: "",
      customer_signed_at: "",
      is_verified: false,
      created_at: new Date().toISOString(),
    };

    await printReceivedNote(tempNote, { pageSize: "A5", blankSignature: true });
  };

  if (!order) return null;

  const orderId = order.id.slice(0, 8).toUpperCase();
  const summary = getOrderDeliveryStatus(order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-border/80 shadow-2xl">
        {/* Dialog Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Customer Received Note
                  <span className="text-xs font-normal text-muted-foreground font-mono">
                    #{orderId}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Handover & item acceptance receipt with digital customer signature
                </DialogDescription>
              </div>
            </div>

            {/* Overall Delivery Status Badge */}
            <div className="flex items-center gap-2">
              {summary.status === "full" && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs py-1 px-2.5">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  All Items Received ({summary.totalReceived}/{summary.totalOrdered})
                </Badge>
              )}
              {summary.status === "partial" && (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs py-1 px-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Partial ({summary.totalReceived}/{summary.totalOrdered} received)
                </Badge>
              )}
              {summary.status === "none" && (
                <Badge variant="outline" className="text-xs py-1 px-2.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Awaiting Delivery Handover
                </Badge>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "history")} className="mt-3">
            <TabsList className="grid grid-cols-2 max-w-xs h-8">
              <TabsTrigger value="new" className="text-xs gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                New Handover Note
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1.5">
                <History className="w-3.5 h-3.5" />
                History ({existingNotes.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === "new" ? (
            <>
              {/* Receipt Mode Quick Actions & Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Handover Mode:
                    </span>
                    <Badge
                      className={
                        isFullReceipt
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      }
                    >
                      {isFullReceipt ? "Full Items Handover ✓" : "Partial Items Handover ⚠️"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFullReceipt
                      ? "All ordered items are marked to be received today."
                      : `${totalReceivingInThisNote} items receiving now; ${totalPendingRemaining} remaining item(s) will be delivered later.`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={isFullReceipt ? "default" : "outline"}
                    onClick={handleSetAllFull}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Full Items
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleSetAllZero}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    Reset Qtys
                  </Button>
                </div>
              </div>

              {/* Items Receiving Table */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    Order Items Breakdown & Quantities Received
                  </Label>
                  <span className="text-xs text-muted-foreground font-medium">
                    Total Ordered: <strong>{totalOrderedItems}</strong> | Receiving:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {totalReceivingInThisNote}
                    </strong>{" "}
                    | Remaining:{" "}
                    <strong className={totalPendingRemaining > 0 ? "text-amber-600" : "text-muted-foreground"}>
                      {totalPendingRemaining}
                    </strong>
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
                  <div className="divide-y divide-border/60">
                    {items.map((item, idx) => {
                      const maxAvailable = Math.max(0, item.ordered_quantity - item.previously_received);
                      const isFullyRecv = item.receiving_quantity === maxAvailable && maxAvailable > 0;
                      const isZeroRecv = item.receiving_quantity === 0;

                      return (
                        <div key={idx} className="p-3.5 sm:p-4 space-y-3 hover:bg-muted/10 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Product Info */}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-muted text-[11px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{item.product_name}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground ml-7">
                                {item.variant_label && (
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                    {item.variant_label}
                                  </span>
                                )}
                                {item.serial_number && (
                                  <span className="font-mono text-[11px] text-primary">
                                    S/N: {item.serial_number}
                                  </span>
                                )}
                                <span>Ordered: <strong>{item.ordered_quantity}</strong></span>
                                {item.previously_received > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    (Prev Received: {item.previously_received})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantity Stepper Controls */}
                            <div className="flex items-center gap-2.5 sm:self-center ml-7 sm:ml-0">
                              <div className="flex items-center rounded-lg border border-border/80 bg-background overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(idx, item.receiving_quantity - 1)}
                                  disabled={item.receiving_quantity <= 0}
                                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors font-bold text-base"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={maxAvailable}
                                  value={item.receiving_quantity}
                                  onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10))}
                                  className="w-12 h-8 text-center font-bold text-sm bg-transparent border-x border-border/60 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(idx, item.receiving_quantity + 1)}
                                  disabled={item.receiving_quantity >= maxAvailable}
                                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors font-bold text-base"
                                >
                                  +
                                </button>
                              </div>

                              {/* Remaining Status Badge */}
                              <div className="min-w-[90px] text-right">
                                {item.remaining_quantity === 0 ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                                    0 Remaining ✓
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px]">
                                    {item.remaining_quantity} Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Item Condition & Item Note Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-border/40 text-xs">
                            <div className="sm:col-span-4 flex items-center gap-1.5">
                              <span className="text-muted-foreground font-medium shrink-0">Condition:</span>
                              <Select
                                value={item.condition}
                                onValueChange={(val) => handleConditionChange(idx, val as ItemCondition)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="brand_new">Brand New & Sealed</SelectItem>
                                  <SelectItem value="tested_ok">Tested & 100% Working</SelectItem>
                                  <SelectItem value="good_condition">Good Physical Condition</SelectItem>
                                  <SelectItem value="box_opened">Box Opened for Check</SelectItem>
                                  <SelectItem value="minor_scratches">Minor Cosmetic Mark</SelectItem>
                                  <SelectItem value="other">Other / Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="sm:col-span-8 flex items-center gap-1.5">
                              <span className="text-muted-foreground font-medium shrink-0">Item Note:</span>
                              <Input
                                placeholder="e.g. Serial inspected, charger included, tested with customer..."
                                value={item.item_notes || ""}
                                onChange={(e) => handleItemNoteChange(idx, e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Receiver & Handover Details */}
              <div className="rounded-xl border border-border/70 p-4 bg-card space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                  <User className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Customer / Receiver & Delivery Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Receiver Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Receiver Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="e.g. Sok Chenda"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Receiver Phone */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      Receiver Phone Number
                    </Label>
                    <Input
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      placeholder="e.g. 012 345 678"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Relationship */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Relationship to Buyer</Label>
                    <Select
                      value={receiverRelation}
                      onValueChange={(val) => setReceiverRelation(val as ReceiverRelation)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Customer (Self / ផ្ទាល់ខ្លួន)</SelectItem>
                        <SelectItem value="family">Family Member (សមាជិកគ្រួសារ)</SelectItem>
                        <SelectItem value="staff_rep">Company Representative (តំណាងក្រុមហ៊ុន)</SelectItem>
                        <SelectItem value="receptionist">Receptionist / Office</SelectItem>
                        <SelectItem value="courier">Courier Driver</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delivery Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Delivery / Handover Method</Label>
                    <Select
                      value={deliveryType}
                      onValueChange={(val) => setDeliveryType(val as DeliveryType)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store_pickup">Store Pickup (ទទួលនៅហាង)</SelectItem>
                        <SelectItem value="home_delivery">Home Delivery (ដឹកជញ្ជូនដល់ផ្ទះ)</SelectItem>
                        <SelectItem value="company_delivery">Office Delivery (ដឹកជញ្ជូនការិយាល័យ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delivery Address */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Handover Location / Address
                    </Label>
                    <Input
                      value={receiverAddress}
                      onChange={(e) => setReceiverAddress(e.target.value)}
                      placeholder="e.g. St 271, Phnom Penh, or Store Front Counter"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Handed By Staff & Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Delivered / Handed By Staff</Label>
                    <Input
                      value={deliveredByName}
                      onChange={(e) => setDeliveredByName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Handover Remarks / Notes</Label>
                    <Input
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      placeholder="e.g. Tested power on, remaining 1 unit to deliver Friday"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Digital Signature Pad */}
              <div className="rounded-xl border border-border/70 p-4 bg-card space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Customer / Receiver Digital Signature <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Sign on screen with finger, stylus, or mouse
                  </span>
                </div>

                {/* The HTML5 Canvas Pad */}
                <SignatureCanvas
                  height={170}
                  onChange={(dataUrl, isEmpty) => {
                    setCustomerSignature(dataUrl);
                    setIsSignatureEmpty(isEmpty);
                  }}
                />

                {/* Acknowledgement Checkbox */}
                <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={conditionVerified}
                    onChange={(e) => setConditionVerified(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>
                    The customer/receiver certifies receipt of the selected items in good condition and acknowledges start of warranty terms.
                  </span>
                </label>
              </div>
            </>
          ) : (
            /* History Tab: Past Received Notes */
            <div className="space-y-4">
              {existingNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No Received Notes yet</p>
                  <p className="text-xs max-w-sm mx-auto">
                    No delivery or handover receipts have been signed for this invoice yet. Click &ldquo;New Handover Note&rdquo; above to record the first customer sign-off.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {existingNotes.map((note) => {
                    const isPart = note.receipt_type === "partial";
                    const formatted = new Date(note.created_at).toLocaleString();

                    return (
                      <div
                        key={note.id}
                        className="rounded-xl border border-border/70 p-4 bg-card hover:border-primary/40 transition-colors shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">
                              #{note.id}
                            </span>
                            <Badge
                              className={
                                isPart
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              }
                            >
                              {isPart ? "Partial Received" : "Full Received"}
                            </Badge>
                          </div>

                          <span className="text-xs text-muted-foreground">{formatted}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
                          <div>
                            <span className="block font-medium text-foreground">
                              Receiver: {note.receiver_name}
                            </span>
                            <span>{note.receiver_phone || "No phone"}</span>
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">
                              Handed: {note.total_received_in_this_note} item(s)
                            </span>
                            <span>Remaining: {note.total_pending_remaining} pending</span>
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">
                              Delivered By: {note.delivered_by_name}
                            </span>
                            <span>Type: {note.delivery_type.replace("_", " ")}</span>
                          </div>
                        </div>

                        {note.general_notes && (
                          <p className="text-xs text-muted-foreground italic bg-muted/10 p-2 rounded">
                            &ldquo;{note.general_notes}&rdquo;
                          </p>
                        )}

                        {/* Signature Preview & Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDocumentPreview({ note, pageSize: "A5" })}
                              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                              title="Preview full Goods Received Note on screen"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview Note
                            </button>
                            {note.customer_signature && (
                              <button
                                type="button"
                                onClick={() => setPreviewNote(note)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                                title="View customer signature only"
                              >
                                Signature
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => printReceivedNote(note, { pageSize: "A5" })}
                              className="h-8 text-xs gap-1 font-medium border-primary/30 text-primary hover:bg-primary/5"
                              title="Print compact A5 size for handover"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print A5
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => printReceivedNote(note, { pageSize: "A4" })}
                              className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                              title="Print standard A4 format"
                            >
                              A4
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteNote(note.id)}
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        {activeTab === "new" && (
          <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {isSignatureEmpty ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  ✍️ Customer signature required to save
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Ready to complete handover
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintA5Blank}
                disabled={totalReceivingInThisNote === 0}
                className="h-9 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5 font-semibold"
                title="Print A5 format with blank signature line for customer to sign when receiving items"
              >
                <Printer className="w-3.5 h-3.5" />
                Print A5 for Customer Sign
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isSignatureEmpty || totalReceivingInThisNote === 0}
                className="h-9 text-xs gap-2 font-bold px-5"
              >
                <FileCheck2 className="w-4 h-4" />
                {isSubmitting ? "Saving & Generating..." : "Sign & Complete Received Note"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Signature Preview Modal */}
      {previewNote && (
        <Dialog open={!!previewNote} onOpenChange={() => setPreviewNote(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                Customer Signature — #{previewNote.id}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Signed by {previewNote.receiver_name} on{" "}
                {new Date(previewNote.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 rounded-xl border border-border/70 bg-muted/10 flex items-center justify-center min-h-[160px]">
              {previewNote.customer_signature ? (
                <img
                  src={previewNote.customer_signature}
                  alt="Signature"
                  className="max-h-36 max-w-full object-contain"
                />
              ) : (
                <span className="text-muted-foreground text-xs">No signature recorded</span>
              )}
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    printReceivedNote(previewNote, { pageSize: "A5" });
                    setPreviewNote(null);
                  }}
                  className="text-xs gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print A5
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    printReceivedNote(previewNote, { pageSize: "A4" });
                    setPreviewNote(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Print A4
                </Button>
              </div>
              <Button size="sm" onClick={() => setPreviewNote(null)} className="text-xs">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Full Document Preview Modal */}
      {documentPreview && (
        <Dialog open={!!documentPreview} onOpenChange={() => setDocumentPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden border-border/80 shadow-2xl">
            <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-primary" />
                  Received Note Preview — #{documentPreview.note.id}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Format: {documentPreview.pageSize} Portrait • Receiver: {documentPreview.note.receiver_name}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-background rounded-lg p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() =>
                      setDocumentPreview((prev) => (prev ? { ...prev, pageSize: "A5" } : null))
                    }
                    className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                      documentPreview.pageSize === "A5"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    A5
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDocumentPreview((prev) => (prev ? { ...prev, pageSize: "A4" } : null))
                    }
                    className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                      documentPreview.pageSize === "A4"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    A4
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={() =>
                    printReceivedNote(documentPreview.note, {
                      pageSize: documentPreview.pageSize,
                      blankSignature: documentPreview.blankSignature,
                    })
                  }
                  className="text-xs gap-1.5 font-bold px-3.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    printReceivedNote(documentPreview.note, {
                      pageSize: documentPreview.pageSize,
                      blankSignature: documentPreview.blankSignature,
                      mode: "window",
                    })
                  }
                  className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                  title="Open in new window"
                >
                  New Window
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-[420px] max-h-[72vh] p-3 sm:p-5 bg-muted/40 overflow-auto flex justify-center items-start">
              {documentPreviewHtml ? (
                <iframe
                  srcDoc={documentPreviewHtml}
                  title="Goods Received Note Preview"
                  className="w-full max-w-[760px] h-[650px] bg-white border border-border/80 rounded-xl shadow-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-xs">
                  Rendering document preview...
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-border/60 flex justify-end gap-2 bg-muted/10">
              <Button size="sm" variant="outline" onClick={() => setDocumentPreview(null)} className="text-xs">
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
