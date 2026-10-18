<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Quotation;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = Quotation::query();

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('quotation_number', 'like', "%{$s}%")
                  ->orWhere('customer_name', 'like', "%{$s}%")
                  ->orWhere('customer_phone', 'like', "%{$s}%")
                  ->orWhere('customer_email', 'like', "%{$s}%");
            });
        }

        $perPage = min(100, max(1, (int) $request->get('limit', $request->get('per_page', 20))));
        $paginated = $query->latest()->paginate($perPage);

        return response()->json([
            'success'    => true,
            'quotations' => $paginated->items(),
            'data'       => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'total_pages'  => $paginated->lastPage(),
                'total'        => $paginated->total(),
                'per_page'     => $paginated->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $quotation = Quotation::findOrFail($id);

        return response()->json([
            'success'   => true,
            'quotation' => $quotation,
            'data'      => $quotation,
        ]);
    }

    public function viewByNumber($number)
    {
        $quotation = Quotation::where('quotation_number', $number)->orWhere('id', $number)->firstOrFail();

        return response()->json([
            'success'   => true,
            'quotation' => $quotation,
            'data'      => $quotation,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name'    => 'required|string|max:150',
            'customer_phone'   => 'nullable|string|max:50',
            'customer_email'   => 'nullable|email|max:100',
            'items'            => 'required|array',
            'subtotal'         => 'required|numeric|min:0',
            'discount'         => 'nullable|numeric|min:0',
            'discount_amount'  => 'nullable|numeric|min:0',
            'total_amount'     => 'nullable|numeric|min:0',
            'total'            => 'nullable|numeric|min:0',
            'valid_until'      => 'nullable|date',
            'notes'            => 'nullable|string',
            'terms'            => 'nullable|string',
        ]);

        $subtotal = (float) $validated['subtotal'];
        $discount = (float) ($validated['discount_amount'] ?? $validated['discount'] ?? 0);
        $totalAmount = (float) ($validated['total_amount'] ?? $validated['total'] ?? ($subtotal - $discount));

        $quotation = Quotation::create([
            'customer_name'  => $validated['customer_name'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'customer_email' => $validated['customer_email'] ?? null,
            'items'          => $validated['items'],
            'subtotal'       => $subtotal,
            'discount'       => $discount,
            'total_amount'   => $totalAmount,
            'status'         => 'sent',
            'valid_until'    => $validated['valid_until'] ?? null,
            'notes'          => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success'   => true,
            'message'   => 'Quotation created successfully',
            'quotation' => $quotation,
            'data'      => $quotation,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);

        $validated = $request->validate([
            'customer_name'   => 'sometimes|string|max:150',
            'customer_phone'  => 'nullable|string|max:50',
            'customer_email'  => 'nullable|email|max:100',
            'items'           => 'sometimes|array',
            'subtotal'        => 'sometimes|numeric|min:0',
            'discount'        => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'total_amount'    => 'sometimes|numeric|min:0',
            'total'           => 'sometimes|numeric|min:0',
            'status'          => 'sometimes|string',
            'valid_until'     => 'nullable|date',
            'notes'           => 'nullable|string',
        ]);

        if (isset($validated['discount_amount'])) {
            $validated['discount'] = $validated['discount_amount'];
        }
        if (isset($validated['total'])) {
            $validated['total_amount'] = $validated['total'];
        }

        $quotation->update($validated);

        return response()->json([
            'success'   => true,
            'message'   => 'Quotation updated successfully',
            'quotation' => $quotation,
            'data'      => $quotation,
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        $quotation->status = $validated['status'];
        $quotation->save();

        return response()->json([
            'success'   => true,
            'message'   => 'Quotation status updated',
            'quotation' => $quotation,
            'data'      => $quotation,
        ]);
    }

    public function convert($id)
    {
        $quotation = Quotation::findOrFail($id);

        return DB::transaction(function () use ($quotation) {
            $order = Order::create([
                'customer_name'    => $quotation->customer_name,
                'customer_phone'   => $quotation->customer_phone,
                'customer_email'   => $quotation->customer_email,
                'status'           => 'completed',
                'payment_status'   => 'unpaid',
                'subtotal'         => $quotation->subtotal,
                'discount'         => $quotation->discount,
                'amount'           => $quotation->total_amount,
                'notes'            => 'Converted from Quotation ' . $quotation->quotation_number,
            ]);

            if (is_array($quotation->items)) {
                foreach ($quotation->items as $it) {
                    $qty = (int) ($it['quantity'] ?? 1);
                    $price = (float) ($it['unit_price'] ?? $it['price'] ?? 0);
                    OrderItem::create([
                        'order_id'     => $order->id,
                        'product_id'   => $it['product_id'] ?? null,
                        'product_name' => $it['product_name'] ?? 'Product',
                        'quantity'     => $qty,
                        'unit_price'   => $price,
                        'total_price'  => $price * $qty,
                    ]);
                }
            }

            $quotation->status = 'converted';
            $quotation->save();

            return response()->json([
                'success'   => true,
                'message'   => 'Quotation converted to sale order',
                'order'     => $order->load('items'),
                'quotation' => $quotation,
            ]);
        });
    }

    public function markConverted(Request $request, $id)
    {
        $quotation = Quotation::findOrFail($id);
        $quotation->status = 'converted';
        $quotation->save();

        return response()->json([
            'success'   => true,
            'message'   => 'Quotation marked as converted',
            'quotation' => $quotation,
        ]);
    }

    public function destroy($id)
    {
        $quotation = Quotation::findOrFail($id);
        $quotation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Quotation deleted successfully',
        ]);
    }
}
