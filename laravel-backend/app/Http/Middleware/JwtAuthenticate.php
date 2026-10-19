<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class JwtAuthenticate
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $header = (string) $request->header('Authorization', '');
        if (!preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            return response()->json([
                'success' => false,
                'error'   => 'Unauthorized',
                'message' => 'Unauthorized: Missing or malformed token.',
            ], 401);
        }

        $token = $matches[1];
        $user = null;

        // 1. Check Cache
        try {
            $cachedId = Cache::get("admin_token:{$token}")
                ?? Cache::get("admin_token_{$token}")
                ?? Cache::get("auth_token:{$token}")
                ?? Cache::get("auth_token_{$token}");
            if ($cachedId) {
                $user = User::find($cachedId);
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        // 2. Check JWT
        if (!$user && class_exists(JWT::class)) {
            foreach ([env('JWT_SECRET', 'realtech-secret-key-12345'), env('APP_KEY', 'realtech-secret-key-12345')] as $secret) {
                if (!$secret) continue;
                try {
                    $decoded = JWT::decode($token, new Key($secret, 'HS256'));
                    $user = User::find($decoded->sub ?? null);
                    if ($user) break;
                } catch (\Throwable $e) {
                    // Continue
                }
            }
        }

        // 3. Check Sanctum personal_access_tokens
        if (!$user) {
            try {
                if (Schema::hasTable('personal_access_tokens')) {
                    $rawToken = str_contains($token, '|') ? explode('|', $token, 2)[1] : $token;
                    $pat = DB::table('personal_access_tokens')
                        ->where('token', hash('sha256', $rawToken))
                        ->first();
                    if ($pat && !empty($pat->tokenable_id)) {
                        $user = User::find($pat->tokenable_id);
                    }
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'error'   => 'Unauthorized',
                'message' => 'Unauthorized: Invalid or expired token.',
            ], 401);
        }

        try {
            if (Schema::hasColumn('users', 'is_active') && $user->getAttribute('is_active') !== null && !$user->is_active) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Account disabled',
                    'message' => 'Unauthorized: User account is inactive.',
                ], 403);
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        Auth::setUser($user);
        $request->merge(['auth_user' => $user]);

        return $next($request);
    }
}
