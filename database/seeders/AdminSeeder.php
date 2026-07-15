<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'first_name'  => 'BFP',
            'last_name'   => 'Chief',
            'middle_name' => null,
            'email'       => 'bfp.natividad.fireops@gmail.com',
            'password'    => Hash::make('admin1234'),
            'role'        => 'superadmin',
            'is_active'   => 1,
        ]);
    }
}