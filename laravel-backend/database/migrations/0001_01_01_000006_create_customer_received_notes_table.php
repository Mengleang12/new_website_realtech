<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_received_notes', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->uuid('order_id');
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->string('invoice_ref');
            $table->string('receipt_type')->default('full'); // 'full', 'partial'
            $table->string('receiver_name');
            $table->string('receiver_phone')->nullable();
            $table->string('receiver_relation')->default('self');
            $table->text('receiver_address')->nullable();
            $table->string('delivery_type')->default('store_pickup');
            $table->string('delivered_by_name')->nullable();
            $table->integer('total_ordered_items')->default(0);
            $table->integer('total_received_in_this_note')->default(0);
            $table->integer('total_pending_remaining')->default(0);
            $table->text('general_notes')->nullable();
            $table->longText('customer_signature')->nullable();
            $table->timestamp('customer_signed_at')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->json('items');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_received_notes');
    }
};
