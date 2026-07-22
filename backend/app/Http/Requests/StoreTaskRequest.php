<?php

namespace App\Http\Requests;

use App\Models\Task;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string|Closure>> */
    public function rules(): array
    {
        return [
            'title' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (is_string($value) && Task::query()
                        ->where('normalized_title', Task::normalizeTitle($value))
                        ->exists()) {
                        $fail('Já existe uma tarefa com esse título.');
                    }
                },
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $title = $this->input('title');

        if (is_string($title)) {
            $this->merge(['title' => trim($title)]);
        }
    }
}
