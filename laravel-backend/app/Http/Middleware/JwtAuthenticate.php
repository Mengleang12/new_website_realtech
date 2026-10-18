<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class JwtAuthenticate
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $header = $request->header('Authorization', '');
        if (!preg_match('/Bearer\s(\S+)/', $header, $matches)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Missing or malformed token.',
            ], 401);
        }

        $token = $matches[1];
        $secret = env('JWT_SECRET', 'realtech-secret-key-12345');

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $user = User::find($decoded->sub ?? null);

            if (!$user || !$user->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized: User not found or inactive.',
                ], 401);
            }

            Auth::setUser($user);
            $request->merge(['auth_user' => $user]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Invalid token (' . $e->getMessage() . ').',
            ], 401);
        }

        return $next($request);
    }
}
