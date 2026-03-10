<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMemberRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);

        $query = Member::query()
            ->withCount(['activeBorrowings as active_borrowings_count']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // get members
        $members = $query->paginate($perPage);

        return MemberResource::collection($members);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreMemberRequest $request)
    {
        $member = Member::create($request->validated());
        $member->loadCount(['activeBorrowings as active_borrowings_count']);

        return new MemberResource($member);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $member = $this->findMemberOrFail($id);

        $member->loadCount(['activeBorrowings as active_borrowings_count']);

        return new MemberResource($member);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StoreMemberRequest $request, string $id)
    {
        $member = $this->findMemberOrFail($id);

        $member->update($request->validated());
        $member->loadCount(['activeBorrowings as active_borrowings_count']);

        return new MemberResource($member);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $member = $this->findMemberOrFail($id);

        if ($member->activeBorrowings()->count() > 0) {
            return response()->json(['message' => 'Cannot delete member with active borrowings'], 422);
        }

        $member->delete();

        return response()->json(['message' => 'Member deleted successfully']);
    }

    /**
     * Find a member by ID or return a 404 JSON response.
     *
     * @param string $id
     * @return \App\Models\Member
     */
    protected function findMemberOrFail(string $id): Member
    {
        $member = Member::find($id);

        if (!$member) {
            abort(404, 'Member not found!');
        }

        return $member;
    }
}
