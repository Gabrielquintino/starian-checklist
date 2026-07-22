# Notas de refatoração e ambiente

## Versões verificadas

- Laravel 11.45.1, PHP 8.3.32 e PHPUnit 11.5.27.
- Angular 17.3.12, Angular CLI 17.3.17 e TypeScript 5.4.5.
- Node 20.20.2, npm 10.8.2 e Xdebug 3.5.3 (somente imagem de debug).

## Ambiente normal

```powershell
docker compose build
docker compose up -d
```

- Laravel: http://localhost:8000
- Angular: http://localhost:4200
- A imagem Laravel normal usa o estágio `production`, que não inclui Xdebug.

O código do host é montado em `/backend` e `/frontend`, os mesmos `WORKDIR` das imagens. Os volumes nomeados `laravel_vendor` e `angular_node_modules` mantêm dependências fora dos bind mounts. Os entrypoints só executam `composer install` ou `npm ci` quando o volume correspondente não está inicializado.

A primeira inicialização cria `backend/.env` a partir de `.env.example`, gera uma `APP_KEY` aleatória nele quando necessário e cria `backend/database/database.sqlite`. Ambos são locais e ignorados pelo Git.

Após mudanças em `composer.lock` ou `package-lock.json`, recrie o volume correspondente:

```powershell
docker compose down
docker volume rm starian-checklist_laravel_vendor starian-checklist_angular_node_modules
docker compose up -d --build
```

## Ambiente de debug

```powershell
docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d --build
```

O arquivo complementar troca apenas o alvo de build do Laravel para `development` e usa a imagem separada `starian-checklist-laravel-debug`; o Compose principal continua apontando para o estágio `production`. O Angular já usa `ng serve --host=0.0.0.0` no Compose principal, portanto não precisa de uma substituição no arquivo de debug.

Para desligar Xdebug em um comando de teste:

```powershell
docker compose -f docker-compose.yml -f docker-compose.debug.yml exec -e XDEBUG_MODE=off laravel php artisan test
```

Para subir o serviço de debug com Xdebug desativado no Windows:

```powershell
$env:XDEBUG_MODE = 'off'
docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d --force-recreate laravel
Remove-Item Env:XDEBUG_MODE
```

## Xdebug e Laravel

O estágio `development` instala Xdebug via PECL, sem fixar versão. A configuração em `backend/docker/php/conf.d/xdebug.ini` é:

```ini
xdebug.mode=debug,develop
xdebug.start_with_request=yes
xdebug.client_host=host.docker.internal
xdebug.client_port=9003
xdebug.discover_client_host=0
xdebug.log_level=0
```

O serviço também define `PHP_IDE_CONFIG=serverName=starian-backend` e `host.docker.internal:host-gateway` para compatibilidade com Docker em Linux. A conexão de debug parte do container para a porta 9003 do host; essa porta não é publicada no Compose.

### Breakpoint PHP manual

1. Inicie o ambiente de debug e instale a extensão recomendada `xdebug.php-debug` no VS Code.
2. Selecione `Listen for Xdebug — Laravel Docker` em Run and Debug.
3. Defina um breakpoint em um arquivo PHP do backend.
4. Faça uma requisição, por exemplo:

```powershell
Invoke-WebRequest http://localhost:8000/
```

O mapeamento é `/backend` no container para `${workspaceFolder}/backend` no host. A requisição HTTP foi validada com status 200, mas a interrupção em breakpoint depende do VS Code estar escutando e deve ser confirmada manualmente pelo desenvolvedor.

## Angular e TypeScript

O serviço Angular executa:

```text
npm run start -- --host=0.0.0.0
```

A configuração de desenvolvimento existente no `frontend/angular.json` já ativa `sourceMap: true`; `ng serve` inicia em configuração `development`, com live reload e watch mode. Em Docker Desktop/Windows, `CHOKIDAR_USEPOLLING=true` permanece habilitado para detectar alterações no bind mount. Uma alteração temporária e revertida em `frontend/src/main.ts` acionou nova geração de bundle nos logs do serviço, sem deixar mudança no código.

