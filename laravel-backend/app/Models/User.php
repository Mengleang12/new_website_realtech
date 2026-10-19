<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'username',
        'name',
        'full_name',
        'email',
        'password',
        'phone',
        'telegram',
        'facebook_name',
        'address',
        'role', // 'admin', 'staff', 'customer'
        'roles',
        'is_active',
        'avatar',
        'permissions',
        'api_token',
        'remember_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'api_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'permissions' => 'array',
        'roles' => 'array',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function isAdmin(): bool
    {
        if ($this->role === 'admin' || $this->role === 'super_admin') {
            return true;
        }
        if (is_array($this->roles) && (in_array('admin', $this->roles, true) || in_array('super_admin', $this->roles, true))) {
            return true;
        }
        if (($this->username ?? $this->name) === 'admin') {
            return true;
        }
        return false;
    }

    public function isStaff(): bool
    {
        if ($this->role === 'staff' || $this->role === 'moderator' || $this->isAdmin()) {
            return true;
        }
        if (is_array($this->roles) && (in_array('staff', $this->roles, true) || in_array('moderator', $this->roles, true))) {
            return true;
        }
        return false;
    }
}
