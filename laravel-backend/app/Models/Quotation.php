<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Quotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'quotation_number',
        'customer_name',
        'customer_phone',
        'customer_email',
        'items',
        'subtotal',
        'discount',
        'total_amount',
        'status', // 'draft', 'sent', 'accepted', 'rejected', 'expired'
        'valid_until',
        'notes',
    ];

    protected $casts = [
        'items' => 'array',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'valid_until' => 'date',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($q) {
            if (empty($q->quotation_number)) {
                $q->quotation_number = 'QT-' . strtoupper(Str::random(8));
            }
        });
    }
}
