<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BorrowingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_overdue_borrowings_can_be_returned(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $book = Book::factory()->create([
            'total_copies' => 5,
            'available_copies' => 1,
            'status' => 'active',
        ]);

        $member = Member::factory()->create();

        $borrowing = Borrowing::factory()->create([
            'book_id' => $book->id,
            'member_id' => $member->id,
            'borrowed_date' => now()->subDays(12),
            'due_date' => now()->subDays(4),
            'returned_date' => null,
            'status' => 'overdue',
        ]);

        $response = $this->post("/api/v1/borrowings/{$borrowing->id}/return");

        $response->assertOk()
            ->assertJsonPath('data.status', 'returned');

        $this->assertDatabaseHas('borrowings', [
            'id' => $borrowing->id,
            'status' => 'returned',
        ]);

        $this->assertSame(2, $book->fresh()->available_copies);
    }
}
