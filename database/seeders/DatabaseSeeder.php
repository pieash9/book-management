<?php

namespace Database\Seeders;

use App\Models\Author;
use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Member;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Library Admin',
            'email' => 'admin@example.com',
        ]);

        Author::factory(12)->create();
        $books = Book::factory(36)->create();
        $members = Member::factory(24)->create();

        $books->where('status', 'active')
            ->shuffle()
            ->take(12)
            ->each(function (Book $book) use ($members): void {
                $status = fake()->randomElement(['borrowed', 'returned', 'overdue']);
                $borrowedDate = Carbon::instance(fake()->dateTimeBetween('-45 days', '-8 days'));
                $dueDate = $borrowedDate->copy()->addDays(fake()->numberBetween(7, 14));
                $returnedDate = null;

                if ($status === 'overdue') {
                    $dueDate = now()->subDays(fake()->numberBetween(1, 10));
                }

                if ($status === 'returned') {
                    $returnedDate = $dueDate->copy()->subDays(fake()->numberBetween(0, 3));
                }

                Borrowing::create([
                    'book_id' => $book->id,
                    'member_id' => $members->random()->id,
                    'borrowed_date' => $borrowedDate,
                    'due_date' => $dueDate,
                    'returned_date' => $returnedDate,
                    'status' => $status,
                ]);

                if (in_array($status, ['borrowed', 'overdue'], true) && $book->available_copies > 0) {
                    $book->decrement('available_copies');
                }
            });
    }
}
