<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Password comes from .env so it isn't committed to GitHub.
        // Falls back to a default if ADMIN_PASSWORD isn't set.
        $password = env('ADMIN_PASSWORD', 'admin1234');

        // updateOrCreate instead of create: re-running the seeder
        // updates the existing admin rather than throwing a
        // duplicate-email error.
        User::updateOrCreate(
            ['email' => 'bfp.natividad.fireops@gmail.com'],
            [
                'first_name'  => 'BFP',
                'last_name'   => 'Chief',
                'middle_name' => null,
                'password'    => Hash::make($password),
                'role'        => 'superadmin',
                'is_active'   => 1,
            ]
        );
    }
}