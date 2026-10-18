<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Coupon;
use App\Models\User;

class CouponController extends Controller
{
    public function index()
    {
        $coupons = Coupon::latest()->get();

        return response()->json([
            'success' => true,
            'coupons' => $coupons,
            'data'    => $coupons,
        ]);
    }

    public function validateCoupon(Request $request)
    {
        $validated = $request->validate([
            'code'     => 'required|string',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        $coupon = Coupon::where('code', strtoupper(trim($validated['code'])))->first();

        if (!$coupon || !$coupon->isValid((float) ($validated['subtotal'] ?? 0))) {
            return $this->error('Invalid or expired coupon code', 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Coupon applied successfully',
            'coupon'  => $coupon,
            'data'    => $coupon,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code'             => 'required|string|max:50|unique:coupons',
            'discount_type'    => 'required|in:percentage,fixed',
            'discount_value'   => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount'     => 'nullable|numeric|min:0',
            'usage_limit'      => 'nullable|integer|min:0',
            'expires_at'       => 'nullable|date',
            'is_active'        => 'nullable|boolean',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $coupon = Coupon::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Coupon created successfully',
            'coupon'  => $coupon,
            'data'    => $coupon,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);
        $validated = $request->validate([
            'code'             => 'sometimes|string|max:50|unique:coupons,code,' . $id,
            'discount_type'    => 'sometimes|in:percentage,fixed',
            'discount_value'   => 'sometimes|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'max_discount'     => 'nullable|numeric|min:0',
            'usage_limit'      => 'nullable|integer|min:0',
            'expires_at'       => 'nullable|date',
            'is_active'        => 'nullable|boolean',
        ]);

        if (!empty($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $coupon->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Coupon updated successfully',
            'coupon'  => $coupon,
            'data'    => $coupon,
        ]);
    }

    public function assignUsers(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);
        $validated = $request->validate([
            'user_ids' => 'required|array',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Coupon assigned to users',
            'coupon'  => $coupon,
        ]);
    }

    public function getUsers($id)
    {
        $coupon = Coupon::findOrFail($id);

        return response()->json([
            'success' => true,
            'users'   => [],
        ]);
    }

    public function removeUser($id, $userId)
    {
        $coupon = Coupon::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'User removed from coupon assignment',
        ]);
    }

    public function destroy($id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->delete();

        return response()->json([
            'success' => true,
            'message' => 'Coupon deleted successfully',
        ]);
    }
}
