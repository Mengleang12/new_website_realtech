<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerReceivedNote extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'order_id',
        'invoice_ref',
        'receipt_type', // 'full', 'partial'
        'receiver_name',
        'receiver_phone',
        'receiver_relation',
        'receiver_address',
        'delivery_type',
        'delivered_by_name',
        'total_ordered_items',
        'total_received_in_this_note',
        'total_pending_remaining',
        'general_notes',
        'customer_signature',
        'customer_signed_at',
        'is_verified',
        'items',
    ];

    protected $casts = [
        'total_ordered_items' => 'integer',
        'total_received_in_this_note' => 'integer',
        'total_pending_remaining' => 'integer',
        'is_verified' => 'boolean',
        'items' => 'array',
        'customer_signed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
