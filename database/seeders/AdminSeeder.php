<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name'      => 'Super Admin',
            'email'     => 'admin@fireops.com',
            'password'  => Hash::make('superadmin123'),
            'role'      => 'superadmin',
        ]);
    }
}