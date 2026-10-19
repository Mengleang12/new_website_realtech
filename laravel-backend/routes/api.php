<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SerialController;
use App\Http\Controllers\WarrantyController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\SliderController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ReceivedNoteController;
use App\Http\Controllers\CustomerController;

/*
|--------------------------------------------------------------------------
| API Routes - Realtech Computer POS & eCommerce Backend
|--------------------------------------------------------------------------
*/

// Health Check
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()]);
});

// Authentication
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/admin-login', [AuthController::class, 'adminLogin']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::get('/verify', [AuthController::class, 'verify']);
    Route::get('/sessions', [AuthController::class, 'sessions']);
    Route::post('/sessions/revoke', [AuthController::class, 'revokeSession']);
    Route::post('/sessions/revoke-all', [AuthController::class, 'revokeAllSessions']);

    Route::middleware('jwt.auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Public store endpoints
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::get('/brands', [BrandController::class, 'index']);
Route::get('/brands/{id}', [BrandController::class, 'show']);
Route::get('/sliders', [SliderController::class, 'index']);
Route::get('/warranties', [WarrantyController::class, 'index']);
Route::post('/coupons/validate', [CouponController::class, 'validateCoupon']);
Route::get('/quotations/view/{number}', [QuotationController::class, 'viewByNumber']);
Route::get('/admin/settings/branding', [SettingsController::class, 'getBranding']);

// Public / Customer Checkout & Orders
Route::get('/orders', [OrderController::class, 'index']);
Route::get('/orders/{id}', [OrderController::class, 'show']);
Route::post('/orders', [OrderController::class, 'store']);
Route::put('/orders/{id}', [OrderController::class, 'update']);
Route::delete('/orders/{id}', [OrderController::class, 'destroy']);
Route::post('/orders/{id}/payments', [OrderController::class, 'addPayment']);
Route::delete('/orders/{id}/payments/{paymentId}', [OrderController::class, 'deletePayment']);
Route::post('/orders/{id}/approve', [OrderController::class, 'approve']);
Route::post('/orders/bulk-delete', [OrderController::class, 'bulkDelete']);

// Customer Received Notes (Public & Admin)
Route::get('/received-notes', [ReceivedNoteController::class, 'index']);
Route::get('/received-notes/{id}', [ReceivedNoteController::class, 'show']);
Route::post('/received-notes', [ReceivedNoteController::class, 'store']);
Route::delete('/received-notes/{id}', [ReceivedNoteController::class, 'destroy']);

Route::get('/admin/received-notes', [ReceivedNoteController::class, 'index']);
Route::get('/admin/received-notes/{id}', [ReceivedNoteController::class, 'show']);
Route::post('/admin/received-notes', [ReceivedNoteController::class, 'store']);
Route::delete('/admin/received-notes/{id}', [ReceivedNoteController::class, 'destroy']);

// File Uploads
Route::post('/upload', [UploadController::class, 'upload']);
Route::post('/admin/upload', [UploadController::class, 'upload']);

// Analytics & Reports (Standard Endpoints)
Route::get('/analytics/dashboard', [ReportController::class, 'dashboardSummary']);
Route::get('/reports/sales', [ReportController::class, 'salesReport']);

// --------------------------------------------------------------------------
// Admin Group Routes (Matching frontend api.ts admin/* endpoints)
// --------------------------------------------------------------------------
Route::prefix('admin')->group(function () {
    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}', [OrderController::class, 'update']);
    Route::delete('/orders/{id}', [OrderController::class, 'destroy']);
    Route::post('/orders/{id}/approve', [OrderController::class, 'approve']);
    Route::post('/orders/bulk-delete', [OrderController::class, 'bulkDelete']);
    Route::post('/orders/{id}/payments', [OrderController::class, 'addPayment']);
    Route::delete('/orders/{id}/payments/{paymentId}', [OrderController::class, 'deletePayment']);

    // Sales & POS
    Route::prefix('sales')->group(function () {
        Route::post('/create', [OrderController::class, 'store']);
        Route::get('/customers', [OrderController::class, 'searchCustomers']);
        Route::get('/products', [OrderController::class, 'searchProducts']);
        Route::get('/dashboard', [ReportController::class, 'salesDashboard']);
        Route::get('/stock', [OrderController::class, 'stockOverview']);
        Route::put('/stock/{productId}', [OrderController::class, 'updateStock']);
        Route::post('/stock/bulk', [OrderController::class, 'bulkUpdateStock']);
        Route::patch('/stock/{productId}/visibility', [OrderController::class, 'toggleProductVisibility']);
    });

    // Customer Management
    Route::prefix('customers')->group(function () {
        Route::get('/', [CustomerController::class, 'index']);
        Route::get('/{id}', [CustomerController::class, 'show']);
        Route::post('/', [CustomerController::class, 'store']);
        Route::put('/{id}', [CustomerController::class, 'update']);
        Route::delete('/{id}', [CustomerController::class, 'destroy']);
        Route::get('/{id}/orders', [CustomerController::class, 'getOrders']);
        Route::post('/{id}/grant-product', [CustomerController::class, 'grantProduct']);
        Route::delete('/{id}/revoke-product/{productId}', [CustomerController::class, 'revokeProduct']);
    });

    // Reports & Analytics
    Route::prefix('reports')->group(function () {
        Route::get('/product-sales', [ReportController::class, 'productSales']);
        Route::get('/revenue-trend', [ReportController::class, 'revenueTrend']);
        Route::get('/profit-by-period', [ReportController::class, 'profitByPeriod']);
        Route::get('/customer-report', [ReportController::class, 'customerReport']);
    });
    Route::get('/analytics', [ReportController::class, 'salesDashboard']);
    Route::get('/analytics/profit', [ReportController::class, 'profitByPeriod']);

    // Products Management
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Categories
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // Brands
    Route::get('/brands', [BrandController::class, 'index']);
    Route::post('/brands', [BrandController::class, 'store']);
    Route::put('/brands/{id}', [BrandController::class, 'update']);
    Route::delete('/brands/{id}', [BrandController::class, 'destroy']);

    // Suppliers
    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::get('/suppliers/{id}', [SupplierController::class, 'show']);
    Route::post('/suppliers', [SupplierController::class, 'store']);
    Route::put('/suppliers/{id}', [SupplierController::class, 'update']);
    Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);

    // Warranties
    Route::get('/warranties', [WarrantyController::class, 'index']);
    Route::post('/warranties', [WarrantyController::class, 'store']);
    Route::put('/warranties/{id}', [WarrantyController::class, 'update']);
    Route::delete('/warranties/{id}', [WarrantyController::class, 'destroy']);

    // Serial Numbers
    Route::get('/serials', [SerialController::class, 'index']);
    Route::post('/serials', [SerialController::class, 'store']);
    Route::put('/serials/{id}', [SerialController::class, 'update']);
    Route::delete('/serials/{id}', [SerialController::class, 'destroy']);
    Route::post('/serials/lookup', [SerialController::class, 'lookup']);
    Route::post('/serials/for-print', [SerialController::class, 'forPrint']);
    Route::get('/serials/latest-id', [SerialController::class, 'latestId']);
    Route::post('/serials/since', [SerialController::class, 'since']);

    // Purchases
    Route::get('/purchases', [PurchaseController::class, 'index']);
    Route::get('/purchases/{id}', [PurchaseController::class, 'show']);
    Route::post('/purchases', [PurchaseController::class, 'store']);
    Route::put('/purchases/{id}', [PurchaseController::class, 'update']);
    Route::delete('/purchases/{id}', [PurchaseController::class, 'destroy']);
    Route::put('/purchases/{id}/status', [PurchaseController::class, 'updateStatus']);
    Route::post('/purchases/{id}/receive-items', [PurchaseController::class, 'receiveItems']);
    Route::post('/purchases/{id}/payments', [PurchaseController::class, 'addPayment']);
    Route::delete('/purchases/{id}/payments/{paymentId}', [PurchaseController::class, 'deletePayment']);
    Route::post('/purchases/{id}/expenses', [PurchaseController::class, 'addExpense']);
    Route::delete('/purchases/{id}/expenses/{expenseId}', [PurchaseController::class, 'deleteExpense']);
    Route::delete('/purchases/{id}/receive-logs/{logId}', [PurchaseController::class, 'deleteReceiveLog']);

    // Quotations
    Route::get('/quotations', [QuotationController::class, 'index']);
    Route::get('/quotations/{id}', [QuotationController::class, 'show']);
    Route::post('/quotations', [QuotationController::class, 'store']);
    Route::put('/quotations/{id}', [QuotationController::class, 'update']);
    Route::delete('/quotations/{id}', [QuotationController::class, 'destroy']);
    Route::put('/quotations/{id}/status', [QuotationController::class, 'updateStatus']);
    Route::post('/quotations/{id}/convert', [QuotationController::class, 'convert']);
    Route::post('/quotations/{id}/mark-converted', [QuotationController::class, 'markConverted']);

    // Coupons
    Route::get('/coupons', [CouponController::class, 'index']);
    Route::post('/coupons', [CouponController::class, 'store']);
    Route::put('/coupons/{id}', [CouponController::class, 'update']);
    Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);
    Route::post('/coupons/{id}/assign', [CouponController::class, 'assignUsers']);
    Route::get('/coupons/{id}/users', [CouponController::class, 'getUsers']);
    Route::delete('/coupons/{id}/users/{userId}', [CouponController::class, 'removeUser']);

    // Sliders
    Route::get('/sliders', [SliderController::class, 'index']);
    Route::post('/sliders', [SliderController::class, 'store']);
    Route::put('/sliders/{id}', [SliderController::class, 'update']);
    Route::delete('/sliders/{id}', [SliderController::class, 'destroy']);
    Route::post('/sliders/reorder', [SliderController::class, 'reorder']);
});

