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
    public function index()
    {
        $book = Book::with('author')->paginate(10);

        return BookResource::collection($book);
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
}
