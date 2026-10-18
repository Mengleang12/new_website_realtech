<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CustomerReceivedNote;
use App\Models\Order;
use Illuminate\Support\Str;

class ReceivedNoteController extends Controller
{
    public function index(Request $request)
    {
        $query = CustomerReceivedNote::with('order');

        if ($request->filled('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        $notes = $query->latest()->get();

        return response()->json([
            'success' => true,
            'notes'   => $notes,
            'data'    => $notes,
        ]);
    }

    public function show($id)
    {
        $note = CustomerReceivedNote::with('order')->findOrFail($id);

        return response()->json([
            'success' => true,
            'note'    => $note,
            'data'    => $note,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'order_id'                    => 'required|exists:orders,id',
            'invoice_ref'                 => 'required|string',
            'receipt_type'                => 'required|in:full,partial',
            'receiver_name'               => 'required|string|max:150',
            'receiver_phone'              => 'nullable|string|max:50',
            'receiver_relation'           => 'nullable|string',
            'receiver_address'            => 'nullable|string',
            'delivery_type'               => 'nullable|string',
            'delivered_by_name'           => 'nullable|string|max:150',
            'total_ordered_items'         => 'required|integer|min:0',
            'total_received_in_this_note' => 'required|integer|min:0',
            'total_pending_remaining'     => 'required|integer|min:0',
            'general_notes'               => 'nullable|string',
            'customer_signature'          => 'nullable|string',
            'items'                       => 'required|array',
        ]);

        $noteId = 'RN-' . date('Ym') . '-' . strtoupper(Str::random(4));

        $note = CustomerReceivedNote::create([
            'id'                          => $noteId,
            'order_id'                    => $validated['order_id'],
            'invoice_ref'                 => $validated['invoice_ref'],
            'receipt_type'                => $validated['receipt_type'],
            'receiver_name'               => $validated['receiver_name'],
            'receiver_phone'              => $validated['receiver_phone'] ?? null,
            'receiver_relation'           => $validated['receiver_relation'] ?? 'self',
            'receiver_address'            => $validated['receiver_address'] ?? null,
            'delivery_type'               => $validated['delivery_type'] ?? 'store_pickup',
            'delivered_by_name'           => $validated['delivered_by_name'] ?? 'Realtech Staff',
            'total_ordered_items'         => $validated['total_ordered_items'],
            'total_received_in_this_note' => $validated['total_received_in_this_note'],
            'total_pending_remaining'     => $validated['total_pending_remaining'],
            'general_notes'               => $validated['general_notes'] ?? null,
            'customer_signature'          => $validated['customer_signature'] ?? null,
            'customer_signed_at'          => !empty($validated['customer_signature']) ? now() : null,
            'is_verified'                 => !empty($validated['customer_signature']),
            'items'                       => $validated['items'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer Received Note created successfully',
            'note'    => $note,
            'data'    => $note,
        ], 201);
    }

    public function destroy($id)
    {
        $note = CustomerReceivedNote::findOrFail($id);
        $note->delete();

        return response()->json([
            'success' => true,
            'message' => 'Received note deleted',
        ]);
    }
}
