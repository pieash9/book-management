<?php

namespace Tests\Feature;

use App\Models\Author;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_uploads_cover_image_to_public_storage(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());

        $author = Author::factory()->create();
        $coverImage = UploadedFile::fake()->image('cover.jpg');

        $response = $this->post('/api/v1/books', [
            'title' => 'The Midnight Archive',
            'isbn' => '9783161484100',
            'description' => 'A mystery set inside a hidden library.',
            'author_id' => $author->id,
            'genre' => 'Mystery',
            'published_at' => '2026-03-10',
            'total_copies' => 5,
            'available_copies' => 5,
            'price' => 19.99,
            'cover_image' => $coverImage,
            'status' => 'active',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.title', 'The Midnight Archive')
            ->assertJsonPath('data.author.name', $author->name);

        $storedPath = $response->json('data.cover_image_path');

        $this->assertNotNull($storedPath);
        $this->assertStringStartsWith('covers/', $storedPath);
        Storage::disk('public')->assertExists($storedPath);
    }
}
