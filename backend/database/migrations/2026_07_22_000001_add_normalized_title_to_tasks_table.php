<?php

use App\Models\Task;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tasks = DB::table('tasks')->orderBy('id')->get(['id', 'title']);
        $titles = [];

        foreach ($tasks as $task) {
            $normalizedTitle = Task::normalizeTitle($task->title);

            if (isset($titles[$normalizedTitle])) {
                throw new \RuntimeException(sprintf(
                    'Cannot add the normalized_title unique constraint: task IDs %d and %d have equivalent titles.',
                    $titles[$normalizedTitle],
                    $task->id,
                ));
            }

            $titles[$normalizedTitle] = $task->id;
        }

        Schema::table('tasks', function (Blueprint $table) {
            $table->string('normalized_title', 255)->default('')->after('title');
        });

        foreach ($tasks as $task) {
            DB::table('tasks')
                ->where('id', $task->id)
                ->update(['normalized_title' => Task::normalizeTitle($task->title)]);
        }

        Schema::table('tasks', function (Blueprint $table) {
            $table->unique('normalized_title');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropUnique(['normalized_title']);
            $table->dropColumn('normalized_title');
        });
    }
};
