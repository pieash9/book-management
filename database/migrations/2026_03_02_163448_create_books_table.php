<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('isbn')->unique();
            $table->text('description')->nullable();
            $table->foreignId('author_id')->constrained('authors')->cascadeOnDelete();
            $table->string("genre")->nullable();
            $table->date("published_at")->nullable();
            $table->integer("total_copies")->default(1);
            $table->integer("available_copies")->default(1);
            $table->string("cover_image")->nullable();
            $table->decimal("price", 8 , 2)->nullable();
            $table->enum("status", ['active', 'inactive'])->default('active');
            $table->timestamps();

            // performance
            $table->index(['title', 'author_id']);
            $table->index('isbn');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
