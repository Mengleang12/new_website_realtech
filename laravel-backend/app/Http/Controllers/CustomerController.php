<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = User::withCount('orders')
            ->withSum('orders', 'amount')
            ->where('role', 'customer');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('full_name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%")
                  ->orWhere('telegram', 'like', "%{$s}%");
            });
        }

        $perPage = min(100, max(1, (int) $request->get('limit', $request->get('per_page', 20))));
        $paginated = $query->latest()->paginate($perPage);

        return response()->json([
            'success'    => true,
            'users'      => $paginated->items(),
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
        $user = User::with(['orders.items', 'orders.payments'])->findOrFail($id);
        return response()->json([
            'success' => true,
            'user'    => $user,
            'orders'  => $user->orders,
        ]);
    }

    public function getOrders($id)
    {
        $user = User::findOrFail($id);
        $orders = Order::with(['items', 'payments'])
            ->where('user_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'user'    => [
                'id'        => $user->id,
                'email'     => $user->email,
                'full_name' => $user->full_name ?? $user->name,
            ],
            'orders'  => $orders,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'email'         => 'nullable|email|max:150|unique:users,email',
            'full_name'     => 'required|string|max:150',
            'phone'         => 'nullable|string|max:50',
            'telegram'      => 'nullable|string|max:100',
            'facebook_name' => 'nullable|string|max:150',
            'address'       => 'nullable|string',
        ]);

        $email = $validated['email'] ?? ('customer_' . Str::random(8) . '@guest.local');
        $randomPassword = Str::random(12);

        $user = User::create([
            'name'          => $validated['full_name'],
            'full_name'     => $validated['full_name'],
            'email'         => $email,
            'password'      => Hash::make($randomPassword),
            'phone'         => $validated['phone'] ?? null,
            'telegram'      => $validated['telegram'] ?? null,
            'facebook_name' => $validated['facebook_name'] ?? null,
            'address'       => $validated['address'] ?? null,
            'role'          => 'customer',
            'is_active'     => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully',
            'user'    => $user,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'email'         => 'sometimes|email|max:150|unique:users,email,' . $id,
            'full_name'     => 'sometimes|string|max:150',
            'phone'         => 'nullable|string|max:50',
            'telegram'      => 'nullable|string|max:100',
            'facebook_name' => 'nullable|string|max:150',
            'address'       => 'nullable|string',
            'is_active'     => 'nullable|boolean',
        ]);

        if (!empty($validated['full_name'])) {
            $validated['name'] = $validated['full_name'];
        }

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully',
            'user'    => $user,
        ]);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return $this->success(null, 'Customer deleted successfully');
    }

    public function grantProduct(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'product_id'   => 'required|exists:products,id',
            'product_name' => 'required|string',
            'amount'       => 'nullable|numeric|min:0',
        ]);

        $product = Product::find($validated['product_id']);
        $amount = (float) ($validated['amount'] ?? 0);

        $order = Order::create([
            'user_id'          => $user->id,
            'customer_name'    => $user->full_name ?? $user->name,
            'customer_phone'   => $user->phone,
            'customer_email'   => $user->email,
            'shipping_address' => $user->address,
            'status'           => 'completed',
            'payment_status'   => 'paid',
            'payment_method'   => 'admin_grant',
            'currency'         => 'USD',
            'subtotal'         => $amount,
            'amount'           => $amount,
            'notes'            => 'Product granted by admin',
            'paid_at'          => now(),
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'product_name' => $product->name,
            'quantity'     => 1,
            'unit_price'   => $amount,
            'total_price'  => $amount,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product granted to customer',
            'order'   => $order->load('items'),
        ]);
    }

    public function revokeProduct($id, $productId)
    {
        $user = User::findOrFail($id);
        $orderIds = Order::where('user_id', $user->id)->pluck('id');
        OrderItem::whereIn('order_id', $orderIds)->where('product_id', $productId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product revoked from customer',
        ]);
    }
}