### Breakpoint TypeScript manual

1. Inicie o Compose e selecione `Angular — Chrome` ou o composto `Debug full stack (Docker)` no VS Code.
2. Defina um breakpoint em arquivo `.ts` de `frontend/src`.
3. Abra ou recarregue http://localhost:4200 e execute o fluxo que alcança a linha.

A configuração usa o depurador JavaScript nativo `pwa-chrome`, `webRoot=${workspaceFolder}/frontend` e source maps. Chrome precisa estar instalado no Windows para esse perfil.

## VS Code

- `.vscode/launch.json`: listener Xdebug, Chrome e composto full stack.
- `.vscode/tasks.json`: tarefas para subir o ambiente normal ou de debug; não iniciam Docker automaticamente ao depurar.
- `.vscode/extensions.json`: recomenda `xdebug.php-debug` e `Angular.ng-template`.

A configuração pré-existente em `.vscode/settings.json` foi preservada.

## CA do npm e TLS

O Docker Desktop deste computador usa proxy com inspeção HTTPS. A CA pública local em PEM fica em `.docker/certs/npm-ca.pem`, ignorada pelo Git. O Compose a entrega como secret BuildKit durante o build e como secret read-only no runtime. `NODE_EXTRA_CA_CERTS` e `NPM_CONFIG_CAFILE` apontam para `/run/secrets/npm-ca.pem`; `strict-ssl` permanece `true`.

Em outro Windows, exporte somente a CA pública de inspeção HTTPS em PEM para `.docker/certs/npm-ca.pem` e execute:

```powershell
docker compose build angular
docker compose run --rm angular npm config get strict-ssl
docker compose run --rm angular npm config get cafile
```

## Comandos de verificação

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose run --rm laravel php artisan test
docker compose run --rm angular npm run build

docker compose -f docker-compose.yml -f docker-compose.debug.yml config
docker compose -f docker-compose.yml -f docker-compose.debug.yml build laravel angular
docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d
docker compose -f docker-compose.yml -f docker-compose.debug.yml exec laravel php --ri xdebug
docker compose -f docker-compose.yml -f docker-compose.debug.yml exec -e XDEBUG_MODE=off laravel php artisan test
```

## Backend Eloquent e API stateless

A checklist agora usa SQLite e Eloquent. O arquivo `storage/tarefas.json`, as funções globais de rota e o middleware CORS manual foram removidos.

### Arquitetura

- `Task`: model com mass assignment explícito, default e cast booleano de `completed`.
- migration `create_tasks_table`: `id`, `title` de até 255 caracteres, `completed=false` e timestamps.
- `StoreTaskRequest`: autorização pública, trim e regras `required|string|max:255`.
- `TaskResource`: expõe somente `id`, `title` e `completed`.
- `TaskController`: contém apenas `index`, `store` e `destroy`.
- `routes/api.php`: contém somente as três definições de rota.
- `TaskFactory` e `TaskSeeder`: suporte simples para testes e três tarefas demonstrativas determinísticas.

`JsonResource::withoutWrapping()` é configurado em `AppServiceProvider`. As rotas API são carregadas em `bootstrap/app.php` com `apiPrefix: ''`, preservando os caminhos públicos sem `/api`.

### Contrato HTTP final

- `GET /tarefas`: `200`, array sem wrapper, ordenado por ID crescente.
- `POST /tarefas`: `201`, objeto sem wrapper, título normalizado e `completed=false`.
- `DELETE /tarefas/{task}` existente: `204`, corpo vazio.
- `DELETE /tarefas/{task}` inexistente: `404`.
- Entrada inválida: `422` com o JSON de validação nativo do Laravel.

Respostas de tarefa não expõem `created_at`, `updated_at` ou outros campos internos.

### Validação

O título é normalizado com `trim` antes da validação. Campo ausente, string vazia, somente espaços, array, objeto e valor acima de 255 caracteres retornam `422`. Não existe mais título fallback.

### CORS

O Laravel usa o middleware CORS nativo com `config/cors.php`. Por padrão somente `http://localhost:4200` é permitido para as rotas da checklist. As origens podem ser configuradas como lista separada por vírgulas:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

