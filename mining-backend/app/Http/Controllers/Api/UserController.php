<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    // GET /api/users  (admin seulement)
    public function index(Request $request)
    {
        $this->requireAdmin($request);
        return response()->json(
            User::orderBy('id')->get(['id','name','email','role','is_active','created_at'])
        );
    }

    // POST /api/users  (admin seulement)
    public function store(Request $request)
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'name'      => 'required|string|max:100',
            'email'     => 'required|email|unique:users,email',
            'password'  => 'required|string|min:6',
            'role'      => 'nullable|in:admin,user',
            'is_active' => 'nullable|boolean',
        ]);

        $user = User::create([
            'name'      => $data['name'],
            'email'     => $data['email'],
            'password'  => Hash::make($data['password']),
            'role'      => $data['role']      ?? 'user',
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'is_active' => $user->is_active,
            'created_at'=> $user->created_at,
        ], 201);
    }

    // PUT /api/users/{id}  (admin seulement)
    public function update(Request $request, $id)
    {
        $this->requireAdmin($request);

        $user = User::findOrFail($id);

        $data = $request->validate([
            'name'      => 'nullable|string|max:100',
            'email'     => ['nullable','email', Rule::unique('users','email')->ignore($id)],
            'password'  => 'nullable|string|min:6',
            'role'      => 'nullable|in:admin,user',
            'is_active' => 'nullable|boolean',
        ]);

        // Empêcher de désactiver le compte admin principal
        if ($user->email === 'admintranswin@gmail.com') {
            unset($data['role']);
            unset($data['is_active']);
        }

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'is_active' => $user->is_active,
            'created_at'=> $user->created_at,
        ]);
    }

    // DELETE /api/users/{id}  (admin seulement)
    public function destroy(Request $request, $id)
    {
        $this->requireAdmin($request);

        $user = User::findOrFail($id);

        // Empêcher la suppression du compte admin principal
        if ($user->email === 'admintranswin@gmail.com') {
            return response()->json(['error' => 'Impossible de supprimer le compte administrateur principal.'], 403);
        }

        // Révoquer tous les tokens avant suppression
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['ok' => true]);
    }

    // ─────────────────────────────────────────────────────────
    // Helper : vérifier que l'utilisateur est admin
    // ─────────────────────────────────────────────────────────
    private function requireAdmin(Request $request): void
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Accès réservé à l\'administrateur.');
        }
    }
}
