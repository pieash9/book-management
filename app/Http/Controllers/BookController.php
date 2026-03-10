<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBookRequest;
use App\Http\Resources\BookResource;
use App\Models\Book;
use Illuminate\Http\Request;

class BookController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $per_page = $request->per_page ?? 15;

        $query = Book::with('author');

        // search functionality
        if($request->has('search')){
            $search = $request->search;
            
            $query->where(function($q) use ($search){
                $q->where('title', 'like', "%$search%")
                ->orWhere('isbn', 'like', "%{$search}%")
                ->orWhereHas('author', function($authorQuery) use ($search){
                    $authorQuery->where('name', 'like', "%{$search}%");
                });
            });
        }

        if($request->has('genre')){
            $query->where('genre', $request->genre);
        }

        $books = $query->paginate($per_page);

        return BookResource::collection($books);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreBookRequest $request)
    {
        $book = Book::create($request->validated());

        $book->load('author');

        return new BookResource($book);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $book = Book::find($id);

            if (!$book) {
                return response()->json([
                    'status' => false,
                    'message' => 'Book not found!',
                ], 404);
            }

            $book->load('author');

            return new BookResource($book);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Server Error: ' . $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StoreBookRequest $request, string $id)
    {
        $book = Book::find($id);

        if (!$book) {
            return response()->json([
                'status' => false,
                'message' => 'Book not found!',
            ], 404);
        }

        $book->update($request->validated());

        $book->load('author');

        return new BookResource($book);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $book = Book::find($id);

        if (!$book) {
            return response()->json([
                'status' => false,
                'message' => 'Book not found!',
            ], 404);
        }

        $book->delete();

        return response()->json([
            'status' => true,
            'message' => 'Book deleted successfully!',
        ], 200);
    }

    // get first five book
    public function firstFiveBooks()
    {
        $book = Book::latest()->take(5)->get();

        return BookResource::collection($book);
    }
}