Credenciais permanecem desabilitadas. O preflight `OPTIONS /tarefas` retorna `204` e o header `Access-Control-Allow-Origin` para uma origem configurada.

### Banco e dados iniciais

O banco local continua em `database/database.sqlite`. O Compose não fixa mais `DB_DATABASE`, permitindo que `.env.testing` selecione SQLite `:memory:` corretamente.

```powershell
docker compose run --rm laravel php artisan migrate:fresh
docker compose run --rm laravel php artisan db:seed
```

O seed cria ou atualiza as tarefas `Tarefa 1`, `Tarefa 2` e `Tarefa 3`. Ele não é executado automaticamente pelo entrypoint nem em produção.

O comando abaixo foi validado em memória sem alterar as três tarefas do banco local:

```powershell
docker compose run --rm laravel php artisan migrate:fresh --env=testing
```

### Testes

`TaskApiCharacterizationTest` usa `RefreshDatabase` e `TaskFactory`. Foram removidos lock de arquivo, snapshot do JSON, processos isolados, CSRF desabilitado e todos os skips.

A suíte cobre contrato, persistência, ordenação, tipos, trim, todas as entradas inválidas, ausência de timestamps e wrapper, remoção, middleware API e CORS.

```text
php artisan test: 21 passed, 82 assertions
php artisan test --filter=TaskApi: 19 passed, 80 assertions
vendor/bin/pint --test: 36 files passed
```

O teste padrão de `/` foi mantido como smoke test simples de inicialização do Laravel.

### Validações HTTP reais

```text
GET /tarefas: 200, três tarefas ordenadas e booleanos JSON
POST /tarefas: 201, título com espaços salvo normalizado
POST com somente espaços: 422, erro nativo no campo title
DELETE de tarefa existente: 204, corpo vazio
DELETE de ID inexistente: 404
OPTIONS /tarefas: 204, origem http://localhost:4200 permitida
```

A tarefa criada pela validação manual foi removida ao final; permaneceram somente as três tarefas semeadas.

### Ambiente e limitações restantes

- O Compose normal usa a imagem sem Xdebug; o Compose complementar continua com Xdebug 3.5.3 em `debug,develop`.
- O Angular e seu contrato de chamada não foram alterados nesta etapa.
- `npm test -- --watch=false --browsers=ChromeHeadless` continua limitado pela ausência preexistente de arquivos `*.spec.ts`.
- `ng serve` permanece exclusivo para desenvolvimento.

## Frontend Angular refatorado

O frontend da checklist foi separado em uma arquitetura standalone pequena e orientada à responsabilidade:

- `AppComponent`: shell mínimo, sem HTTP, formulário, estado de tela ou Router.
- `TaskPageComponent`: container dos estados e das atualizações imutáveis da lista.
- `TaskFormComponent`: Reactive Forms, validação e normalização do título.
- `TaskListComponent`: apresentação semântica da lista e emissão da intenção de remoção.
- `TaskService`: única responsabilidade de comunicação HTTP.
- `Task` e `CreateTaskRequest`: contratos TypeScript explícitos da API.

Foi mantido estado tradicional tipado, por ser suficiente para três operações e mais direto do que introduzir store ou migrar toda a tela para signals. As subscriptions HTTP são finitas e usam `takeUntilDestroyed` para encerrar também no ciclo de destruição do container.

### API e execução local

O service usa somente o caminho relativo `/tarefas`. O `ng serve` carrega `frontend/proxy.conf.js`:

- no Docker, o destino padrão é `http://laravel:8000`;
- no host, informe o backend local sem duplicar a URL no código:

```powershell
cd frontend
$env:API_PROXY_TARGET = 'http://localhost:8000'
npm start
Remove-Item Env:API_PROXY_TARGET
```

O proxy cobre `GET /tarefas`, `POST /tarefas` e `DELETE /tarefas/{id}`. O build de produção continua independente do proxy; a definição da URL de produção deverá ser feita na camada de hospedagem/reverse proxy.

