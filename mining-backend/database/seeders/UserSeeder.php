<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->updateOrInsert(
            ['email' => 'admintranswin@gmail.com'],
            [
                'name'              => 'Admin Transwin',
                'email'             => 'admintranswin@gmail.com',
                'password'          => Hash::make('transword'),
                'role'              => 'admin',
                'is_active'         => true,
                'email_verified_at' => now(),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]
        );
    }
}
