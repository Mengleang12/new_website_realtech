<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Warranty;
use App\Models\Product;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Super Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@realtech.local'],
            [
                'name'       => 'Administrator',
                'full_name'  => 'System Administrator',
                'password'   => Hash::make('admin123456'),
                'role'       => 'admin',
                'is_active'  => true,
                'phone'      => '+855 12 345 678',
            ]
        );

        // 2. Default Warranties
        $warranties = [
            ['name' => '1 Month Warranty', 'duration_days' => 30, 'policy' => 'Covers manufacturer defects for 30 days.'],
            ['name' => '6 Months Warranty', 'duration_days' => 180, 'policy' => 'Standard hardware warranty coverage for 6 months.'],
            ['name' => '1 Year Warranty', 'duration_days' => 365, 'policy' => 'Comprehensive 1-year parts and labor warranty.'],
            ['name' => '2 Years Warranty', 'duration_days' => 730, 'policy' => 'Extended 2-year warranty on laptops and motherboards.'],
        ];
        foreach ($warranties as $w) {
            Warranty::firstOrCreate(['name' => $w['name']], $w);
        }

        // 3. Default Categories
        $categories = [
            ['name' => 'Laptops & Computers', 'slug' => 'laptops-computers', 'icon' => 'laptop'],
            ['name' => 'Monitors & Displays', 'slug' => 'monitors-displays', 'icon' => 'monitor'],
            ['name' => 'Components & Hardware', 'slug' => 'components-hardware', 'icon' => 'cpu'],
            ['name' => 'Accessories & Peripherals', 'slug' => 'accessories-peripherals', 'icon' => 'keyboard'],
            ['name' => 'Storage & Networking', 'slug' => 'storage-networking', 'icon' => 'hard-drive'],
        ];
        foreach ($categories as $cat) {
            Category::firstOrCreate(['slug' => $cat['slug']], $cat);
        }

        // 4. Default Brands
        $brands = [
            ['name' => 'ASUS', 'slug' => 'asus'],
            ['name' => 'Dell', 'slug' => 'dell'],
            ['name' => 'Lenovo', 'slug' => 'lenovo'],
            ['name' => 'HP', 'slug' => 'hp'],
            ['name' => 'Apple', 'slug' => 'apple'],
            ['name' => 'Logitech', 'slug' => 'logitech'],
            ['name' => 'Samsung', 'slug' => 'samsung'],
        ];
        foreach ($brands as $b) {
            Brand::firstOrCreate(['slug' => $b['slug']], $b);
        }
    }
}
