<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Brand;

class BrandController extends Controller
{
    public function index()
    {
        $brands = Brand::where('is_active', true)->withCount('products')->get();

        return response()->json([
            'success' => true,
            'brands'  => $brands,
            'data'    => $brands,
        ]);
    }

    public function show($id)
    {
        $brand = Brand::with('products')->findOrFail($id);

        return response()->json([
            'success' => true,
            'brand'   => $brand,
            'data'    => $brand,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'nullable|string|max:120|unique:brands',
            'logo'        => 'nullable|string',
            'description' => 'nullable|string',
            'website'     => 'nullable|string|url',
            'is_active'   => 'nullable|boolean',
        ]);

        $brand = Brand::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Brand created successfully',
            'brand'   => $brand,
            'data'    => $brand,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'slug'        => 'nullable|string|max:120|unique:brands,slug,' . $id,
            'logo'        => 'nullable|string',
            'description' => 'nullable|string',
            'website'     => 'nullable|string|url',
            'is_active'   => 'nullable|boolean',
        ]);

        $brand->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Brand updated successfully',
            'brand'   => $brand,
            'data'    => $brand,
        ]);
    }

    public function destroy($id)
    {
        $brand = Brand::findOrFail($id);
        $brand->delete();

        return response()->json([
            'success' => true,
            'message' => 'Brand deleted successfully',
        ]);
    }
}
