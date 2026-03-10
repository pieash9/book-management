<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'address' => $this->address,
            'membership_date' => $this->membership_date,
            'status' => $this->status,
            'active_borrowings_count' => $this->when(
                isset($this->active_borrowings_count),
                $this->active_borrowings_count
            ),
        ];
    }
}
