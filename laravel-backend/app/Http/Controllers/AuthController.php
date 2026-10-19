<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthController extends Controller
{
    /**
     * Get the list of existing columns on the `users` table safely.
     */
    private function getUserColumns(): array
    {
        try {
            $cols = Schema::getColumnListing('users');
            if (!empty($cols)) {
                return $cols;
            }
        } catch (\Throwable $e) {
            // Fallback below
        }
        return [];
    }

    /**
     * Find a user by username, name, or email without querying non-existent columns.
     */
    private function findUserByIdentifier(string $identifier): ?User
    {
        $cols = $this->getUserColumns();
        $candidateCols = ['username', 'name', 'email'];

        if (!empty($cols)) {
            $validCols = array_values(array_intersect($candidateCols, $cols));
            if (!empty($validCols)) {
                try {
                    return User::where(function ($q) use ($validCols, $identifier) {
                        foreach ($validCols as $idx => $col) {
                            if ($idx === 0) {
                                $q->where($col, $identifier);
                            } else {
                                $q->orWhere($col, $identifier);
                            }
                        }
                    })->first();
                } catch (\Throwable $e) {
                    // Fall through to per-column probing if needed
                }
            }
        }

        // Safe per-column fallback (never combines unknown columns in a single WHERE)
        foreach ($candidateCols as $col) {
            try {
                $user = User::where($col, $identifier)->first();
                if ($user) {
                    return $user;
                }
            } catch (\Throwable $e) {
                // Column does not exist; try next candidate column
                continue;
            }
        }

        return null;
    }

    /**
     * Resolve roles array for a user across different database schemas.
     */
    private function resolveUserRoles(User $user): array
    {
        $roles = [];

        if (!empty($user->roles)) {
            $raw = is_string($user->roles) ? json_decode($user->roles, true) : $user->roles;
            if (is_array($raw)) {
                $roles = array_merge($roles, $raw);
            }
        }

        try {
            if (Schema::hasTable('user_roles')) {
                $dbRoles = DB::table('user_roles')
                    ->where('user_id', $user->id)
                    ->pluck('role')
                    ->toArray();
                if (!empty($dbRoles)) {
                    $roles = array_merge($roles, $dbRoles);
                }
            }
        } catch (\Throwable $e) {
            // Ignore if table doesn't exist
        }

        if (!empty($user->role) && is_string($user->role)) {
            $roles[] = $user->role;
        }

        $roles = array_values(array_unique(array_filter($roles)));

        if (empty($roles)) {
            $uname = strtolower((string) ($user->username ?? $user->name ?? ''));
            if ($uname === 'admin') {
                $roles = ['super_admin', 'admin'];
            } else {
                $roles = ['admin'];
            }
        }

        return $roles;
    }

    /**
     * Format user payload consistently for frontend consumption.
     */
    private function formatUserData(User $user): array
    {
        $roles = $this->resolveUserRoles($user);
        $username = $user->username ?? $user->name ?? $user->email ?? 'admin';
        $fullName = $user->full_name ?? $user->name ?? $username;

        return [
            'id'        => $user->id,
            'username'  => $username,
            'name'      => $user->name ?? $username,
            'full_name' => $fullName,
            'email'     => $user->email ?? null,
            'role'      => $roles[0] ?? 'admin',
            'roles'     => $roles,
        ];
    }

    /**
     * Generate token and persist session across JWT, Sanctum, DB tables, and Cache.
     */
    private function issueTokenAndSession(Request $request, User $user): string
    {
        $roles = $this->resolveUserRoles($user);
        $token = null;

        // 1. If User model uses Sanctum HasApiTokens and personal_access_tokens exists
        try {
            if (method_exists($user, 'createToken') && Schema::hasTable('personal_access_tokens')) {
                $token = $user->createToken('admin-token')->plainTextToken;
            }
        } catch (\Throwable $e) {
            $token = null;
        }

        // 2. Otherwise generate JWT (if available) or random 64-char token
        if (!$token) {
            if (class_exists(JWT::class)) {
                $secret = env('JWT_SECRET', env('APP_KEY', 'realtech-secret-key-12345'));
                $payload = [
                    'iss'      => env('APP_URL', 'http://localhost'),
                    'sub'      => $user->id,
                    'username' => $user->username ?? $user->name ?? 'admin',
                    'email'    => $user->email ?? null,
                    'role'     => $roles[0] ?? 'admin',
                    'roles'    => $roles,
                    'iat'      => time(),
                    'exp'      => time() + (60 * 60 * 24 * 30), // 30 days
                ];
                $token = JWT::encode($payload, $secret, 'HS256');
            } else {
                $token = bin2hex(random_bytes(32));
            }
        }

        // 3. If personal_access_tokens exists and we didn't use createToken, insert hashed token
        try {
            if (Schema::hasTable('personal_access_tokens') && !str_contains($token, '|')) {
                DB::table('personal_access_tokens')->insert([
                    'tokenable_type' => get_class($user),
                    'tokenable_id'   => $user->id,
                    'name'           => 'admin-token',
                    'token'          => hash('sha256', $token),
                    'abilities'      => json_encode(['*']),
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        // 4. Update api_token / remember_token on users table if those columns exist
        try {
            $userCols = $this->getUserColumns();
            $updates = [];
            if (in_array('api_token', $userCols, true)) {
                $updates['api_token'] = substr($token, 0, 100);
            }
            if (in_array('remember_token', $userCols, true)) {
                $updates['remember_token'] = substr($token, 0, 100);
            }
            if (!empty($updates)) {
                DB::table('users')->where('id', $user->id)->update($updates);
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        // 5. Record session metadata for /api/auth/sessions and session-based middlewares
        $ua = (string) $request->userAgent();
        $device = preg_match('/Mobile|Android|iPhone/i', $ua)
            ? (preg_match('/iPad|Tablet/i', $ua) ? 'Tablet' : 'Mobile')
            : 'Desktop';
        $browser = str_contains($ua, 'Edg') ? 'Edge'
            : (str_contains($ua, 'Chrome') ? 'Chrome'
            : (str_contains($ua, 'Firefox') ? 'Firefox'
            : (str_contains($ua, 'Safari') ? 'Safari' : 'Browser')));
        $os = str_contains($ua, 'Windows') ? 'Windows'
            : (str_contains($ua, 'Mac') ? 'macOS'
            : (str_contains($ua, 'Android') ? 'Android'
            : (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') ? 'iOS'
            : (str_contains($ua, 'Linux') ? 'Linux' : 'OS'))));
        $ip = (string) ($request->ip() ?? '127.0.0.1');
        $sessionId = substr(hash('sha256', $token), 0, 24);

        foreach (['admin_sessions', 'user_sessions'] as $sessionTable) {
            try {
                if (Schema::hasTable($sessionTable)) {
                    $sCols = Schema::getColumnListing($sessionTable);
                    $row = [];
                    if (in_array('id', $sCols, true)) {
                        // Only set string id if id column is not auto-increment integer
                        // Skip setting 'id' if it's standard auto-increment; try insert without id first
                    }
                    if (in_array('session_id', $sCols, true)) $row['session_id'] = $sessionId;
                    if (in_array('user_id', $sCols, true)) $row['user_id'] = $user->id;
                    if (in_array('token', $sCols, true)) $row['token'] = $token;
                    if (in_array('token_hash', $sCols, true)) $row['token_hash'] = hash('sha256', $token);
                    if (in_array('device', $sCols, true)) $row['device'] = $device;
                    if (in_array('browser', $sCols, true)) $row['browser'] = $browser;
                    if (in_array('os', $sCols, true)) $row['os'] = $os;
                    if (in_array('ip', $sCols, true)) $row['ip'] = $ip;
                    if (in_array('ip_address', $sCols, true)) $row['ip_address'] = $ip;
                    if (in_array('user_agent', $sCols, true)) $row['user_agent'] = substr($ua, 0, 255);
                    if (in_array('logged_in_at', $sCols, true)) $row['logged_in_at'] = now();
                    if (in_array('last_active', $sCols, true)) $row['last_active'] = now();
                    if (in_array('expires_at', $sCols, true)) $row['expires_at'] = now()->addDays(30);
                    if (in_array('created_at', $sCols, true)) $row['created_at'] = now();
                    if (in_array('updated_at', $sCols, true)) $row['updated_at'] = now();

                    if (!empty($row)) {
                        DB::table($sessionTable)->insert($row);
                    }
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        // 6. Store in Cache for fast lookup
        try {
            $ttl = now()->addDays(30);
            Cache::put("admin_token:{$token}", $user->id, $ttl);
            Cache::put("admin_token_{$token}", $user->id, $ttl);
            Cache::put("auth_token:{$token}", $user->id, $ttl);
            Cache::put("auth_token_{$token}", $user->id, $ttl);

            $sessionsKey = "admin_active_sessions:{$user->id}";
            $existing = Cache::get($sessionsKey, []);
            if (!is_array($existing)) $existing = [];
            $existing[$sessionId] = [
                'id'           => $sessionId,
                'token_hash'   => hash('sha256', $token),
                'device'       => $device,
                'browser'      => $browser,
                'os'           => $os,
                'ip'           => $ip,
                'logged_in_at' => now()->toIso8601String(),
                'last_active'  => now()->toIso8601String(),
            ];
            Cache::put($sessionsKey, $existing, $ttl);
        } catch (\Throwable $e) {
            // Ignore cache errors
        }

        return $token;
    }

    /**
     * Resolve authenticated user from Request / Bearer token.
     */
    private function resolveUserFromRequest(Request $request): ?User
    {
        $user = $request->user() ?? $request->get('auth_user');
        if ($user instanceof User) {
            return $user;
        }

        $header = (string) $request->header('Authorization', '');
        $token = null;
        if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            $token = $matches[1];
        }
        if (!$token) {
            return null;
        }

        // 1. Check Cache
        try {
            $cachedId = Cache::get("admin_token:{$token}")
                ?? Cache::get("admin_token_{$token}")
                ?? Cache::get("auth_token:{$token}")
                ?? Cache::get("auth_token_{$token}");
            if ($cachedId) {
                $found = User::find($cachedId);
                if ($found) return $found;
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        // 2. Check JWT
        if (class_exists(JWT::class)) {
            foreach ([env('JWT_SECRET', 'realtech-secret-key-12345'), env('APP_KEY', 'realtech-secret-key-12345')] as $secret) {
                if (!$secret) continue;
                try {
                    $decoded = JWT::decode($token, new Key($secret, 'HS256'));
                    if (!empty($decoded->sub)) {
                        $found = User::find($decoded->sub);
                        if ($found) return $found;
                    }
                } catch (\Throwable $e) {
                    // Try next method
                }
            }
        }

        // 3. Check Sanctum personal_access_tokens
        try {
            if (Schema::hasTable('personal_access_tokens')) {
                $rawToken = str_contains($token, '|') ? explode('|', $token, 2)[1] : $token;
                $pat = DB::table('personal_access_tokens')
                    ->where('token', hash('sha256', $rawToken))
                    ->first();
                if ($pat && !empty($pat->tokenable_id)) {
                    $found = User::find($pat->tokenable_id);
                    if ($found) return $found;
                }
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        // 4. Check admin_sessions / user_sessions
        foreach (['admin_sessions', 'user_sessions'] as $sessionTable) {
            try {
                if (Schema::hasTable($sessionTable)) {
                    $sCols = Schema::getColumnListing($sessionTable);
                    $q = DB::table($sessionTable);
                    if (in_array('token', $sCols, true)) {
                        $row = $q->where('token', $token)->first();
                        if ($row && !empty($row->user_id)) {
                            $found = User::find($row->user_id);
                            if ($found) return $found;
                        }
                    }
                    if (in_array('token_hash', $sCols, true)) {
                        $row = DB::table($sessionTable)->where('token_hash', hash('sha256', $token))->first();
                        if ($row && !empty($row->user_id)) {
                            $found = User::find($row->user_id);
                            if ($found) return $found;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        // 5. Check users.api_token / remember_token
        try {
            $userCols = $this->getUserColumns();
            if (in_array('api_token', $userCols, true)) {
                $found = User::where('api_token', substr($token, 0, 100))->first();
                if ($found) return $found;
            }
            if (in_array('remember_token', $userCols, true)) {
                $found = User::where('remember_token', substr($token, 0, 100))->first();
                if ($found) return $found;
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        return null;
    }

    public function register(Request $request)
    {
        $cols = $this->getUserColumns();
        $hasEmail = in_array('email', $cols, true);
        $hasUsername = in_array('username', $cols, true);
        $hasName = in_array('name', $cols, true);
        $hasFullName = in_array('full_name', $cols, true);

        $identifier = trim((string) ($request->input('email') ?? $request->input('username') ?? $request->input('name') ?? ''));
        $password = (string) $request->input('password', '');
        $fullName = trim((string) ($request->input('full_name') ?? $request->input('name') ?? $identifier));

        if (!$identifier || strlen($password) < 6) {
            return $this->error('Valid identifier and password (min 6 characters) are required', 422);
        }

        if ($this->findUserByIdentifier($identifier)) {
            return $this->error('Account already exists', 422);
        }

        $data = [
            'password' => Hash::make($password),
        ];

        if ($hasUsername) $data['username'] = $identifier;
        if ($hasName) $data['name'] = $fullName ?: $identifier;
        if ($hasFullName) $data['full_name'] = $fullName ?: $identifier;
        if ($hasEmail) $data['email'] = str_contains($identifier, '@') ? $identifier : ($identifier . '@local.user');
        if (in_array('phone', $cols, true) && $request->filled('phone')) $data['phone'] = $request->input('phone');
        if (in_array('address', $cols, true) && $request->filled('address')) $data['address'] = $request->input('address');
        if (in_array('role', $cols, true)) $data['role'] = 'customer';
        if (in_array('is_active', $cols, true)) $data['is_active'] = true;

        $user = User::create($data);
        $token = $this->issueTokenAndSession($request, $user);
        $userData = $this->formatUserData($user);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful',
            'token'   => $token,
            'user'    => $userData,
            'data'    => [
                'token' => $token,
                'user'  => $userData,
            ],
        ], 201);
    }

    public function login(Request $request)
    {
        $identifier = trim((string) ($request->input('username') ?? $request->input('email') ?? $request->input('name') ?? ''));
        $password = (string) $request->input('password', '');

        if ($identifier === '' || $password === '') {
            return $this->error('Email or username and password are required', 422);
        }

        $user = $this->findUserByIdentifier($identifier);

        $passwordValid = false;
        if ($user) {
            try {
                $passwordValid = Hash::check($password, $user->password);
            } catch (\Throwable $e) {
                $passwordValid = hash_equals((string) $user->password, $password);
            }
        }

        if (!$user || !$passwordValid) {
            return $this->error('Invalid credentials', 401);
        }

        $cols = $this->getUserColumns();
        if (in_array('is_active', $cols, true) && $user->getAttribute('is_active') !== null && !$user->is_active) {
            return $this->error('Your account is currently disabled', 403);
        }

        $token = $this->issueTokenAndSession($request, $user);
        $userData = $this->formatUserData($user);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token'   => $token,
            'user'    => $userData,
            'roles'   => $userData['roles'],
            'data'    => [
                'token' => $token,
                'user'  => $userData,
                'roles' => $userData['roles'],
            ],
        ]);
    }

    public function adminLogin(Request $request)
    {
        return $this->login($request);
    }

    public function verify(Request $request)
    {
        $user = $this->resolveUserFromRequest($request);
        if (!$user) {
            return response()->json([
                'success' => false,
                'error'   => 'Unauthorized',
                'message' => 'Invalid or expired token',
            ], 401);
        }

        $userData = $this->formatUserData($user);

        return response()->json([
            'success' => true,
            'user'    => $userData,
            'roles'   => $userData['roles'],
        ]);
    }

    public function sessions(Request $request)
    {
        $user = $this->resolveUserFromRequest($request);
        if (!$user) {
            return response()->json(['sessions' => []]);
        }

        $header = (string) $request->header('Authorization', '');
        $currentToken = preg_match('/Bearer\s+(\S+)/i', $header, $m) ? $m[1] : '';
        $currentId = $currentToken ? substr(hash('sha256', $currentToken), 0, 24) : 'current';

        $sessionsList = [];
        try {
            $cached = Cache::get("admin_active_sessions:{$user->id}", []);
            if (is_array($cached)) {
                foreach ($cached as $sid => $s) {
                    $sessionsList[] = [
                        'id'           => (string) ($s['id'] ?? $sid),
                        'device'       => $s['device'] ?? 'Desktop',
                        'browser'      => $s['browser'] ?? 'Browser',
                        'os'           => $s['os'] ?? 'OS',
                        'ip'           => $s['ip'] ?? ($request->ip() ?? '127.0.0.1'),
                        'logged_in_at' => $s['logged_in_at'] ?? now()->toIso8601String(),
                        'last_active'  => $s['last_active'] ?? now()->toIso8601String(),
                        'is_current'   => ($s['id'] ?? $sid) === $currentId,
                    ];
                }
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        if (empty($sessionsList)) {
            $ua = (string) $request->userAgent();
            $sessionsList[] = [
                'id'           => $currentId,
                'device'       => preg_match('/Mobile|Android|iPhone/i', $ua) ? 'Mobile' : 'Desktop',
                'browser'      => str_contains($ua, 'Chrome') ? 'Chrome' : 'Browser',
                'os'           => str_contains($ua, 'Windows') ? 'Windows' : (str_contains($ua, 'Mac') ? 'macOS' : 'OS'),
                'ip'           => (string) ($request->ip() ?? '127.0.0.1'),
                'logged_in_at' => now()->toIso8601String(),
                'last_active'  => now()->toIso8601String(),
                'is_current'   => true,
            ];
        }

        return response()->json([
            'success'  => true,
            'sessions' => array_values($sessionsList),
        ]);
    }

    public function revokeSession(Request $request)
    {
        $user = $this->resolveUserFromRequest($request);
        $sessionId = (string) $request->input('session_id', '');

        if ($user && $sessionId) {
            try {
                $key = "admin_active_sessions:{$user->id}";
                $cached = Cache::get($key, []);
                if (is_array($cached) && isset($cached[$sessionId])) {
                    unset($cached[$sessionId]);
                    Cache::put($key, $cached, now()->addDays(30));
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        return response()->json(['success' => true]);
    }

    public function revokeAllSessions(Request $request)
    {
        $user = $this->resolveUserFromRequest($request);
        $header = (string) $request->header('Authorization', '');
        $currentToken = preg_match('/Bearer\s+(\S+)/i', $header, $m) ? $m[1] : '';
        $currentId = $currentToken ? substr(hash('sha256', $currentToken), 0, 24) : '';

        if ($user) {
            try {
                $key = "admin_active_sessions:{$user->id}";
                $cached = Cache::get($key, []);
                if (is_array($cached)) {
                    $filtered = [];
                    if ($currentId && isset($cached[$currentId])) {
                        $filtered[$currentId] = $cached[$currentId];
                    }
                    Cache::put($key, $filtered, now()->addDays(30));
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        return response()->json(['success' => true]);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'username'         => 'nullable|string',
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6',
        ]);

        $user = $this->resolveUserFromRequest($request);
        if (!$user && !empty($validated['username'])) {
            $user = $this->findUserByIdentifier($validated['username']);
        }

        if (!$user || !Hash::check($validated['current_password'], $user->password)) {
            return $this->error('Invalid current password', 400);
        }

        $user->password = Hash::make($validated['new_password']);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    public function me(Request $request)
    {
        $user = $this->resolveUserFromRequest($request);
        if (!$user) {
            return $this->error('Unauthorized', 401);
        }
        return $this->success($this->formatUserData($user));
    }

    public function logout(Request $request)
    {
        $header = (string) $request->header('Authorization', '');
        if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
            $token = $m[1];
            try {
                Cache::forget("admin_token:{$token}");
                Cache::forget("admin_token_{$token}");
                Cache::forget("auth_token:{$token}");
                Cache::forget("auth_token_{$token}");
            } catch (\Throwable $e) {
                // Ignore
            }
        }
        return $this->success(null, 'Logged out successfully');
    }
}