No Docker Desktop/Windows, `CHOKIDAR_USEPOLLING=true` não foi suficiente com o builder Angular atual. Após validação real, o `serve` recebeu `poll: 1000` no `angular.json`. Uma alteração temporária apareceu no bundle servido em 2 segundos e a restauração também em 2 segundos, sem rebuild da imagem.

### Formulário, estado e erros

O formulário usa `ReactiveFormsModule`, controle não anulável, `required`, `maxLength(255)` e validador de espaços em branco. O payload é enviado com `trim`, o botão bloqueia formulário inválido ou envio concorrente e o campo é limpo somente após `POST` bem-sucedido.

A página mantém estados explícitos para carregamento, envio, IDs em remoção e erros de carregamento, criação e remoção. Falhas não inserem nem removem tarefas e não criam dados fictícios. Uma criação bem-sucedida usa o objeto devolvido pela API e ordena por ID; uma remoção só atualiza a lista após `204`. Erros `422` usam a primeira mensagem segura do campo `title` quando disponível; demais falhas exibem mensagens genéricas em português.

### Acessibilidade e responsividade

O documento usa `lang="pt-BR"`, título descritivo, landmarks `main`, `section` e `header`, formulário e lista semânticos, labels associados, `aria-invalid`, `aria-describedby`, regiões `aria-live`, `aria-busy`, foco visível e contexto no rótulo acessível de remoção. Os estados não dependem apenas de cor.

A folha SCSS é mobile first, usa container fluido com largura máxima, quebra títulos longos, empilha controles e itens em telas pequenas e mantém botões com área útil. Não há estilos inline nem biblioteca visual adicional. O Router vazio e o `RouterOutlet` foram removidos.

### Testes e resultados reais

Foram criados três arquivos de spec, com 7 testes e 19 chamadas de assertion:

- `TaskService`: GET, POST com payload e DELETE por ID usando `provideHttpClientTesting`;
- `TaskFormComponent`: bloqueio de título somente com espaços e emissão de payload normalizado;
- `TaskPageComponent`: carregamento/ordenação e falha de carregamento sem fallback fictício.

Comandos executados:

```powershell
docker compose run --rm angular npm test -- --watch=false --browsers=ChromeHeadless
docker compose run --rm angular npx tsc -p tsconfig.spec.json --noEmit
docker compose run --rm angular npm run build
docker compose up -d laravel angular
docker compose restart angular
```

Resultados:

```text
Baseline npm test: TS18003 por ausência de specs.
Após os specs: bundles de teste gerados; Karma bloqueado apenas porque a imagem Node não contém Chrome/Chromium e CHROME_BIN não está definido.
tsc -p tsconfig.spec.json --noEmit: aprovado.
ng build: aprovado em 3,487 s; bundle inicial 204,70 kB (59,22 kB estimados transferidos).
ng serve: ativo em http://localhost:4200 com source maps, watch e proxy.
GET via proxy: 200, três tarefas no estado semeado.
POST via proxy: 201, título normalizado e completed=false.
POST com somente espaços via proxy: 422.
DELETE via proxy: 204 e corpo vazio; registro temporário removido.
Hot reload: alteração e restauração detectadas em 2 s cada.
```

Não foi instalado Chromium na imagem Node porque isso adicionaria uma stack grande apenas para o runner. A compilação dos specs está validada, mas a execução das 7 expectativas no Karma permanece pendente até disponibilizar Chrome/Chromium e `CHROME_BIN` em uma imagem de testes ou executar a suíte no host com navegador instalado.

O Edge headless do Windows gerou capturas em 1440x1100 e 390x844, confirmando que a página renderiza nos dois viewports. A inspeção interativa automatizada ficou bloqueada por uma falha de ACL do kernel de navegador da ferramenta, portanto ainda devem ser confirmados manualmente: navegação completa por teclado, console do navegador, foco após ações, breakpoints TypeScript, estado vazio visual e os fluxos de formulário diretamente pela UI. Esses itens serão aprofundados na etapa dedicada de testes.
### Correção 4.1 — submit de criação

