<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Supplier;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) ($request->get('q') ?? $request->get('search') ?? ''));

        $query = Supplier::withCount('purchases');

        if (!empty($q)) {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('company_name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $suppliers = $query->latest()->get();

        return response()->json([
            'success'   => true,
            'suppliers' => $suppliers,
            'data'      => $suppliers,
        ]);
    }

    public function show($id)
    {
        $supplier = Supplier::with('purchases')->findOrFail($id);

        return response()->json([
            'success'  => true,
            'supplier' => $supplier,
            'data'     => $supplier,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'company_name'   => 'nullable|string|max:150',
            'contact_person' => 'nullable|string|max:100',
            'email'          => 'nullable|email|max:100',
            'phone'          => 'nullable|string|max:50',
            'address'        => 'nullable|string',
            'notes'          => 'nullable|string',
            'is_active'      => 'nullable|boolean',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Supplier created successfully',
            'supplier' => $supplier,
            'data'     => $supplier,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:150',
            'company_name'   => 'nullable|string|max:150',
            'contact_person' => 'nullable|string|max:100',
            'email'          => 'nullable|email|max:100',
            'phone'          => 'nullable|string|max:50',
            'address'        => 'nullable|string',
            'notes'          => 'nullable|string',
            'is_active'      => 'nullable|boolean',
        ]);

        $supplier->update($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Supplier updated successfully',
            'supplier' => $supplier,
            'data'     => $supplier,
        ]);
    }

    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully',
        ]);
    }
}
