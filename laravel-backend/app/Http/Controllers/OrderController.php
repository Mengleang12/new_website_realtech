<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\CustomerReceivedNote;
use App\Models\Product;
use App\Models\User;
use App\Models\SerialNumber;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['items.product', 'payments', 'user', 'receivedNotes']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('id', 'like', "%{$s}%")
                  ->orWhere('order_number', 'like', "%{$s}%")
                  ->orWhere('customer_name', 'like', "%{$s}%")
                  ->orWhere('customer_phone', 'like', "%{$s}%")
                  ->orWhere('customer_email', 'like', "%{$s}%");
            });
        }

        $perPage = min(100, max(1, (int) $request->get('limit', $request->get('per_page', 20))));
        $orders = $query->latest()->paginate($perPage);

        return response()->json([
            'success'    => true,
            'orders'     => $orders->items(),
            'data'       => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'total_pages'  => $orders->lastPage(),
                'total'        => $orders->total(),
                'per_page'     => $orders->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $order = Order::with(['items.product', 'payments', 'user', 'receivedNotes'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'order'   => $order,
            'data'    => $order,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name'    => 'nullable|string|max:150',
            'customer_phone'   => 'nullable|string|max:50',
            'customer_email'   => 'nullable|email|max:150',
            'customer_id'      => 'nullable|integer',
            'customer_type'    => 'nullable|string|in:existing,new',
            'customer_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'payment_status'   => 'nullable|string',
            'payment_method'   => 'nullable|string|max:50',
            'paid_method'      => 'nullable|string|max:50',
            'paid_amount'      => 'nullable|numeric|min:0',
            'delivery_fee'     => 'nullable|numeric|min:0',
            'discount'         => 'nullable|numeric|min:0',
            'sale_discount'    => 'nullable|numeric|min:0',
            'notes'            => 'nullable|string',
            'warranty_period'  => 'nullable|string',
            'items'            => 'required|array|min:1',
            'items.*.product_id'      => 'nullable|integer',
            'items.*.product_name'    => 'nullable|string',
            'items.*.quantity'        => 'required|integer|min:1',
            'items.*.unit_price'      => 'nullable|numeric|min:0',
            'items.*.price'           => 'nullable|numeric|min:0',
            'items.*.discount_type'   => 'nullable|string',
            'items.*.discount'        => 'nullable|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.variant_label'   => 'nullable|string',
            'items.*.serial_numbers'  => 'nullable|array',
            'items.*.serial_number'   => 'nullable|string',
            'items.*.warranty_text'   => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            // Resolve Customer / User
            $userId = $validated['customer_id'] ?? $request->user()?->id;
            $customerName = $validated['customer_name'] ?? null;
            $customerPhone = $validated['customer_phone'] ?? null;
            $customerEmail = $validated['customer_email'] ?? null;
            $address = $validated['shipping_address'] ?? $validated['customer_address'] ?? null;

            if ($userId) {
                $user = User::find($userId);
                if ($user) {
                    $customerName = $customerName ?? $user->full_name ?? $user->name;
                    $customerPhone = $customerPhone ?? $user->phone;
                    $customerEmail = $customerEmail ?? $user->email;
                    $address = $address ?? $user->address;
                }
            }

            $subtotal = 0;
            $orderItems = [];

            foreach ($validated['items'] as $it) {
                $unitPrice = (float) ($it['unit_price'] ?? $it['price'] ?? 0);
                $qty = (int) $it['quantity'];
                $itemSubtotal = $unitPrice * $qty;
                $subtotal += $itemSubtotal;

                $prodName = $it['product_name'] ?? null;
                if (!$prodName && !empty($it['product_id'])) {
                    $p = Product::find($it['product_id']);
                    $prodName = $p?->name ?? 'Product #' . $it['product_id'];
                }

                $orderItems[] = [
                    'product_id'      => $it['product_id'] ?? null,
                    'product_name'    => $prodName ?? 'Custom Item',
                    'quantity'        => $qty,
                    'unit_price'      => $unitPrice,
                    'total_price'     => $itemSubtotal,
                    'discount_type'   => $it['discount_type'] ?? null,
                    'discount_amount' => (float) ($it['discount_amount'] ?? $it['discount'] ?? 0),
                    'variant_label'   => $it['variant_label'] ?? null,
                    'serial_number'   => !empty($it['serial_numbers']) ? implode(', ', $it['serial_numbers']) : ($it['serial_number'] ?? null),
                    'warranty_text'   => $it['warranty_text'] ?? null,
                ];
            }

            $discount = (float) ($validated['discount'] ?? $validated['sale_discount'] ?? 0);
            $deliveryFee = (float) ($validated['delivery_fee'] ?? 0);
            $grandTotal = max(0, ($subtotal - $discount) + $deliveryFee);
            $paidAmount = (float) ($validated['paid_amount'] ?? 0);

            $paymentMethod = $validated['payment_method'] ?? $validated['paid_method'] ?? 'cash';
            $paymentStatus = $validated['payment_status'] ?? 'unpaid';

            if ($paidAmount >= $grandTotal && $grandTotal > 0) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            $order = Order::create([
                'user_id'          => $userId,
                'customer_name'    => $customerName ?: 'Walk-in Customer',
                'customer_phone'   => $customerPhone,
                'customer_email'   => $customerEmail,
                'shipping_address' => $address,
                'status'           => 'completed',
                'payment_status'   => $paymentStatus,
                'payment_method'   => $paymentMethod,
                'currency'         => 'USD',
                'subtotal'         => $subtotal,
                'discount'         => $discount,
                'delivery_fee'     => $deliveryFee,
                'amount'           => $grandTotal,
                'notes'            => $validated['notes'] ?? null,
                'warranty_period'  => $validated['warranty_period'] ?? null,
                'paid_at'          => $paidAmount > 0 ? now() : null,
            ]);

            foreach ($orderItems as $itemRow) {
                $itemRow['order_id'] = $order->id;
                OrderItem::create($itemRow);

                if (!empty($itemRow['product_id'])) {
                    Product::where('id', $itemRow['product_id'])
                        ->where('stock_quantity', '>', 0)
                        ->decrement('stock_quantity', $itemRow['quantity']);

                    // Mark serial numbers as sold if provided
                    if (!empty($itemRow['serial_number'])) {
                        $snList = array_map('trim', explode(',', $itemRow['serial_number']));
                        SerialNumber::whereIn('serial_number', $snList)->update([
                            'status'   => 'sold',
                            'order_id' => $order->id,
                            'sold_at'  => now(),
                        ]);
                    }
                }
            }

            if ($paidAmount > 0) {
                OrderPayment::create([
                    'order_id' => $order->id,
                    'amount'   => $paidAmount,
                    'method'   => $paymentMethod,
                    'note'     => 'Payment recorded on creation',
                    'paid_at'  => now(),
                ]);
            }

            return response()->json([
                'success'      => true,
                'message'      => 'Sale created successfully',
                'total_amount' => $grandTotal,
                'order'        => $order->load(['items', 'payments']),
                'data'         => $order,
            ], 201);
        });
    }

    public function update(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'customer_name'    => 'nullable|string|max:150',
            'customer_phone'   => 'nullable|string|max:50',
            'customer_email'   => 'nullable|email|max:150',
            'shipping_address' => 'nullable|string',
            'status'           => 'nullable|string',
            'payment_status'   => 'nullable|string',
            'payment_method'   => 'nullable|string|max:50',
            'notes'            => 'nullable|string',
            'warranty_period'  => 'nullable|string',
            'delivery_fee'     => 'nullable|numeric|min:0',
            'discount'         => 'nullable|numeric|min:0',
        ]);

        $order->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Order updated successfully',
            'order'   => $order->load(['items', 'payments']),
            'data'    => $order,
        ]);
    }

    public function approve($id)
    {
        $order = Order::findOrFail($id);
        $order->status = 'completed';
        $order->payment_status = 'paid';
        $order->paid_at = now();
        $order->save();

        return response()->json([
            'success' => true,
            'message' => 'Order approved successfully',
            'order'   => $order->load(['items', 'payments']),
            'data'    => $order,
        ]);
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'order_ids' => 'required|array',
        ]);

        $count = 0;
        foreach ($validated['order_ids'] as $id) {
            $order = Order::find($id);
            if ($order) {
                $order->items()->delete();
                $order->payments()->delete();
                $order->receivedNotes()->delete();
                $order->delete();
                $count++;
            }
        }

        return response()->json([
            'success'       => true,
            'message'       => "Successfully deleted {$count} orders",
            'deleted_count' => $count,
        ]);
    }

    public function addPayment(Request $request, $id)
    {
        $order = Order::with('payments')->findOrFail($id);

        $validated = $request->validate([
            'amount'    => 'required|numeric|min:0.01',
            'method'    => 'nullable|string|max:50',
            'reference' => 'nullable|string|max:100',
            'note'      => 'nullable|string',
            'paid_at'   => 'nullable|date',
        ]);

        $payment = OrderPayment::create([
            'order_id'  => $order->id,
            'amount'    => $validated['amount'],
            'method'    => $validated['method'] ?? 'cash',
            'reference' => $validated['reference'] ?? null,
            'note'      => $validated['note'] ?? null,
            'paid_at'   => $validated['paid_at'] ?? now(),
        ]);

        $totalPaid = $order->payments()->sum('amount');
        if ($totalPaid >= $order->amount && $order->amount > 0) {
            $order->payment_status = 'paid';
            $order->paid_at = now();
        } else {
            $order->payment_status = 'partial';
        }
        $order->save();

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully',
            'payment' => $payment,
            'order'   => $order->load(['items', 'payments']),
            'data'    => $payment,
        ]);
    }

    public function deletePayment($id, $paymentId)
    {
        $order = Order::findOrFail($id);
        $payment = OrderPayment::where('order_id', $order->id)->where('id', $paymentId)->firstOrFail();
        $payment->delete();

        $totalPaid = $order->payments()->sum('amount');
        if ($totalPaid >= $order->amount && $order->amount > 0) {
            $order->payment_status = 'paid';
        } elseif ($totalPaid > 0) {
            $order->payment_status = 'partial';
        } else {
            $order->payment_status = 'unpaid';
        }
        $order->save();

        return response()->json([
            'success' => true,
            'message' => 'Payment deleted successfully',
        ]);
    }

    public function destroy($id)
    {
        $order = Order::findOrFail($id);
        $order->items()->delete();
        $order->payments()->delete();
        $order->receivedNotes()->delete();
        $order->delete();

        return response()->json([
            'success' => true,
            'message' => 'Order deleted successfully',
        ]);
    }

    // --- Admin Sales & Stock Management ---

    public function searchCustomers(Request $request)
    {
        $q = trim((string) $request->get('q', ''));
        $users = User::where('role', 'customer')
            ->when($q, function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('name', 'like', "%{$q}%")
                        ->orWhere('full_name', 'like', "%{$q}%")
                        ->orWhere('phone', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->limit(20)
            ->get();

        return response()->json([
            'success'   => true,
            'customers' => $users->map(function ($u) {
                return [
                    'id'        => $u->id,
                    'full_name' => $u->full_name ?? $u->name,
                    'phone'     => $u->phone,
                    'email'     => $u->email,
                    'address'   => $u->address,
                ];
            }),
        ]);
    }

    public function searchProducts(Request $request)
    {
        $q = trim((string) $request->get('q', ''));
        $products = Product::where('is_active', true)
            ->when($q, function ($query) use ($q) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('name', 'like', "%{$q}%")
                        ->orWhere('sku', 'like', "%{$q}%")
                        ->orWhere('barcode', 'like', "%{$q}%");
                });
            })
            ->limit(30)
            ->get();

        return response()->json([
            'success'  => true,
            'products' => $products->map(function ($p) {
                return [
                    'id'              => $p->id,
                    'name'            => $p->name,
                    'icon_url'        => $p->image_url,
                    'warranty_period' => $p->warranty_period,
                    'price'           => (float) $p->price,
                    'stock_quantity'  => $p->stock_quantity,
                    'variants'        => [],
                ];
            }),
        ]);
    }

    public function stockOverview(Request $request)
    {
        $query = Product::with(['category', 'brand']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('sku', 'like', "%{$s}%")
                  ->orWhere('barcode', 'like', "%{$s}%");
            });
        }

        if ($request->filled('stock_status')) {
            if ($request->stock_status === 'out_of_stock') {
                $query->where('stock_quantity', '<=', 0);
            } elseif ($request->stock_status === 'low_stock') {
                $query->where('stock_quantity', '>', 0)->where('stock_quantity', '<=', 5);
            } elseif ($request->stock_status === 'in_stock') {
                $query->where('stock_quantity', '>', 5);
            }
        }

        $perPage = min(100, max(1, (int) $request->get('limit', $request->get('per_page', 20))));
        $paginated = $query->latest()->paginate($perPage);

        return response()->json([
            'success'    => true,
            'products'   => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'total_pages'  => $paginated->lastPage(),
                'total'        => $paginated->total(),
                'per_page'     => $paginated->perPage(),
            ],
        ]);
    }

    public function updateStock(Request $request, $productId)
    {
        $product = Product::findOrFail($productId);
        $validated = $request->validate([
            'stock_quantity' => 'required|integer|min:0',
        ]);

        $product->stock_quantity = $validated['stock_quantity'];
        $product->save();

        return response()->json([
            'success' => true,
            'message' => 'Stock updated successfully',
        ]);
    }

    public function bulkUpdateStock(Request $request)
    {
        $validated = $request->validate([
            'updates'                  => 'required|array',
            'updates.*.product_id'     => 'required|exists:products,id',
            'updates.*.stock_quantity' => 'required|integer|min:0',
        ]);

        $count = 0;
        foreach ($validated['updates'] as $up) {
            Product::where('id', $up['product_id'])->update([
                'stock_quantity' => $up['stock_quantity'],
            ]);
            $count++;
        }

        return response()->json([
            'success'       => true,
            'message'       => "Bulk stock updated for {$count} products",
            'updated_count' => $count,
        ]);
    }

    public function toggleProductVisibility($productId)
    {
        $product = Product::findOrFail($productId);
        $current = $product->is_visible ?? $product->is_active ?? true;
        $newVal = !$current;

        if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'is_visible')) {
            $product->is_visible = $newVal;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'is_active')) {
            $product->is_active = $newVal;
        }
        $product->save();

        return response()->json([
            'success'    => true,
            'is_visible' => $newVal,
            'is_active'  => $newVal,
            'message'    => $newVal ? 'Product is now visible in store' : 'Product is now hidden from store',
        ]);
    }
}