A criação não alcançava a API porque `TaskFormComponent` usava `(ngSubmit)` em um `<form>` que não possuía `FormGroupDirective` (`[formGroup]`) e a aplicação não importa `FormsModule`. `ngSubmit` não é o evento DOM nativo `submit`; sem uma diretiva de formulário que o exponha, o clique não chamava `submit()` e o `EventEmitter` nunca era acionado.

A correção mínima foi criar `taskForm = new FormGroup({ title: titleControl })`, aplicar `[formGroup]="taskForm"` ao formulário e substituir `[formControl]` por `formControlName="title"`. As validações existentes, trim, bloqueio durante envio e limpeza após sucesso foram preservados.

Os specs agora disparam o evento `submit` nativo e cobrem habilitação, emissão única com trim, espaços, bloqueio por `isSubmitting`, propagação do output para a página, chamada do service, sucesso, erro, reset após sucesso e preservação do campo após falha.

Validação manual com Edge headless no host Angular:

```text
Título válido habilitou o botão.
Clique gerou exatamente POST /tarefas.
A resposta criou `Comprar café` (id 6), adicionou-o à lista e limpou o campo.
Falha forçada em POST manteve `Preservar em falha`, exibiu a mensagem segura e reabilitou o botão.
```

A instrumentação foi um asset temporário no mesmo host do Angular; foi removida, o Angular foi reiniciado e a tarefa de validação foi apagada com `204`.
## Duplicidade de títulos de tarefas

Duas tarefas são equivalentes quando seus títulos passam por `trim` e `lowercase` sem normalização de acentos. Assim, `Comprar café`, ` comprar café ` e `COMPRAR CAFÉ` são duplicados; `Cafe` e `Café` continuam distintos.

### Backend e concorrência

A migration incremental `2026_07_22_000001_add_normalized_title_to_tasks_table` adiciona `normalized_title`, faz backfill e cria uma constraint unique. Antes de alterar o schema, ela percorre os títulos existentes e interrompe a migration com IDs explícitos se encontrar títulos equivalentes; não remove dados silenciosamente. O banco local de demonstração não possuía duplicatas e `migrate:fresh --seed` foi validado.

A regra fica centralizada em `Task::normalizeTitle`, com `mb_strtolower(trim($title), 'UTF-8')`. O mutator de `title` preserva a grafia original aparada e preenche `normalized_title`. O campo interno não faz parte do resource da API.

`StoreTaskRequest` consulta a chave normalizada para dar retorno imediato no campo `title`; a constraint SQLite é a garantia final contra concorrência. `TaskController` converte exclusivamente a violação SQLite da constraint `tasks.normalized_title` em `422` com `Já existe uma tarefa com esse título.`. Outros `QueryException` continuam sendo propagados.

### Frontend

Antes do POST, `TaskPageComponent` compara o título enviado e a lista local usando `trim().toLowerCase()`. Duplicatas detectadas localmente não chamam o service, preservam o campo, mantêm o botão utilizável e mostram a mesma mensagem no formulário. A mensagem fica associada ao input por `aria-describedby`.

O tratamento de `422` do Laravel continua usando `errors.title`, portanto cobre outra aba, lista desatualizada ou corrida entre requisições sem depender do texto global da resposta.

### Cobertura e resultados

Foram adicionados testes de API para primeira criação, duplicatas exata/com espaços/com caixa diferente, ausência de novos registros, título diferente, não exposição de `normalized_title`, constraint direta e seeder. Os specs Angular cobrem as três duplicatas locais, ausência de POST, preservação do campo, título diferente e `422` de duplicidade do backend.

```text
migrate:fresh --seed: aprovado
php artisan test: 28 passed, 106 assertions
php artisan test --filter=TaskApi: 26 passed, 104 assertions
vendor/bin/pint --test: 37 files passed
Angular tsc specs: aprovado
Angular build: aprovado
```

