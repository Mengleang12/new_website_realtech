<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Slider;

class SliderController extends Controller
{
    public function index()
    {
        $sliders = Slider::orderBy('sort_order')->get();

        return response()->json([
            'success' => true,
            'sliders' => $sliders,
            'data'    => $sliders,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'      => 'required|string|max:150',
            'subtitle'   => 'nullable|string|max:255',
            'image_url'  => 'required|string',
            'link_url'   => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active'  => 'nullable|boolean',
        ]);

        $slider = Slider::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Slider created successfully',
            'slider'  => $slider,
            'data'    => $slider,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $slider = Slider::findOrFail($id);

        $validated = $request->validate([
            'title'      => 'sometimes|string|max:150',
            'subtitle'   => 'nullable|string|max:255',
            'image_url'  => 'sometimes|string',
            'link_url'   => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active'  => 'nullable|boolean',
        ]);

        $slider->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Slider updated successfully',
            'slider'  => $slider,
            'data'    => $slider,
        ]);
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'order' => 'required|array',
        ]);

        foreach ($validated['order'] as $index => $id) {
            Slider::where('id', $id)->update(['sort_order' => $index + 1]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sliders reordered successfully',
        ]);
    }

    public function destroy($id)
    {
        $slider = Slider::findOrFail($id);
        $slider->delete();

        return response()->json([
            'success' => true,
            'message' => 'Slider deleted successfully',
        ]);
    }
}
