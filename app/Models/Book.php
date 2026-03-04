<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Book extends Model
{
    /** @use HasFactory<\Database\Factories\BookFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'isbn',
        'description',
        'author_id',
        'genre',
        'published_at',
        'total_copies',
        'available_copies',
        'cover_image',
        'price',
        'status',
    ];

    public function author()
    {
        return $this->belongsTo(Author::class);
    }

    public function borrowings()
    {
        return $this->hasMany(Borrowing::class);
    }

    public function isAvailable()
    {
        return $this->available_copies > 0;
    }

    // decrease available copies by 1 when a book is borrowed
    public function borrow()
    {
        if ($this->available_copies > 0) {
            $this->decrement('available_copies');
        }
    }

    // increase available copies by 1 when a book is returned
    public function returnBook()
    {
        if ($this->available_copies < $this->total_copies) {
            $this->increment('available_copies');
        }
    }
}
