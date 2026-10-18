<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function getBranding()
    {
        return response()->json([
            'site_name'           => env('APP_NAME', 'Realtech Computer'),
            'site_tagline'        => 'Computers, Accessories & IT Solutions',
            'site_logo_url'       => '',
            'support_email'       => env('MAIL_FROM_ADDRESS', 'realtechcenter168@gmail.com'),
            'support_phone'       => '+855 12 345 678',
            'site_address'        => 'Phnom Penh, Cambodia',
            'store_hours'         => 'Mon - Sun: 8:30 AM - 7:30 PM',
            'store_hours_km'      => 'ច័ន្ទ - អាទិត្យ: 8:30 ព្រឹក - 7:30 យប់',
            'primary_color'       => '#2563eb',
            'invoice_footer_text' => 'Thank you for choosing Realtech Computer!',
            'default_currency'    => 'USD',
        ]);
    }
}
