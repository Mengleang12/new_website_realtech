<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand']);

        // Check visibility
        if ($request->get('visibility') === 'hidden' || $request->get('status') === 'hidden') {
            if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'is_visible')) {
                $query->where('is_visible', false);
            } elseif (\Illuminate\Support\Facades\Schema::hasColumn('products', 'is_active')) {
                $query->where('is_active', false);
            }
        } elseif (!$request->boolean('include_hidden') && !$request->get('all') && $request->get('status') !== 'all') {
            if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'is_visible')) {
                $query->where('is_visible', true);
            }
            if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'is_active')) {
                $query->where('is_active', true);
            }
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        } elseif ($request->filled('category')) {
            $cat = $request->category;
            $query->whereHas('category', function ($q) use ($cat) {
                $q->where('slug', $cat)->orWhere('name', $cat);
            });
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->has('featured') && $request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->max_price);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('sku', 'like', "%{$s}%")
                  ->orWhere('barcode', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        $perPage = min(100, max(1, (int) $request->get('limit', $request->get('per_page', 24))));
        $products = $query->latest()->paginate($perPage);

        return response()->json([
            'products'   => $products->items(),
            'data'       => $products->items(),
            'pagination' => [
                'page'        => $products->currentPage(),
                'limit'       => $products->perPage(),
                'total'       => $products->total(),
                'total_pages' => $products->lastPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $product = Product::with(['category', 'brand', 'serials'])->find($id);

        if (!$product) {
            $product = Product::with(['category', 'brand', 'serials'])->where('slug', $id)->first();
        }

        if (!$product) {
            return $this->error('Product not found', 404);
        }

        return response()->json([
            'success' => true,
            'product' => $product,
            'data'    => $product,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'sku'             => 'nullable|string|max:100|unique:products',
            'barcode'         => 'nullable|string|max:100',
            'description'     => 'nullable|string',
            'price'           => 'required|numeric|min:0',
            'original_price'  => 'nullable|numeric|min:0',
            'cost_price'      => 'nullable|numeric|min:0',
            'stock_quantity'  => 'nullable|integer|min:0',
            'category_id'     => 'nullable|exists:categories,id',
            'brand_id'        => 'nullable|exists:brands,id',
            'image_url'       => 'nullable|string',
            'images'          => 'nullable|array',
            'is_active'       => 'nullable|boolean',
            'is_visible'      => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'warranty_period' => 'nullable|string',
            'specifications'  => 'nullable|array',
        ]);

        if ($request->has('is_visible') && !$request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_visible');
        } elseif ($request->has('is_active') && !$request->has('is_visible')) {
            $validated['is_visible'] = $request->boolean('is_active');
        }

        $product = Product::create($validated);

        return response()->json([
            'success' => true,
            'id'      => $product->id,
            'product' => $product,
            'data'    => $product,
            'message' => 'Product created successfully',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'sku'             => 'nullable|string|max:100|unique:products,sku,' . $id,
            'barcode'         => 'nullable|string|max:100',
            'description'     => 'nullable|string',
            'price'           => 'sometimes|numeric|min:0',
            'original_price'  => 'nullable|numeric|min:0',
            'cost_price'      => 'nullable|numeric|min:0',
            'stock_quantity'  => 'nullable|integer|min:0',
            'category_id'     => 'nullable|exists:categories,id',
            'brand_id'        => 'nullable|exists:brands,id',
            'image_url'       => 'nullable|string',
            'images'          => 'nullable|array',
            'is_active'       => 'nullable|boolean',
            'is_visible'      => 'nullable|boolean',
            'is_featured'     => 'nullable|boolean',
            'warranty_period' => 'nullable|string',
            'specifications'  => 'nullable|array',
        ]);

        if ($request->has('is_visible') && !$request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_visible');
        } elseif ($request->has('is_active') && !$request->has('is_visible')) {
            $validated['is_visible'] = $request->boolean('is_active');
        }

        $product->update($validated);

        return response()->json([
            'success' => true,
            'id'      => $product->id,
            'product' => $product,
            'data'    => $product,
            'message' => 'Product updated successfully',
        ]);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ]);
    }
}
