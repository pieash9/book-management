<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BorrowingResource extends JsonResource
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
            'borrowed_date' => $this->borrowed_date,
            'due_date' => $this->due_date,
            'returned_date' => $this->returned_date,
            'status' => $this->status,
            'is_overdue' => $this->isOverdue(),
            'book' => new BookResource($this->whenLoaded('book')),
            'member' => new MemberResource($this->whenLoaded('member')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
