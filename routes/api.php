<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuthorController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\BorrowingController;
use App\Http\Controllers\MemberController;
use App\Models\Author;
use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Route::get('/user', function (Request $request) {
//     return $request->user();
// })->middleware('auth:sanctum');

// authentication routes
Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('authors', AuthorController::class);

    // books
    Route::apiResource('books', BookController::class);

    // members
    Route::apiResource('members', MemberController::class);


    // borrowings
    Route::apiResource('borrowings', BorrowingController::class)->only(['index', 'store', 'show']);

    // return and overdue borrowings
    Route::post('borrowings/{borrowing}/return', [BorrowingController::class, 'returnBook']);
    Route::get('borrowings/overdue/list', [BorrowingController::class, 'overdue']);


    // statistics
    Route::get('statistics', function () {
        return response()->json([
            'total_books' => Book::count(),
            'total_authors' => Author::count(),
            'total_members' => Member::count(),
            'book_borrowed' => Borrowing::where('status', 'borrowed')->count(),
            'overdue_borrowings' => Borrowing::where('status', 'overdue')->count(),
        ]);
    });
});
