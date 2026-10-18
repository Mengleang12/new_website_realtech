<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboardSummary()
    {
        $totalSales = Order::where('status', 'completed')->sum('amount');
        $totalOrders = Order::count();
        $totalProducts = Product::where('is_active', true)->count();
        $lowStockCount = Product::where('is_active', true)->where('stock_quantity', '<=', 5)->count();

        $todaySales = Order::where('status', 'completed')
            ->whereDate('created_at', today())
            ->sum('amount');

        return response()->json([
            'success'        => true,
            'total_sales'    => (float) $totalSales,
            'total_orders'   => $totalOrders,
            'total_products' => $totalProducts,
            'low_stock'      => $lowStockCount,
            'today_sales'    => (float) $todaySales,
            'data'           => [
                'total_sales'    => (float) $totalSales,
                'total_orders'   => $totalOrders,
                'total_products' => $totalProducts,
                'low_stock'      => $lowStockCount,
                'today_sales'    => (float) $todaySales,
            ],
        ]);
    }

    public function salesDashboard(Request $request)
    {
        $days = (int) $request->get('days', 30);
        $from = $request->get('from', now()->subDays($days)->toDateString());
        $to = $request->get('to', now()->toDateString());

        $ordersQuery = Order::whereBetween(DB::raw('DATE(created_at)'), [$from, $to]);

        $totalRevenue = (float) (clone $ordersQuery)->where('payment_status', 'paid')->sum('amount');
        $totalOrders = (clone $ordersQuery)->count();
        $paidOrders = (clone $ordersQuery)->where('payment_status', 'paid')->count();
        $pendingOrders = (clone $ordersQuery)->where('payment_status', '!=', 'paid')->count();

        $lowStockItems = Product::where('is_active', true)->where('stock_quantity', '>', 0)->where('stock_quantity', '<=', 5)->count();
        $outOfStockItems = Product::where('is_active', true)->where('stock_quantity', '<=', 0)->count();
        $totalProducts = Product::where('is_active', true)->count();

        $revenueByDate = (clone $ordersQuery)
            ->selectRaw('DATE(created_at) as date, SUM(amount) as revenue, COUNT(*) as orders')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topProducts = OrderItem::whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->selectRaw('product_id, product_name, SUM(total_price) as revenue, SUM(quantity) as sales')
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        $recentSales = Order::with(['items', 'payments'])->latest()->limit(10)->get();

        return response()->json([
            'success' => true,
            'stats'   => [
                'total_revenue'      => $totalRevenue,
                'total_orders'       => $totalOrders,
                'paid_orders'        => $paidOrders,
                'pending_orders'     => $pendingOrders,
                'low_stock_items'    => $lowStockItems,
                'out_of_stock_items' => $outOfStockItems,
                'total_products'     => $totalProducts,
            ],
            'revenue_by_date' => $revenueByDate,
            'top_products'    => $topProducts,
            'recent_sales'    => $recentSales,
        ]);
    }

    public function productSales(Request $request)
    {
        $from = $request->get('from', now()->subDays(30)->toDateString());
        $to = $request->get('to', now()->toDateString());

        $summary = OrderItem::whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->selectRaw('product_id, product_name, SUM(quantity) as total_quantity, SUM(total_price) as total_revenue, AVG(unit_price) as avg_price')
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('total_revenue')
            ->get();

        $monthly = OrderItem::whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->selectRaw('product_id, product_name, DATE_FORMAT(created_at, "%Y-%m") as month, SUM(quantity) as quantity, SUM(total_price) as revenue')
            ->groupBy('product_id', 'product_name', 'month')
            ->orderBy('month')
            ->get();

        return response()->json([
            'success' => true,
            'summary' => $summary,
            'monthly' => $monthly,
            'period'  => ['from' => $from, 'to' => $to],
        ]);
    }

    public function revenueTrend(Request $request)
    {
        $from = $request->get('from', now()->subDays(30)->toDateString());
        $to = $request->get('to', now()->toDateString());
        $groupBy = $request->get('group_by', 'daily');

        $format = $groupBy === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

        $trend = Order::whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->selectRaw("DATE_FORMAT(created_at, '{$format}') as period, COUNT(*) as orders, SUM(amount) as revenue, AVG(amount) as avg_order_value")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $totalOrders = Order::whereBetween(DB::raw('DATE(created_at)'), [$from, $to])->count();
        $totalRevenue = (float) Order::whereBetween(DB::raw('DATE(created_at)'), [$from, $to])->sum('amount');
        $avgVal = $totalOrders > 0 ? ($totalRevenue / $totalOrders) : 0;

        return response()->json([
            'success' => true,
            'trend'   => $trend,
            'totals'  => [
                'total_orders'    => $totalOrders,
                'total_revenue'   => $totalRevenue,
                'avg_order_value' => round($avgVal, 2),
            ],
            'period'  => [
                'from'     => $from,
                'to'       => $to,
                'group_by' => $groupBy,
            ],
        ]);
    }

    public function profitByPeriod(Request $request)
    {
        $from = $request->get('from', now()->subDays(30)->toDateString());
        $to = $request->get('to', now()->toDateString());

        $products = OrderItem::with('product')
            ->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->selectRaw('product_id, product_name, SUM(quantity) as total_sold, SUM(total_price) as total_revenue')
            ->groupBy('product_id', 'product_name')
            ->get()
            ->map(function ($it) {
                $costPrice = (float) ($it->product?->cost_price ?? 0);
                $cog = $costPrice * $it->total_sold;
                $profit = $it->total_revenue - $cog;
                $margin = $it->total_revenue > 0 ? ($profit / $it->total_revenue) * 100 : 0;

                return [
                    'product_id'     => $it->product_id,
                    'product_name'   => $it->product_name,
                    'icon_url'       => $it->product?->image_url,
                    'total_sold'     => (int) $it->total_sold,
                    'total_revenue'  => (float) $it->total_revenue,
                    'cost_of_goods'  => round($cog, 2),
                    'profit'         => round($profit, 2),
                    'margin'         => round($margin, 1),
                ];
            });

        $totRev = $products->sum('total_revenue');
        $totCost = $products->sum('cost_of_goods');
        $totProfit = $totRev - $totCost;
        $overallMargin = $totRev > 0 ? ($totProfit / $totRev) * 100 : 0;

        return response()->json([
            'success'  => true,
            'products' => $products,
            'summary'  => [
                'total_revenue'  => round($totRev, 2),
                'total_cost'     => round($totCost, 2),
                'total_profit'   => round($totProfit, 2),
                'overall_margin' => round($overallMargin, 1),
            ],
            'period'   => ['from' => $from, 'to' => $to],
        ]);
    }

    public function customerReport(Request $request)
    {
        $from = $request->get('from', now()->subDays(30)->toDateString());
        $to = $request->get('to', now()->toDateString());

        $customers = User::where('role', 'customer')
            ->withCount('orders')
            ->withSum('orders', 'amount')
            ->get()
            ->map(function ($c) {
                $firstOrder = $c->orders()->oldest()->first();
                $lastOrder = $c->orders()->latest()->first();

                return [
                    'user_id'         => $c->id,
                    'full_name'       => $c->full_name ?? $c->name,
                    'email'           => $c->email,
                    'phone'           => $c->phone,
                    'total_orders'    => (int) ($c->orders_count ?? 0),
                    'total_spent'     => (float) ($c->orders_sum_amount ?? 0),
                    'avg_order_value' => $c->orders_count > 0 ? round(($c->orders_sum_amount ?? 0) / $c->orders_count, 2) : 0,
                    'first_purchase'  => $firstOrder?->created_at?->toDateString() ?? '',
                    'last_purchase'   => $lastOrder?->created_at?->toDateString() ?? '',
                    'unique_products' => $c->orders_count,
                ];
            });

        $totalCust = $customers->count();
        $repeatCust = $customers->where('total_orders', '>', 1)->count();

        return response()->json([
            'success'   => true,
            'customers' => $customers,
            'stats'     => [
                'total_customers'  => $totalCust,
                'repeat_customers' => $repeatCust,
                'repeat_rate'      => $totalCust > 0 ? round(($repeatCust / $totalCust) * 100, 1) : 0,
            ],
            'period'    => ['from' => $from, 'to' => $to],
        ]);
    }

    public function salesReport(Request $request)
    {
        $startDate = $request->get('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());

        $sales = Order::where('status', 'completed')
            ->whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders_count, SUM(amount) as total_amount')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'sales'   => $sales,
            'data'    => $sales,
        ]);
    }
}
