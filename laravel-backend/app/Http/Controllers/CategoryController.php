<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::where('is_active', true)->withCount('products')->orderBy('sort_order')->get();

        return response()->json([
            'success'    => true,
            'categories' => $categories,
            'data'       => $categories,
        ]);
    }

    public function show($id)
    {
        $category = Category::with('products')->findOrFail($id);

        return response()->json([
            'success'  => true,
            'category' => $category,
            'data'     => $category,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:100',
            'slug'        => 'nullable|string|max:120|unique:categories',
            'description' => 'nullable|string',
            'icon'        => 'nullable|string',
            'image'       => 'nullable|string',
            'sort_order'  => 'nullable|integer',
            'is_active'   => 'nullable|boolean',
        ]);

        $category = Category::create($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Category created successfully',
            'category' => $category,
            'data'     => $category,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'slug'        => 'nullable|string|max:120|unique:categories,slug,' . $id,
            'description' => 'nullable|string',
            'icon'        => 'nullable|string',
            'image'       => 'nullable|string',
            'sort_order'  => 'nullable|integer',
            'is_active'   => 'nullable|boolean',
        ]);

        $category->update($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Category updated successfully',
            'category' => $category,
            'data'     => $category,
        ]);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully',
        ]);
    }
}
