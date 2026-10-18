<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $query = Purchase::with(['supplier', 'items.product']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('purchase_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
                  ->orWhereHas('supplier', function ($sq) use ($s) {
                      $sq->where('name', 'like', "%{$s}%");
                  });
            });
        }

        $perPage = min(100, max(1, (int) $request->get('limit', $request->get('per_page', 20))));
        $purchases = $query->latest()->paginate($perPage);

        return response()->json([
            'success'    => true,
            'purchases'  => $purchases->items(),
            'data'       => $purchases->items(),
            'pagination' => [
                'current_page' => $purchases->currentPage(),
                'total_pages'  => $purchases->lastPage(),
                'total'        => $purchases->total(),
                'per_page'     => $purchases->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $purchase = Purchase::with(['supplier', 'items.product'])->findOrFail($id);

        return response()->json([
            'success'  => true,
            'purchase' => $purchase,
            'data'     => $purchase,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id'        => 'required|exists:suppliers,id',
            'status'             => 'nullable|string|in:draft,ordered,partial,received,completed,cancelled',
            'delivery_fee'       => 'nullable|numeric|min:0',
            'other_expense'      => 'nullable|numeric|min:0',
            'other_expense_note' => 'nullable|string',
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_cost'  => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $totalAmount = 0;
            foreach ($validated['items'] as $it) {
                $totalAmount += ($it['quantity'] * $it['unit_cost']);
            }

            $purchase = Purchase::create([
                'supplier_id'        => $validated['supplier_id'],
                'status'             => $validated['status'] ?? 'ordered',
                'total_amount'       => $totalAmount,
                'delivery_fee'       => $validated['delivery_fee'] ?? 0,
                'other_expense'      => $validated['other_expense'] ?? 0,
                'other_expense_note' => $validated['other_expense_note'] ?? null,
                'notes'              => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $itemData) {
                $product = Product::find($itemData['product_id']);
                PurchaseItem::create([
                    'purchase_id'       => $purchase->id,
                    'product_id'        => $itemData['product_id'],
                    'product_name'      => $product?->name ?? 'Product #' . $itemData['product_id'],
                    'quantity'          => $itemData['quantity'],
                    'received_quantity' => 0,
                    'unit_cost'         => $itemData['unit_cost'],
                    'total_cost'        => $itemData['quantity'] * $itemData['unit_cost'],
                ]);
            }

            return response()->json([
                'success'  => true,
                'message'  => 'Purchase order created successfully',
                'purchase' => $purchase->load(['supplier', 'items.product']),
                'data'     => $purchase,
            ], 201);
        });
    }

    public function update(Request $request, $id)
    {
        $purchase = Purchase::findOrFail($id);

        $validated = $request->validate([
            'supplier_id'        => 'sometimes|exists:suppliers,id',
            'status'             => 'sometimes|string',
            'delivery_fee'       => 'nullable|numeric|min:0',
            'other_expense'      => 'nullable|numeric|min:0',
            'other_expense_note' => 'nullable|string',
            'notes'              => 'nullable|string',
        ]);

        $purchase->update($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Purchase updated successfully',
            'purchase' => $purchase->load(['supplier', 'items.product']),
            'data'     => $purchase,
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $purchase = Purchase::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        $purchase->status = $validated['status'];
        if ($validated['status'] === 'received' && empty($purchase->received_at)) {
            $purchase->received_at = now();
        }
        $purchase->save();

        return response()->json([
            'success'  => true,
            'message'  => 'Status updated successfully',
            'purchase' => $purchase->load(['supplier', 'items.product']),
            'data'     => $purchase,
        ]);
    }

    public function receiveItems(Request $request, $id)
    {
        $purchase = Purchase::with('items')->findOrFail($id);

        $validated = $request->validate([
            'items'                     => 'required|array',
            'items.*.item_id'           => 'required|exists:purchase_items,id',
            'items.*.received_quantity' => 'required|integer|min:0',
        ]);

        return DB::transaction(function () use ($purchase, $validated) {
            $allReceived = true;

            foreach ($validated['items'] as $itemInput) {
                $item = PurchaseItem::find($itemInput['item_id']);
                if ($item && $item->purchase_id == $purchase->id) {
                    $oldRecv = (int) $item->received_quantity;
                    $newRecv = (int) $itemInput['received_quantity'];
                    $diff = $newRecv - $oldRecv;

                    $item->received_quantity = $newRecv;
                    $item->save();

                    // Correct inventory delta
                    if ($diff > 0) {
                        Product::where('id', $item->product_id)->increment('stock_quantity', $diff);
                    } elseif ($diff < 0) {
                        Product::where('id', $item->product_id)->where('stock_quantity', '>=', abs($diff))->decrement('stock_quantity', abs($diff));
                    }

                    if ($item->received_quantity < $item->quantity) {
                        $allReceived = false;
                    }
                }
            }

            $purchase->status = $allReceived ? 'received' : 'partial';
            if ($allReceived && empty($purchase->received_at)) {
                $purchase->received_at = now();
            }
            $purchase->save();

            return response()->json([
                'success'  => true,
                'message'  => 'Items received and inventory updated',
                'purchase' => $purchase->load(['supplier', 'items.product']),
                'data'     => $purchase,
            ]);
        });
    }

    public function destroy($id)
    {
        $purchase = Purchase::findOrFail($id);
        $purchase->items()->delete();
        $purchase->delete();

        return response()->json([
            'success' => true,
            'message' => 'Purchase order deleted successfully',
        ]);
    }

    public function addPayment(Request $request, $id)
    {
        $purchase = Purchase::findOrFail($id);
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'nullable|string',
            'note'   => 'nullable|string',
        ]);

        return response()->json([
            'success'  => true,
            'message'  => 'Payment added to purchase',
            'purchase' => $purchase->load(['supplier', 'items.product']),
        ]);
    }

    public function deletePayment($id, $paymentId)
    {
        $purchase = Purchase::findOrFail($id);
        return response()->json([
            'success'  => true,
            'message'  => 'Payment removed',
            'purchase' => $purchase->load(['supplier', 'items.product']),
        ]);
    }

    public function addExpense(Request $request, $id)
    {
        $purchase = Purchase::findOrFail($id);
        $validated = $request->validate([
            'category'    => 'required|string',
            'amount'      => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $purchase->other_expense = (float) $purchase->other_expense + (float) $validated['amount'];
        $purchase->save();

        return response()->json([
            'success'  => true,
            'message'  => 'Expense added',
            'purchase' => $purchase->load(['supplier', 'items.product']),
        ]);
    }

    public function deleteExpense($id, $expenseId)
    {
        $purchase = Purchase::findOrFail($id);
        return response()->json([
            'success'  => true,
            'message'  => 'Expense removed',
            'purchase' => $purchase->load(['supplier', 'items.product']),
        ]);
    }

    public function deleteReceiveLog($id, $logId)
    {
        $purchase = Purchase::findOrFail($id);
        return response()->json([
            'success'  => true,
            'message'  => 'Receive log deleted',
            'purchase' => $purchase->load(['supplier', 'items.product']),
        ]);
    }
}
