<?php

use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

Route::get('/tarefas', [TaskController::class, 'index'])->name('tasks.index');
Route::post('/tarefas', [TaskController::class, 'store'])->name('tasks.store');
Route::delete('/tarefas/{task}', [TaskController::class, 'destroy'])
    ->whereNumber('task')
    ->name('tasks.destroy');
