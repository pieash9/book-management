<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_returns_json_404_when_member_is_missing(): void
    {
        $response = $this->getJson('/api/members/999999');

        $response->assertNotFound()
            ->assertJson([
                'message' => 'Member not found',
            ]);
    }
}