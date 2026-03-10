<?php

namespace Database\Factories;

use App\Models\Book;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Borrowing>
 */
class BorrowingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $borrowedDate = Carbon::instance(fake()->dateTimeBetween('-30 days', '-5 days'));
        $status = fake()->randomElement(['borrowed', 'returned', 'overdue']);
        $dueDate = $borrowedDate->copy()->addDays(fake()->numberBetween(7, 14));
        $returnedDate = null;

        if ($status === 'overdue') {
            $dueDate = now()->subDays(fake()->numberBetween(1, 10));
        }

        if ($status === 'returned') {
            $returnedDate = $dueDate->copy()->subDays(fake()->numberBetween(0, 3));
        }

        return [
            'book_id' => Book::factory(),
            'member_id' => Member::factory(),
            'borrowed_date' => $borrowedDate->toDateString(),
            'due_date' => $dueDate->toDateString(),
            'returned_date' => $returnedDate?->toDateString(),
            'status' => $status,
        ];
    }
}
