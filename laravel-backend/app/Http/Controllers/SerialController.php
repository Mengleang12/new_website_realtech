<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SerialNumber;

class SerialController extends Controller
{
    public function index(Request $request)
    {
        $query = SerialNumber::with('product');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('serial_number', 'like', "%{$s}%");
        }

        $perPage = min(100, max(1, (int) $request->get('limit', $request->get('per_page', 50))));
        $paginated = $query->latest()->paginate($perPage);

        return response()->json([
            'success'    => true,
            'serials'    => $paginated->items(),
            'data'       => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'total_pages'  => $paginated->lastPage(),
                'total'        => $paginated->total(),
                'per_page'     => $paginated->perPage(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        if ($request->has('serials') && is_array($request->serials)) {
            $validated = $request->validate([
                'product_id'              => 'required|exists:products,id',
                'variant_id'              => 'nullable|integer',
                'serials'                 => 'required|array',
                'serials.*.serial_number' => 'required|string',
                'serials.*.notes'         => 'nullable|string',
            ]);

            $created = [];
            $duplicates = [];

            foreach ($validated['serials'] as $item) {
                $code = trim($item['serial_number']);
                if (empty($code)) continue;

                $exists = SerialNumber::where('serial_number', $code)->exists();
                if ($exists) {
                    $duplicates[] = $code;
                } else {
                    $sn = SerialNumber::create([
                        'product_id'    => $validated['product_id'],
                        'serial_number' => $code,
                        'status'        => 'available',
                        'notes'         => $item['notes'] ?? null,
                    ]);
                    $created[] = $sn;
                }
            }

            return response()->json([
                'success'    => true,
                'message'    => count($created) . ' serials created' . (count($duplicates) ? ', ' . count($duplicates) . ' duplicates skipped' : ''),
                'created'    => $created,
                'duplicates' => $duplicates,
                'data'       => $created,
            ], 201);
        }

        $validated = $request->validate([
            'product_id'    => 'required|exists:products,id',
            'serial_number' => 'required|string|max:100|unique:serial_numbers,serial_number',
            'status'        => 'nullable|string|in:available,sold,defective,returned',
            'notes'         => 'nullable|string',
        ]);

        $serial = SerialNumber::create([
            'product_id'    => $validated['product_id'],
            'serial_number' => $validated['serial_number'],
            'status'        => $validated['status'] ?? 'available',
            'notes'         => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'serial'  => $serial,
            'data'    => $serial,
            'message' => 'Serial number recorded',
        ], 201);
    }

    public function lookup(Request $request)
    {
        $code = trim((string) $request->input('code'));
        $serial = SerialNumber::with('product')->where('serial_number', $code)->first();

        if (!$serial) {
            return response()->json([
                'found'   => false,
                'message' => 'Serial number not found',
            ]);
        }

        return response()->json([
            'found'   => true,
            'serial'  => $serial,
            'product' => $serial->product,
        ]);
    }

    public function forPrint(Request $request)
    {
        $ids = $request->input('ids', []);
        $serials = SerialNumber::with('product')->whereIn('id', $ids)->get();

        return response()->json([
            'success' => true,
            'serials' => $serials,
        ]);
    }

    public function latestId()
    {
        $latest = SerialNumber::max('id') ?? 0;

        return response()->json([
            'success'   => true,
            'latest_id' => $latest,
        ]);
    }

    public function since(Request $request)
    {
        $afterId = (int) $request->input('after_id', 0);
        $serials = SerialNumber::with('product')->where('id', '>', $afterId)->get();

        return response()->json([
            'success' => true,
            'serials' => $serials,
        ]);
    }

    public function update(Request $request, $id)
    {
        $serial = SerialNumber::findOrFail($id);
        $validated = $request->validate([
            'serial_number' => 'sometimes|string|max:100|unique:serial_numbers,serial_number,' . $id,
            'status'        => 'nullable|string|in:available,sold,defective,returned',
            'notes'         => 'nullable|string',
        ]);

        $serial->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Serial number updated',
            'serial'  => $serial,
            'data'    => $serial,
        ]);
    }

    public function destroy($id)
    {
        $serial = SerialNumber::findOrFail($id);
        $serial->delete();

        return response()->json([
            'success' => true,
            'message' => 'Serial number deleted',
        ]);
    }
}
