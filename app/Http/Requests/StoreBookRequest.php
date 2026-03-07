<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'isbn' => [
                'required',
                'string',
                'max:20',
                Rule::unique('books', 'isbn')->ignore($this->route('book'))
            ],
            'description' => 'nullable|string',
            'author_id' => 'required|exists:authors,id',
            'genre' => 'nullable|string',
            'published_at' => 'nullable|date',
            'total_copies' => 'required|integer|min:1',
            'available_copies' => 'required|integer|min:0|lte:total_copies',
            'price' => 'nullable|numeric|min:0',
            'cover_image' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ];
    }
}