// Direct aliases for non-admin prefixed paths
Route::post('/products', [ProductController::class, 'store']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);

Route::post('/categories', [CategoryController::class, 'store']);
Route::put('/categories/{id}', [CategoryController::class, 'update']);
Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

Route::post('/brands', [BrandController::class, 'store']);
Route::put('/brands/{id}', [BrandController::class, 'update']);
Route::delete('/brands/{id}', [BrandController::class, 'destroy']);

Route::get('/serials', [SerialController::class, 'index']);
Route::post('/serials', [SerialController::class, 'store']);
Route::put('/serials/{id}', [SerialController::class, 'update']);
Route::delete('/serials/{id}', [SerialController::class, 'destroy']);

Route::post('/warranties', [WarrantyController::class, 'store']);
Route::put('/warranties/{id}', [WarrantyController::class, 'update']);
Route::delete('/warranties/{id}', [WarrantyController::class, 'destroy']);

Route::get('/suppliers', [SupplierController::class, 'index']);
Route::get('/suppliers/{id}', [SupplierController::class, 'show']);
Route::post('/suppliers', [SupplierController::class, 'store']);
Route::put('/suppliers/{id}', [SupplierController::class, 'update']);
Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);

Route::get('/purchases', [PurchaseController::class, 'index']);
Route::get('/purchases/{id}', [PurchaseController::class, 'show']);
Route::post('/purchases', [PurchaseController::class, 'store']);
Route::put('/purchases/{id}', [PurchaseController::class, 'update']);
Route::post('/purchases/{id}/receive', [PurchaseController::class, 'receiveItems']);
Route::post('/purchases/{id}/receive-items', [PurchaseController::class, 'receiveItems']);

Route::get('/quotations', [QuotationController::class, 'index']);
Route::get('/quotations/{id}', [QuotationController::class, 'show']);
Route::post('/quotations', [QuotationController::class, 'store']);
Route::put('/quotations/{id}', [QuotationController::class, 'update']);
Route::delete('/quotations/{id}', [QuotationController::class, 'destroy']);

Route::get('/coupons', [CouponController::class, 'index']);
Route::post('/coupons', [CouponController::class, 'store']);
Route::put('/coupons/{id}', [CouponController::class, 'update']);
Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);

Route::post('/sliders', [SliderController::class, 'store']);
Route::put('/sliders/{id}', [SliderController::class, 'update']);
Route::delete('/sliders/{id}', [SliderController::class, 'destroy']);
