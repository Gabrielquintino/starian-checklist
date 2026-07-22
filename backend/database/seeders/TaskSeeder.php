<?php

namespace Database\Seeders;

use App\Models\Task;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        $timestamp = now();

        Task::query()->upsert([
            ['id' => 1, 'title' => 'Tarefa 1', 'normalized_title' => Task::normalizeTitle('Tarefa 1'), 'completed' => false, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 2, 'title' => 'Tarefa 2', 'normalized_title' => Task::normalizeTitle('Tarefa 2'), 'completed' => true, 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['id' => 3, 'title' => 'Tarefa 3', 'normalized_title' => Task::normalizeTitle('Tarefa 3'), 'completed' => false, 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ], ['id'], ['title', 'normalized_title', 'completed', 'updated_at']);
    }
}
