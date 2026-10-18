import { getInvoiceBranding, getCachedInvoiceBranding } from "./invoice-branding";
import type { CustomerReceivedNote } from "@/types/receivedNote";
import { toast } from "sonner";

export interface PrintReceivedNoteOptions {
  pageSize?: "A4" | "A5";
  blankSignature?: boolean;
  mode?: "iframe" | "window";
}

/**
 * Generate full HTML for a Customer Received Note (Goods Received & Handover Document)
 */
export async function generateReceivedNoteHtml(
  note: CustomerReceivedNote,
  options?: PrintReceivedNoteOptions
): Promise<string> {
  const branding = (await getInvoiceBranding()) || getCachedInvoiceBranding();

  const pageSize = options?.pageSize || "A5";
  const isA5 = pageSize === "A5";
  const isBlankSignature = options?.blankSignature ?? !note.customer_signature;

  const isPartial = note.receipt_type === "partial";
  const validDate = note.created_at ? new Date(note.created_at) : new Date();
  const formattedDate = !isNaN(validDate.getTime())
    ? validDate.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString();

  const relationLabels: Record<string, string> = {
    self: "Customer (Self / ផ្ទាល់ខ្លួន)",
    family: "Family Member (សមាជិកគ្រួសារ)",
    staff_rep: "Company Representative (តំណាងក្រុមហ៊ុន)",
    receptionist: "Receptionist / Office (អ្នកទទួលការិយាល័យ)",
    courier: "Courier / Delivery Person (អ្នកដឹកជញ្ជូន)",
    other: "Other (ផ្សេងៗ)",
  };

  const deliveryTypeLabels: Record<string, string> = {
    store_pickup: "Store Pickup / ទទួលនៅហាង",
    home_delivery: "Home Delivery / ដឹកជញ្ជូនដល់ផ្ទះ",
    company_delivery: "Office Delivery / ដឹកជញ្ជូនដល់ការិយាល័យ",
  };

  const conditionLabels: Record<string, string> = {
    brand_new: "Brand New / ប្រអប់ថ្មីសុទ្ធ",
    tested_ok: "Tested & Working / ពិនិត្យដំណើរការល្អ",
    good_condition: "Good Condition / គុណភាពល្អ",
    box_opened: "Box Opened / បើកប្រអប់ពិនិត្យ",
    minor_scratches: "Minor Cosmetic / មានស្នាមបន្តិច",
    damaged: "Damaged / មានបញ្ហា",
    other: "Other / ផ្សេងៗ",
  };

  const safeInvoiceRef =
    note.invoice_ref ||
    (note as any).invoice_number ||
    (note.order_id ? note.order_id.slice(0, 8).toUpperCase() : "INV");

  const safeReceiverRelation = note.receiver_relation
    ? relationLabels[note.receiver_relation] || note.receiver_relation
    : "Customer (Self / ផ្ទាល់ខ្លួន)";

  const safeDeliveryType = note.delivery_type
    ? deliveryTypeLabels[note.delivery_type] || note.delivery_type
    : "Store Pickup / ទទួលនៅហាង";

  const safeItems = (note.items || []).map((it: any) => {
    const prodName = it.product_name || it.name || "Item";
    const ordQty = Number(it.ordered_quantity ?? it.quantity ?? 1);
    const recvQty = Number(it.receiving_quantity ?? it.received_quantity ?? it.receiving_now_qty ?? 0);
    const prevQty = Number(it.previously_received ?? it.previously_received_qty ?? 0);
    const remQty = Number(
      it.remaining_quantity !== undefined
        ? it.remaining_quantity
        : Math.max(0, ordQty - (prevQty + recvQty))
    );
    const condLabel = conditionLabels[it.condition] || it.condition || "Tested & Working";
    const serial = it.serial_number || (Array.isArray(it.serial_numbers) ? it.serial_numbers.join(", ") : "");
    const variant = it.variant_label || it.variant_name || "";

    return {
      prodName,
      ordQty,
      recvQty,
      prevQty,
      remQty,
      condLabel,
      serial,
      variant,
      notes: it.item_notes || it.notes || "",
    };
  });

  const totalOrdered =
    note.total_ordered_items ?? safeItems.reduce((acc, it) => acc + it.ordQty, 0);
  const totalReceived =
    note.total_received_in_this_note ?? safeItems.reduce((acc, it) => acc + it.recvQty, 0);
  const totalRemaining =
    note.total_pending_remaining ?? Math.max(0, totalOrdered - totalReceived);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Received Note - ${note.id || safeInvoiceRef}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kantumruy+Pro:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { 
      size: ${isA5 ? "A5 portrait" : "A4 portrait"}; 
      margin: ${isA5 ? "6mm 8mm" : "12mm 15mm"}; 
    }
    body {
      font-family: 'Inter', 'Kantumruy Pro', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: ${isA5 ? "10px" : "12.5px"};
      line-height: ${isA5 ? "1.35" : "1.45"};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .no-print-toolbar .doc-tag {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-toolbar .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-toolbar button {
      cursor: pointer;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-print {
      background: #2563eb;
      color: white;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    .btn-close {
      background: #334155;
      color: #f1f5f9;
    }
    .btn-close:hover {
      background: #475569;
    }
    .page-container {
      max-width: ${isA5 ? "138mm" : "800px"};
      margin: 0 auto;
      padding: ${isA5 ? "2mm 0" : "12px"};
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: ${isA5 ? "2px" : "2.5px"} solid ${branding.primary_color || "#2563eb"};
      padding-bottom: ${isA5 ? "8px" : "14px"};
      margin-bottom: ${isA5 ? "10px" : "16px"};
    }
    .brand-section {
      display: flex;
      gap: ${isA5 ? "8px" : "14px"};
      align-items: center;
    }
    .brand-logo {
      width: ${isA5 ? "38px" : "56px"};
      height: ${isA5 ? "38px" : "56px"};
      object-fit: contain;
      border-radius: 6px;
    }
    .brand-title {
      font-size: ${isA5 ? "15px" : "20px"};
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: ${isA5 ? "8.5px" : "11px"};
      color: #64748b;
      margin-top: 1px;
      line-height: 1.3;
    }
    .doc-info {
      text-align: right;
    }
    .doc-title {
      font-size: ${isA5 ? "13px" : "18px"};
      font-weight: 800;
      color: ${branding.primary_color || "#2563eb"};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-khmer {
      font-size: ${isA5 ? "10.5px" : "13px"};
      font-weight: 700;
      color: #475569;
      margin-top: 1px;
    }
    .doc-id {
      font-size: ${isA5 ? "11px" : "14px"};
      font-weight: 700;
      color: #0f172a;
      margin-top: ${isA5 ? "2px" : "4px"};
      font-family: monospace;
    }
    .doc-date {
      font-size: ${isA5 ? "9px" : "11px"};
      color: #64748b;
      margin-top: 1px;
    }
    .badge {
      display: inline-block;
      padding: ${isA5 ? "2px 6px" : "4px 10px"};
      border-radius: 6px;
      font-size: ${isA5 ? "8.5px" : "10.5px"};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: ${isA5 ? "3px" : "6px"};
    }
    .badge-full {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .badge-partial {
      background: #fffbeb;
      color: #d97706;
      border: 1px solid #fde68a;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${isA5 ? "8px" : "16px"};
      margin-bottom: ${isA5 ? "8px" : "16px"};
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: ${isA5 ? "6px" : "8px"};
      padding: ${isA5 ? "6px 8px" : "10px 12px"};
    }
    .card-title {
      font-size: ${isA5 ? "8.5px" : "10px"};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: ${isA5 ? "3px" : "5px"};
      margin-bottom: ${isA5 ? "4px" : "6px"};
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: ${isA5 ? "2px" : "4px"};
      font-size: ${isA5 ? "9px" : "11.5px"};
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-label {
      width: ${isA5 ? "85px" : "120px"};
      font-weight: 600;
      color: #64748b;
      flex-shrink: 0;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }
    .info-val.highlight {
      color: #0284c7;
      font-weight: 700;
    }
    .table-container {
      margin-bottom: ${isA5 ? "8px" : "16px"};
      border: 1px solid #cbd5e1;
      border-radius: ${isA5 ? "6px" : "8px"};
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${isA5 ? "8.5px" : "11.5px"};
      text-align: left;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      font-size: ${isA5 ? "8px" : "10.5px"};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: ${isA5 ? "4px 6px" : "8px 10px"};
      border-bottom: 1.5px solid #cbd5e1;
    }
    td {
      padding: ${isA5 ? "4px 6px" : "7px 10px"};
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:nth-child(even) td {
      background: #fbfcfe;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .item-name {
      font-weight: 600;
      color: #0f172a;
    }
    .item-meta {
      font-size: ${isA5 ? "7.5px" : "10px"};
      color: #64748b;
      margin-top: 1px;
    }
    .qty-badge {
      display: inline-block;
      min-width: ${isA5 ? "18px" : "24px"};
      padding: ${isA5 ? "1px 4px" : "2px 6px"};
      border-radius: 4px;
      font-weight: 700;
      font-size: ${isA5 ? "8px" : "11px"};
      text-align: center;
    }
    .qty-ordered { background: #f1f5f9; color: #475569; }
    .qty-received { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .qty-remaining { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .qty-zero { background: #f8fafc; color: #94a3b8; }
    .summary-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: ${isA5 ? "6px" : "8px"};
      padding: ${isA5 ? "5px 12px" : "10px 16px"};
      margin-bottom: ${isA5 ? "8px" : "16px"};
    }
    .summary-item {
      text-align: center;
    }
    .summary-num {
      font-size: ${isA5 ? "13px" : "17px"};
      font-weight: 800;
    }
    .summary-label {
      font-size: ${isA5 ? "7.5px" : "10px"};
      text-transform: uppercase;
      font-weight: 600;
      color: #64748b;
      margin-top: 1px;
    }
    .remarks-box {
      background: #fff;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: ${isA5 ? "4px 6px" : "8px 12px"};
      margin-bottom: ${isA5 ? "8px" : "16px"};
      font-size: ${isA5 ? "8.5px" : "11px"};
      color: #334155;
    }
    .remarks-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .terms-box {
      font-size: ${isA5 ? "7.5px" : "10px"};
      color: #64748b;
      line-height: ${isA5 ? "1.3" : "1.45"};
      margin-bottom: ${isA5 ? "8px" : "16px"};
      padding: ${isA5 ? "4px 6px" : "8px 10px"};
      background: #fafafa;
      border-radius: 6px;
      border-left: 3px solid #94a3b8;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${isA5 ? "10px" : "24px"};
      margin-top: ${isA5 ? "4px" : "10px"};
      page-break-inside: avoid;
    }
    .sign-box {
      border: 1px solid #cbd5e1;
      border-radius: ${isA5 ? "6px" : "8px"};
      padding: ${isA5 ? "6px 8px" : "10px 12px"};
      text-align: center;
      background: #ffffff;
    }
    .sign-title {
      font-size: ${isA5 ? "8.5px" : "10.5px"};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: ${isA5 ? "4px" : "6px"};
    }
    .sign-area {
      height: ${isA5 ? "44px" : "75px"};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: ${isA5 ? "4px" : "6px"};
      border-bottom: 1px dashed #cbd5e1;
    }
    .signature-img {
      max-height: ${isA5 ? "38px" : "68px"};
      max-width: 90%;
      object-fit: contain;
    }
    .sign-name {
      font-size: ${isA5 ? "9px" : "11.5px"};
      font-weight: 700;
      color: #0f172a;
    }
    .sign-sub {
      font-size: ${isA5 ? "7.5px" : "10px"};
      color: #64748b;
      margin-top: 1px;
    }
    .stamp-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: ${isA5 ? "1px 6px" : "3px 8px"};
      border-radius: 4px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #10b981;
      font-size: ${isA5 ? "7.5px" : "9.5px"};
      font-weight: 700;
      margin-top: ${isA5 ? "2px" : "4px"};
    }
    .footer-note {
      text-align: center;
      margin-top: ${isA5 ? "6px" : "18px"};
      padding-top: ${isA5 ? "4px" : "8px"};
      border-top: 1px solid #e2e8f0;
      font-size: ${isA5 ? "7.5px" : "9.5px"};
      color: #94a3b8;
    }
    @media print {
      .no-print-toolbar { display: none !important; }
      body { padding: 0 !important; background: #fff !important; }
      .page-container { max-width: 100% !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div class="doc-tag">
      📄 Goods Received Note #${note.id || safeInvoiceRef} (${isA5 ? "A5 Format" : "A4 Format"})
    </div>
    <div class="actions">
      <button class="btn btn-print" onclick="window.focus(); window.print();">
        🖨️ Print Document
      </button>
      <button class="btn btn-close" onclick="window.close();">
        ✕ Close
      </button>
    </div>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="header">
      <div class="brand-section">
        ${branding.site_logo_url ? `<img src="${branding.site_logo_url}" alt="Logo" class="brand-logo" />` : ""}
        <div>
          <div class="brand-title">${branding.site_name || "Realtech Computer"}</div>
          <div class="brand-sub">
            ${branding.site_tagline ? `${branding.site_tagline}<br/>` : ""}
            ${branding.site_address ? `📍 ${branding.site_address}<br/>` : ""}
            ${branding.support_phone ? `📞 ${branding.support_phone}` : ""}
          </div>
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-title">Goods Received Note</div>
        <div class="doc-khmer">ប័ណ្ណប្រគល់-ទទួលទំនិញ</div>
        <div class="doc-id">#${note.id || safeInvoiceRef}</div>
        <div class="doc-date">Date: ${formattedDate}</div>
        <div>
          <span class="badge ${isPartial ? "badge-partial" : "badge-full"}">
            ${isPartial ? "⚠️ Partial Handover / ទទួលមួយផ្នែក" : "✓ Full Handover / ទទួលគ្រប់ចំនួន"}
          </span>
        </div>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="grid-2">
      <!-- Receiver Card -->
      <div class="info-card">
        <div class="card-title">Customer / Receiver Info (ព័ត៌មានអ្នកទទួល)</div>
        <div class="info-row">
          <div class="info-label">Receiver Name:</div>
          <div class="info-val highlight">${note.receiver_name || "—"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Phone Number:</div>
          <div class="info-val">${note.receiver_phone || "—"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Relationship:</div>
          <div class="info-val">${safeReceiverRelation}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Delivery Address:</div>
          <div class="info-val">${note.receiver_address || "Store Pickup"}</div>
        </div>
      </div>

      <!-- Handover & Reference Card -->
      <div class="info-card">
        <div class="card-title">Handover Reference (ព័ត៌មានឯកសារយោង)</div>
        <div class="info-row">
          <div class="info-label">Invoice Ref:</div>
          <div class="info-val highlight">#${safeInvoiceRef}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Handover Type:</div>
          <div class="info-val">${safeDeliveryType}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Delivered By:</div>
          <div class="info-val">${note.delivered_by_name || "Realtech Store Staff"}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Verification:</div>
          <div class="info-val">Verified & Signed Online ✓</div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 32px;">#</th>
            <th>Item Description</th>
            <th class="text-center" style="width: 65px;">Ordered</th>
            <th class="text-center" style="width: 85px; background: #dcfce7; color: #14532d;">Received</th>
            <th class="text-center" style="width: 75px;">Prev Recv</th>
            <th class="text-center" style="width: 75px; background: #fee2e2; color: #7f1d1d;">Pending</th>
            <th style="width: 120px;">Condition / Note</th>
          </tr>
        </thead>
        <tbody>
          ${
            safeItems.length > 0
              ? safeItems
                  .map((item, idx) => {
                    return `
                <tr>
                  <td class="text-center font-bold">${idx + 1}</td>
                  <td>
                    <div class="item-name">${item.prodName}</div>
                    ${item.variant ? `<div class="item-meta">Option: ${item.variant}</div>` : ""}
                    ${item.serial ? `<div class="item-meta">S/N: ${item.serial}</div>` : ""}
                  </td>
                  <td class="text-center"><span class="qty-badge qty-ordered">${item.ordQty}</span></td>
                  <td class="text-center"><span class="qty-badge qty-received font-bold">${item.recvQty}</span></td>
                  <td class="text-center"><span class="qty-badge qty-ordered">${item.prevQty}</span></td>
                  <td class="text-center">
                    <span class="qty-badge ${item.remQty > 0 ? "qty-remaining font-bold" : "qty-zero"}">
                      ${item.remQty > 0 ? item.remQty : "0"}
                    </span>
                  </td>
                  <td>
                    <div style="font-size: 10.5px; font-weight: 600;">${item.condLabel}</div>
                    ${item.notes ? `<div style="font-size: 9.5px; color: #64748b;">${item.notes}</div>` : ""}
                  </td>
                </tr>
              `;
                  })
                  .join("")
              : `<tr><td colspan="7" class="text-center" style="padding: 16px; color: #94a3b8;">No items listed in this note</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <!-- Summary Box -->
    <div class="summary-box">
      <div class="summary-item">
        <div class="summary-num" style="color: #475569;">${totalOrdered}</div>
        <div class="summary-label">Total Ordered Items</div>
      </div>
      <div class="summary-item">
        <div class="summary-num" style="color: #16a34a;">${totalReceived}</div>
        <div class="summary-label">Received in this Note</div>
      </div>
      <div class="summary-item">
        <div class="summary-num" style="color: ${totalRemaining > 0 ? "#ea580c" : "#16a34a"};">
          ${totalRemaining}
        </div>
        <div class="summary-label">Pending / Remaining Items</div>
      </div>
    </div>

    <!-- Remarks if any -->
    ${
      note.general_notes
        ? `
      <div class="remarks-box">
        <div class="remarks-title">Handover & Delivery Notes / កំណត់សម្គាល់បន្ថែម:</div>
        <div>${note.general_notes}</div>
      </div>
    `
        : ""
    }

    <!-- Terms & Acknowledgement -->
    <div class="terms-box">
      <strong>Customer Confirmation & Warranty Policy:</strong><br/>
      1. The undersigned customer/receiver certifies having inspected and received all items listed in this note in the quantities and condition noted.<br/>
      2. Product warranty begins on receipt date according to Realtech Computer store policies.<br/>
      3. Please retain this Goods Received Note as official proof of item acceptance and serial verification.
    </div>

    <!-- Signatures -->
    <div class="signatures-grid">
      <!-- Customer / Receiver Signature -->
      <div class="sign-box">
        <div class="sign-title">Customer / Receiver Signature (អ្នកទទួល)</div>
        <div class="sign-area" style="position: relative;">
          ${
            note.customer_signature && !isBlankSignature
              ? `<img src="${note.customer_signature}" alt="Customer Signature" class="signature-img" />`
              : `<div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; width: 100%; padding-bottom: 3px;">
                   <div style="font-size: ${isA5 ? "8px" : "9.5px"}; color: #94a3b8; font-style: italic;">(Sign here upon receipt / សូមចុះហត្ថលេខាទីនេះ)</div>
                 </div>`
          }
        </div>
        <div class="sign-name">${note.receiver_name || "Customer Signature"}</div>
        <div class="sign-sub">${note.customer_signature && !isBlankSignature ? `Date & Time: ${formattedDate}` : "Date: _____ / _____ / 202___"}</div>
        <div class="stamp-badge">${note.customer_signature && !isBlankSignature ? "✓ Verified Receiver Signature" : "✍️ Receiver Signature on Handover"}</div>
      </div>

      <!-- Staff / Handover By Signature -->
      <div class="sign-box">
        <div class="sign-title">Delivered & Handed Over By (អ្នកប្រគល់)</div>
        <div class="sign-area">
          <div style="font-size: ${isA5 ? "10.5px" : "12px"}; font-weight: 700; color: #1e293b; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
            <span style="font-family: cursive; font-size: ${isA5 ? "15px" : "19px"}; color: ${branding.primary_color || "#2563eb"};">Realtech Store</span>
            <span style="font-size: ${isA5 ? "8px" : "9.5px"}; color: #64748b; font-family: sans-serif;">Authorized Store Dispatch</span>
          </div>
        </div>
        <div class="sign-name">${note.delivered_by_name || "Realtech Computer Staff"}</div>
        <div class="sign-sub">Official Handover Seal</div>
        <div class="stamp-badge" style="background: #eff6ff; color: #2563eb; border-color: #93c5fd;">✓ Store Certified Stamp</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-note">
      ${branding.site_name || "Realtech Computer"} • Goods Received & Handover Document • Generated on ${new Date().toLocaleString()}
    </div>
  </div>

  <script>
    function triggerAutoPrint() {
      window.focus();
      try {
        window.print();
      } catch (e) {
        console.warn("Print execution error:", e);
      }
    }
    if (document.readyState === "complete") {
      setTimeout(triggerAutoPrint, 250);
    } else {
      window.addEventListener("load", function() {
        setTimeout(triggerAutoPrint, 250);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Print a Customer Received Note without popup-blocker restrictions.
 * Uses a hidden off-screen iframe by default, with automatic fallback.
 */
export async function printReceivedNote(
  note: CustomerReceivedNote,
  options?: PrintReceivedNoteOptions
): Promise<boolean> {
  try {
    const html = await generateReceivedNoteHtml(note, options);

    // If explicit new window requested:
    if (options?.mode === "window") {
      try {
        const win = window.open("", "_blank");
        if (win) {
          win.document.open();
          win.document.write(html);
          win.document.close();
          toast.success("Opening Goods Received Note in new window...");
          return true;
        }
      } catch (e) {
        console.warn("window.open failed, falling back to direct iframe print:", e);
      }
    }

    // Clean up any existing print iframe
    const frameId = "customer-received-note-print-frame";
    const existing = document.getElementById(frameId);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    // Create off-screen iframe
    const iframe = document.createElement("iframe");
    iframe.id = frameId;
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = options?.pageSize === "A4" ? "210mm" : "148mm";
    iframe.style.height = options?.pageSize === "A4" ? "297mm" : "210mm";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "none";
    iframe.style.zIndex = "-99999";
    document.body.appendChild(iframe);

    let printed = false;
    const executePrint = () => {
      if (printed) return;
      printed = true;

      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        toast.success(`Printing Received Note #${note.id || "Document"} (${options?.pageSize || "A5"})...`);
      } catch (err) {
        console.error("Direct iframe print failed, trying window.open fallback:", err);
        try {
          const win = window.open("", "_blank");
          if (win) {
            win.document.open();
            win.document.write(html);
            win.document.close();
          } else {
            toast.error("Could not trigger browser print dialog. Please check printer permissions.");
          }
        } catch {
          toast.error("Could not trigger browser print dialog. Please check printer permissions.");
        }
      }

      // Cleanup iframe after print dialog finishes
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 8000);
    };

    iframe.onload = () => {
      setTimeout(executePrint, 200);
    };

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      throw new Error("Unable to access print frame document");
    }

    // Safety fallback in case onload already fired
    setTimeout(() => {
      if (!printed) {
        executePrint();
      }
    }, 500);

    return true;
  } catch (error: any) {
    console.error("Failed to print received note:", error);
    toast.error(error?.message || "Failed to print received note.");
    return false;
  }
}