A validação manual via UI criou `Comprar café` e `Comprar pão` com POST 201. As três variações duplicadas não enviaram POST localmente, conservaram o valor e mostraram a mensagem. As mesmas três variações enviadas diretamente ao backend retornaram 422. As tarefas temporárias e o asset de instrumentação foram removidos ao final.
## Tarefa 5 — suíte Angular em Chromium no Docker

### Estratégia de testes

O `frontend/Dockerfile` agora separa os estágios `dependencies`, `development` e `test`. O estágio normal de desenvolvimento continua baseado em Node 20 e não instala navegador. Somente o estágio `test` instala o pacote Debian `chromium`; a validação executada registrou `Chromium 150.0.7871.124 built on Debian GNU/Linux 12 (bookworm)` em `/usr/bin/chromium`.

O arquivo complementar `docker-compose.test.yml` declara o serviço `angular-test`, com target `test`, volume nomeado próprio para `node_modules` (`angular_test_node_modules`) e o código-fonte montado em `/frontend`. A imagem e o serviço continuam usando o secret BuildKit `npm_ca`, `NODE_EXTRA_CA_CERTS=/run/secrets/npm-ca.pem`, `NPM_CONFIG_CAFILE=/run/secrets/npm-ca.pem` e `strict-ssl=true`.

`frontend/karma.conf.js` define o launcher `ChromeHeadlessDocker`, baseado em `ChromeHeadless`, com `--no-sandbox` e `--disable-dev-shm-usage`; ele é usado somente pelo runner Docker de testes. O target `test` do `angular.json` referencia explicitamente esse arquivo, pois sem `karmaConfig` o Angular não carregava o launcher customizado.

### Execução e cobertura

```powershell
docker compose -f docker-compose.yml -f docker-compose.test.yml config
docker compose -f docker-compose.yml -f docker-compose.test.yml build angular-test
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm angular-test chromium --version
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm angular-test npm test -- --watch=false --browsers=ChromeHeadlessDocker
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm angular-test npm test -- --watch=false --browsers=ChromeHeadlessDocker --code-coverage
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm angular-test npx tsc -p tsconfig.spec.json --noEmit
```

Resultado real: a linha de base de 14 specs passou no Chromium. Após ampliar a cobertura de comportamentos críticos, a suíte passou com 24 specs, sem skips. O relatório de cobertura ficou em:

```text
Statements: 93.90% (77/82)
Branches:   80.95% (17/21)
Functions:  100.00% (31/31)
Lines:      93.58% (73/78)
```

Os novos cenários verificam propagação de erro no service, limites e acessibilidade do formulário, loading/retry/criação/remoção/erros independentes na página e renderização, emissão e bloqueio individual na lista.

### Separação do ambiente normal e integração

```powershell
docker compose run --rm angular npm run build
docker compose build angular
docker compose up -d laravel angular
docker compose exec angular sh -lc "command -v chromium || true"
docker compose exec angular npm config get strict-ssl
docker compose exec angular npm config get cafile
```

O build de produção passou. O serviço Angular normal permaneceu sem caminho para `chromium`; `strict-ssl` retornou `true` e `cafile` retornou `/run/secrets/npm-ca.pem`.

A integração HTTP pelo proxy foi validada em `http://localhost:4200`: o frontend respondeu `200`, a listagem de `/tarefas` respondeu pelo proxy, uma criação temporária retornou o objeto criado e sua remoção retornou `204`; o registro temporário foi removido. O bloqueio local de duplicidade sem POST está coberto no Chromium. A automação interativa do navegador continuou indisponível por restrição de ACL do ambiente antes de navegar, portanto a inspeção visual manual de Network/console e do bloqueio local continua recomendada no navegador do desenvolvedor.

### Verificação estática

A busca por `any`, URL hard-coded do backend, fallback offline, `Math.random`, `console.log`, TLS inseguro e `NODE_TLS_REJECT_UNAUTHORIZED` não encontrou ocorrências relacionadas à checklist. A única ocorrência de `console.error` está no `catch` de bootstrap em `src/main.ts`; ela não cria fallback nem mascara erro de API e foi mantida fora do escopo desta tarefa.
