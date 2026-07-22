<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TaskResource::collection(Task::query()->orderBy('id')->get());
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        try {
            $task = Task::query()->create($request->validated());
        } catch (QueryException $exception) {
            if (! $this->isNormalizedTitleUniqueViolation($exception)) {
                throw $exception;
            }

            throw ValidationException::withMessages([
                'title' => ['Já existe uma tarefa com esse título.'],
            ]);
        }

        return (new TaskResource($task))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(Task $task): Response
    {
        $task->delete();

        return response()->noContent();
    }

    private function isNormalizedTitleUniqueViolation(QueryException $exception): bool
    {
        return ($exception->errorInfo[0] ?? null) === '23000'
            && str_contains(strtolower($exception->getMessage()), 'tasks.normalized_title');
    }
}
