<?php

namespace Tests\Feature;

use App\Models\Task;
use Database\Seeders\TaskSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Task::factory()->create([
            'id' => 2,
            'title' => 'Segunda tarefa',
            'completed' => true,
        ]);
        Task::factory()->create([
            'id' => 1,
            'title' => 'Primeira tarefa',
            'completed' => false,
        ]);
    }

    public function test_get_returns_an_unwrapped_task_list_ordered_by_id(): void
    {
        $response = $this->getJson('/tarefas');

        $response->assertOk();

        $tasks = $response->json();

        $this->assertIsArray($tasks);
        $this->assertTrue(array_is_list($tasks));
        $this->assertSame([1, 2], array_column($tasks, 'id'));
        $this->assertArrayNotHasKey('data', $tasks);
    }

    public function test_get_returns_only_the_expected_fields_and_types(): void
    {
        $tasks = $this->getJson('/tarefas')->assertOk()->json();

        foreach ($tasks as $task) {
            $this->assertSame(['id', 'title', 'completed'], array_keys($task));
            $this->assertIsInt($task['id']);
            $this->assertIsString($task['title']);
            $this->assertIsBool($task['completed']);
            $this->assertArrayNotHasKey('created_at', $task);
            $this->assertArrayNotHasKey('updated_at', $task);
        }
    }

    public function test_get_preserves_boolean_completed_values(): void
    {
        $tasks = $this->getJson('/tarefas')->assertOk()->json();

        $this->assertFalse($tasks[0]['completed']);
        $this->assertTrue($tasks[1]['completed']);
    }

    public function test_post_returns_the_created_task_contract(): void
    {
        $response = $this->postJson('/tarefas', ['title' => 'Minha tarefa']);

        $response
            ->assertCreated()
            ->assertExactJson([
                'id' => 3,
                'title' => 'Minha tarefa',
                'completed' => false,
            ]);

        $task = $response->json();

        $this->assertIsInt($task['id']);
        $this->assertIsString($task['title']);
        $this->assertIsBool($task['completed']);
        $this->assertArrayNotHasKey('data', $task);
        $this->assertArrayNotHasKey('created_at', $task);
        $this->assertArrayNotHasKey('updated_at', $task);
    }

    public function test_post_persists_the_created_task(): void
    {
        $this->postJson('/tarefas', ['title' => 'Tarefa persistida'])->assertCreated();

        $this->assertDatabaseHas('tasks', [
            'id' => 3,
            'title' => 'Tarefa persistida',
            'completed' => false,
        ]);
    }

    public function test_new_task_is_incomplete_in_response_and_database(): void
    {
        $response = $this->postJson('/tarefas', ['title' => 'Tarefa incompleta'])->assertCreated();

        $this->assertFalse($response->json('completed'));
        $this->assertFalse(Task::query()->findOrFail(3)->completed);
    }

    public function test_post_trims_title_before_validation_and_persistence(): void
    {
        $response = $this->postJson('/tarefas', ['title' => '  Tarefa normalizada  ']);

        $response
            ->assertCreated()
            ->assertJsonPath('title', 'Tarefa normalizada');
        $this->assertDatabaseHas('tasks', ['title' => 'Tarefa normalizada']);
    }

    public function test_delete_existing_task_returns_empty_no_content_response(): void
    {
        $response = $this->deleteJson('/tarefas/1');

        $response->assertNoContent();
        $this->assertSame('', $response->getContent());
    }

    public function test_delete_existing_task_removes_it_from_database(): void
    {
        $this->deleteJson('/tarefas/1')->assertNoContent();

        $this->assertDatabaseMissing('tasks', ['id' => 1]);
        $this->assertDatabaseHas('tasks', ['id' => 2]);
    }

    public function test_valid_json_responses_do_not_use_a_data_wrapper(): void
    {
        $list = $this->getJson('/tarefas')->assertOk()->json();
        $created = $this->postJson('/tarefas', ['title' => 'Sem wrapper'])->assertCreated()->json();

        $this->assertTrue(array_is_list($list));
        $this->assertArrayNotHasKey('data', $list);
        $this->assertArrayNotHasKey('data', $created);
    }

    public function test_task_routes_use_api_middleware_without_web_middleware(): void
    {
        $taskRoutes = collect(app('router')->getRoutes()->getRoutes())
            ->filter(fn ($route) => str_starts_with($route->uri(), 'tarefas'));

        $this->assertCount(3, $taskRoutes);

        foreach ($taskRoutes as $route) {
            $middleware = $route->gatherMiddleware();

            $this->assertContains('api', $middleware);
            $this->assertNotContains('web', $middleware);
        }
    }

    public function test_post_without_title_returns_unprocessable_entity(): void
    {
        $this->postJson('/tarefas')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_post_with_empty_title_returns_unprocessable_entity(): void
    {
        $this->postJson('/tarefas', ['title' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_post_with_whitespace_only_title_returns_unprocessable_entity(): void
    {
        $this->postJson('/tarefas', ['title' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_post_with_array_title_returns_unprocessable_entity(): void
    {
        $this->postJson('/tarefas', ['title' => ['invalid']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_post_with_object_title_returns_unprocessable_entity(): void
    {
        $this->postJson('/tarefas', ['title' => ['invalid' => true]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_post_with_title_longer_than_255_characters_returns_unprocessable_entity(): void
    {
        $this->postJson('/tarefas', ['title' => str_repeat('a', 256)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_delete_missing_task_returns_not_found(): void
    {
        $this->deleteJson('/tarefas/999')->assertNotFound();
    }

    public function test_cors_preflight_allows_the_configured_frontend_origin(): void
    {
        $response = $this
            ->withHeaders([
                'Origin' => 'http://localhost:4200',
                'Access-Control-Request-Method' => 'POST',
                'Access-Control-Request-Headers' => 'content-type',
            ])
            ->options('/tarefas');

        $response->assertNoContent();
        $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
        $response->assertHeader('Access-Control-Allow-Methods');
    }

    public function test_first_task_with_a_normalized_title_is_created(): void
    {
        $response = $this->postJson('/tarefas', ['title' => 'Comprar café']);

        $response
            ->assertCreated()
            ->assertJsonPath('title', 'Comprar café')
            ->assertJsonMissingPath('normalized_title');
        $this->assertDatabaseHas('tasks', [
            'title' => 'Comprar café',
            'normalized_title' => 'comprar café',
        ]);
    }

    public function test_post_with_an_exact_duplicate_title_returns_unprocessable_entity(): void
    {
        Task::factory()->create(['title' => 'Comprar café']);

        $this->postJson('/tarefas', ['title' => 'Comprar café'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title' => 'Já existe uma tarefa com esse título.']);

        $this->assertDatabaseCount('tasks', 3);
    }

    public function test_post_with_duplicate_title_surrounded_by_spaces_returns_unprocessable_entity(): void
    {
        Task::factory()->create(['title' => 'Comprar café']);

        $this->postJson('/tarefas', ['title' => '  Comprar café  '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title' => 'Já existe uma tarefa com esse título.']);

        $this->assertDatabaseCount('tasks', 3);
    }

    public function test_post_with_duplicate_title_in_a_different_case_returns_unprocessable_entity(): void
    {
        Task::factory()->create(['title' => 'Comprar café']);

        $this->postJson('/tarefas', ['title' => 'COMPRAR CAFÉ'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title' => 'Já existe uma tarefa com esse título.']);

        $this->assertDatabaseCount('tasks', 3);
    }

    public function test_different_titles_remain_allowed(): void
    {
        Task::factory()->create(['title' => 'Comprar café']);

        $this->postJson('/tarefas', ['title' => 'Comprar pão'])
            ->assertCreated()
            ->assertJsonPath('title', 'Comprar pão');

        $this->assertDatabaseCount('tasks', 4);
    }

    public function test_normalized_title_unique_constraint_protects_direct_persistence(): void
    {
        Task::factory()->create(['title' => 'Comprar café']);

        try {
            Task::query()->create(['title' => 'COMPRAR CAFÉ']);
            $this->fail('The unique constraint should reject equivalent normalized titles.');
        } catch (QueryException $exception) {
            $this->assertSame('23000', $exception->errorInfo[0] ?? null);
            $this->assertStringContainsString('tasks.normalized_title', $exception->getMessage());
        }

        $this->assertDatabaseCount('tasks', 3);
    }

    public function test_task_seeder_creates_unique_normalized_titles(): void
    {
        Task::query()->delete();

        $this->seed(TaskSeeder::class);

        $this->assertDatabaseCount('tasks', 3);
        $this->assertSame(
            ['tarefa 1', 'tarefa 2', 'tarefa 3'],
            Task::query()->orderBy('id')->pluck('normalized_title')->all(),
        );
    }
}
