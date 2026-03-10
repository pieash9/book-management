<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BookResource extends JsonResource
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
            'title' => $this->title,
            'isbn' => $this->isbn,
            'description' => $this->description,
            'genre' => $this->genre,
            'published_at' => $this->published_at,
            'total_copies' => $this->total_copies,
            'available_copies' => $this->available_copies,
            'price' => $this->price,
            'cover_image' => $this->coverImageUrl($request),
            'cover_image_path' => $this->cover_image,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'is_available' => $this->isAvailable(),
            'author' => new AuthorResource($this->whenLoaded('author')),
        ];
    }

    protected function coverImageUrl(Request $request): ?string
    {
        if (! $this->cover_image) {
            return null;
        }

        if (Str::startsWith($this->cover_image, ['http://', 'https://'])) {
            return $this->cover_image;
        }

        $path = Storage::disk('public')->url($this->cover_image);

        if (Str::startsWith($path, ['http://', 'https://'])) {
            $path = parse_url($path, PHP_URL_PATH) ?: $path;
        }

        return $request->getSchemeAndHttpHost().'/'.ltrim($path, '/');
    }
}
