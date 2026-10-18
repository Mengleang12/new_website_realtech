import { AdminOrder } from "./api";
import { parseOrderItems } from "./stockHelpers";
import type { CustomerReceivedNote, OrderDeliverySummary, ReceivedNoteItem } from "@/types/receivedNote";

const STORAGE_KEY = "rt_customer_received_notes_v1";
const EVENT_NAME = "rt_customer_received_notes_changed";

/**
 * Get all stored received notes from localStorage
 */
export function getAllReceivedNotes(): CustomerReceivedNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read received notes from localStorage:", err);
    return [];
  }
}

/**
 * Get received notes for a specific order/invoice ID
 */
export function getReceivedNotesForOrder(orderId: string): CustomerReceivedNote[] {
  if (!orderId) return [];
  const all = getAllReceivedNotes();
  return all
    .filter((note) => note.order_id === orderId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Save a new or updated received note
 */
export function saveReceivedNote(note: CustomerReceivedNote): CustomerReceivedNote {
  const all = getAllReceivedNotes();
  const existingIdx = all.findIndex((n) => n.id === note.id);
  if (existingIdx >= 0) {
    all[existingIdx] = note;
  } else {
    all.unshift(note);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // Dispatch event so all components update reactively
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { orderId: note.order_id, noteId: note.id } }));
  } catch (err) {
    console.error("Failed to save received note:", err);
  }
  return note;
}

/**
 * Delete a received note
 */
export function deleteReceivedNote(noteId: string): boolean {
  const all = getAllReceivedNotes();
  const target = all.find((n) => n.id === noteId);
  const filtered = all.filter((n) => n.id !== noteId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { orderId: target?.order_id, noteId } }));
    return true;
  } catch (err) {
    console.error("Failed to delete received note:", err);
    return false;
  }
}

/**
 * Generate a sequential or unique note ID e.g. RN-202609-0042
 */
export function generateReceivedNoteId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RN-${y}${m}-${rand}`;
}

/**
 * Calculate the delivery / receipt summary for an order
 * Aggregates all previously signed received notes for this order
 */
export function getOrderDeliverySummary(order: AdminOrder): OrderDeliverySummary {
  const notes = getReceivedNotesForOrder(order.id);
  const parsedItems = parseOrderItems(order);
  const totalOrdered = parsedItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  // Calculate total items received across all notes
  // To avoid duplicate counting, we sum `receiving_quantity` for all notes of this order
  let totalReceived = 0;
  for (const note of notes) {
    totalReceived += note.total_received_in_this_note || 0;
  }

  // Cap totalReceived to totalOrdered to prevent negative balance
  const effectiveReceived = Math.min(totalOrdered, Math.max(0, totalReceived));
  const remaining = Math.max(0, totalOrdered - effectiveReceived);

  let status: 'none' | 'partial' | 'full' = 'none';
  if (notes.length > 0) {
    if (remaining === 0 && effectiveReceived > 0) {
      status = 'full';
    } else if (effectiveReceived > 0) {
      status = 'partial';
    }
  }

  return {
    status,
    totalOrdered,
    totalReceived: effectiveReceived,
    remaining,
    totalPending: remaining,
    notesCount: notes.length,
    lastNote: notes[0],
    notes,
  };
}

/** Alias for getOrderDeliverySummary */
export const getOrderDeliveryStatus = getOrderDeliverySummary;

/**
 * Prepare items for a new received note dialog for an order
 * Calculates previously received quantity per line item
 */
export function prepareNewReceivedNoteItems(order: AdminOrder): ReceivedNoteItem[] {
  const parsedItems = parseOrderItems(order);
  const existingNotes = getReceivedNotesForOrder(order.id);

  // Map previously received by product_id or product_name
  const previousMap: Record<string, number> = {};
  for (const note of existingNotes) {
    for (const item of note.items) {
      const key = `${item.product_id}_${item.variant_label || ""}`;
      previousMap[key] = (previousMap[key] || 0) + (item.receiving_quantity || 0);
    }
  }

  return parsedItems.map((item) => {
    const key = `${item.product_id}_${item.variant_label || ""}`;
    const previouslyReceived = previousMap[key] || 0;
    const orderedQuantity = item.quantity || 1;
    const unreceived = Math.max(0, orderedQuantity - previouslyReceived);

    return {
      product_id: item.product_id,
      product_name: item.product_name,
      variant_id: item.variant_id ?? null,
      variant_label: item.variant_label ?? null,
      serial_number: order.serial_number || undefined,
      ordered_quantity: orderedQuantity,
      previously_received: previouslyReceived,
      // Default receiving quantity to the remaining unreceived balance
      receiving_quantity: unreceived,
      remaining_quantity: 0, // When receiving_quantity = unreceived, remaining = 0
      condition: "brand_new",
      item_notes: "",
    };
  });
}

/**
 * React hook helper event listener for received notes changes
 */
export function subscribeToReceivedNotes(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}
