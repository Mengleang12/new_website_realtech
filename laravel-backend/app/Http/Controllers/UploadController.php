<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
        ]);

        $file = $request->file('file');
        $filename = time() . '_' . Str::random(8) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('uploads', $filename, 'public');

        $url = env('APP_URL', 'http://localhost') . '/storage/' . $path;

        return $this->success([
            'url'      => $url,
            'filename' => $filename,
            'path'     => $path,
        ], 'File uploaded successfully');
    }
}
