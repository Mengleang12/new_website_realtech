<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Warranty;

class WarrantyController extends Controller
{
    public function index()
    {
        $warranties = Warranty::all();

        return response()->json([
            'success'    => true,
            'warranties' => $warranties,
            'data'       => $warranties,
        ]);
    }

    public function show($id)
    {
        $warranty = Warranty::findOrFail($id);

        return response()->json([
            'success'  => true,
            'warranty' => $warranty,
            'data'     => $warranty,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:100',
            'duration_days' => 'required|integer|min:0',
            'policy'        => 'nullable|string',
            'is_active'     => 'nullable|boolean',
        ]);

        $warranty = Warranty::create($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Warranty policy created successfully',
            'warranty' => $warranty,
            'data'     => $warranty,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $warranty = Warranty::findOrFail($id);

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'duration_days' => 'sometimes|integer|min:0',
            'policy'        => 'nullable|string',
            'is_active'     => 'nullable|boolean',
        ]);

        $warranty->update($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Warranty policy updated successfully',
            'warranty' => $warranty,
            'data'     => $warranty,
        ]);
    }

    public function destroy($id)
    {
        $warranty = Warranty::findOrFail($id);
        $warranty->delete();

        return response()->json([
            'success' => true,
            'message' => 'Warranty policy deleted successfully',
        ]);
    }
}
