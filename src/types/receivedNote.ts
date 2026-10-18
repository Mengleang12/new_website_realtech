export type DeliveryType = 'store_pickup' | 'home_delivery' | 'company_delivery';
export type ReceiverRelation = 'self' | 'family' | 'staff_rep' | 'receptionist' | 'courier' | 'other';
export type ItemCondition = 'brand_new' | 'tested_ok' | 'good_condition' | 'box_opened' | 'minor_scratches' | 'damaged' | 'other';

export interface ReceivedNoteItem {
  product_id: number;
  product_name: string;
  variant_id?: number | null;
  variant_label?: string | null;
  serial_number?: string;
  ordered_quantity: number;
  previously_received: number;
  receiving_quantity: number; // Qty received in this specific note
  remaining_quantity: number; // ordered_quantity - (previously_received + receiving_quantity)
  condition: ItemCondition;
  item_notes?: string;
}

export interface CustomerReceivedNote {
  id: string; // e.g. RN-202609-0001
  order_id: string;
  invoice_ref: string;
  created_at: string;
  delivery_type: DeliveryType;
  receipt_type: 'full' | 'partial';
  
  // Receiver info
  receiver_name: string;
  receiver_phone: string;
  receiver_id_card?: string;
  receiver_relation: ReceiverRelation;
  receiver_address?: string;

  // Staff / Handover info
  delivered_by_name: string;
  staff_id?: string;

  // Items
  items: ReceivedNoteItem[];
  total_ordered_items: number;
  total_received_in_this_note: number;
  total_pending_remaining: number;

  // Notes
  general_notes?: string;

  // Signature
  customer_signature: string; // Base64 PNG data URL
  customer_signed_at: string;
  staff_signature?: string;

  // Verification status
  is_verified: boolean;
}

export interface OrderDeliverySummary {
  status: 'none' | 'partial' | 'full';
  totalOrdered: number;
  totalReceived: number;
  remaining: number;
  totalPending: number;
  notesCount: number;
  lastNote?: CustomerReceivedNote;
  notes: CustomerReceivedNote[];
}
