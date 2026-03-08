<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBorrowingRequest;
use App\Http\Resources\BorrowingResource;
use App\Models\Book;
use App\Models\Borrowing;
use Illuminate\Http\Request;

class BorrowingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $per_page = $request->per_page ?? 15;

        $query = Borrowing::with('book', 'member');

        // filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // filter by member
        if ($request->has('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        $borrowings = $query->latest()->paginate($per_page);

        return BorrowingResource::collection($borrowings);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreBorrowingRequest $request)
    {
        $book = Book::findOrFail($request->book_id);

        // check if the book is available
        if (!$book->isAvailable()) {
            return response()->json(['message' => 'Book is not available for borrowing'], 422);
        }

        // create borrowing record
        $borrowing = Borrowing::create($request->validated());

        // update book availability
        $book->borrow();

        $borrowing->load('book', 'member');

        return new BorrowingResource($borrowing);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $borrowing = Borrowing::findOrFail($id);

        $borrowing->load('book', 'member');

        return new BorrowingResource($borrowing);
    }

    public function returnBook(string $id)
    {
        $borrowing = Borrowing::findOrFail($id);

        if ($borrowing->status !== 'borrowed') {
            return response()->json([
                'message' => 'This borrowing record is not currently borrowed'
            ], 422);
        }

        // update borrowing record
        $borrowing->update([
            'returned_date' => now(),
            'status' => 'returned',
        ]);

        // update book availability
        $borrowing->book->returnBook();
        $borrowing->load('book', 'member');

        return new BorrowingResource($borrowing);
    }

    public function overdue(Request $request)
    {
        $per_page = $request->per_page ?? 15;

        // update status to overdue
        Borrowing::where('status', 'borrowed')
            ->where('due_date', '<', now())
            ->update(['status' => 'overdue']);

        $overdueBorrowings = Borrowing::with(['book', 'member'])
            ->where('status', 'overdue')
            ->where('due_date', '<', now())
            ->paginate($per_page);

        

        return BorrowingResource::collection($overdueBorrowings);
    }
}
