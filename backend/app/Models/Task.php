<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $title
 * @property string $normalized_title
 * @property bool $completed
 */
class Task extends Model
{
    /** @use HasFactory<\Database\Factories\TaskFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'completed',
    ];

    protected $attributes = [
        'completed' => false,
    ];

    protected function casts(): array
    {
        return [
            'completed' => 'boolean',
        ];
    }

    public static function normalizeTitle(string $title): string
    {
        return mb_strtolower(trim($title), 'UTF-8');
    }

    protected function title(): Attribute
    {
        return Attribute::make(
            set: fn (string $title): array => [
                'title' => trim($title),
                'normalized_title' => self::normalizeTitle($title),
            ],
        );
    }
}
