# Starian Checklist

## Technical Refactoring Challenge

Aplicação de checklist refatorada com Angular 17, Laravel 11, SQLite e Docker. O trabalho preserva o escopo funcional de listar, criar e remover tarefas, ao mesmo tempo que melhora arquitetura, integridade de dados, experiência de uso, testabilidade e reprodutibilidade do ambiente.

## Sobre o projeto

O desafio consistiu em identificar dívidas técnicas de uma aplicação funcional, porém propositalmente frágil, e evoluí-la sem ampliar desnecessariamente o produto. A solução final separa apresentação, estado, comunicação HTTP, validação e persistência, mantendo o comportamento esperado e corrigindo falhas de confiabilidade.

## Objetivos do desafio

| Objetivo | Status |
| --- | :---: |
| Identificar más práticas | ✅ |
| Refatorar frontend | ✅ |
| Refatorar backend | ✅ |
| Separar responsabilidades | ✅ |
| Melhorar arquitetura | ✅ |
| Garantir funcionamento | ✅ |
| Responsividade | ✅ |
| Testes automatizados | ✅ |

## Principais problemas encontrados

### Frontend

- `AppComponent` monolítico, concentrando interface, estado e HTTP;
- uso de `any` e baixa segurança de tipos;
- falsos sucessos e dados fictícios em falhas da API;
- baixa testabilidade, semântica e acessibilidade limitadas.

### Backend

- persistência direta em arquivo JSON;
- regras, validações e respostas HTTP dentro das rotas;
- endpoints sob middleware `web`, com sessão e CSRF;
- ausência de validação e restrições de integridade.

### Infraestrutura

- bind mounts e `WORKDIR` inconsistentes;
- instalações não determinísticas;
- ambiente Docker pouco reproduzível.

## Principais melhorias

### Frontend

- componentes standalone separados em shell, página, formulário e lista;
- `TaskService` para comunicação HTTP tipada;
- Reactive Forms e estados explícitos de carregamento, envio, remoção e erro;
- atualização da interface somente após confirmação real da API.

### Backend

- API REST stateless com middleware próprio;
- `TaskController`, `StoreTaskRequest`, `TaskResource` e model Eloquent;
- SQLite com migrations, transações e contrato JSON previsível;
- validação de título e tratamento correto dos status `204`, `404` e `422`;
- proteção contra duplicidade na interface, API e banco de dados.

### Infraestrutura e testes

- ambientes Docker separados para desenvolvimento, debug e testes;
- Xdebug isolado no ambiente de depuração;
- Chromium isolado no runner de testes do frontend;
- PHPUnit com SQLite em memória e Karma/Jasmine com HTTP simulado;
- TLS preservado por CA externa via secret.

### Responsividade e acessibilidade

- interface responsiva e orientada a dispositivos móveis;
- HTML semântico, navegação por teclado e foco visível;
- atributos ARIA dinâmicos e feedback de erros acessível.

## Arquitetura

```text
TaskForm
   │
   ▼
TaskPage
   │
   ▼
TaskService
   │
   ▼
Laravel API
   │
   ▼
Controller
   │
   ▼
SQLite
```

O frontend separa entrada, apresentação, estado e comunicação. No backend, a API valida a entrada, orquestra os casos de uso e expõe somente o contrato público antes de persistir os dados com Eloquent.

## Antes × Depois

| Antes | Depois |
| --- | --- |
| Arquivo JSON | SQLite com Eloquent |
| Frontend monolítico | Componentes com responsabilidades definidas |
| Sem testes automatizados | PHPUnit e Karma/Jasmine |
| Middleware `web` | API stateless |
| Sem validação | Reactive Forms e Form Request |
| Duplicidade permitida | Validação e índice de unicidade |
| Docker inconsistente | Ambientes reproduzíveis por finalidade |

## Tecnologias

- Angular 17
- Laravel 11
- SQLite
- Docker
- PHPUnit
- Karma e Jasmine
- Chromium
- Xdebug

## Como executar

Pré-requisitos: Docker e Docker Compose, com as portas `4200` e `8000` disponíveis.

```powershell
# Construir as imagens
docker compose build

# Subir frontend e backend
docker compose up -d

# Conferir os serviços
docker compose ps
```

As migrations pendentes são aplicadas de forma idempotente na inicialização do servidor Laravel. Dados demonstrativos são opcionais:

```powershell
docker compose run --rm laravel php artisan db:seed
```

### Testes e build

```powershell
# Backend
docker compose run --rm laravel php artisan test

# Frontend em Chromium isolado
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm angular-test npm test -- --watch=false --browsers=ChromeHeadlessDocker

# Build de produção do frontend
docker compose run --rm angular npm run build
```

## Como validar

- acessar o frontend em `http://localhost:4200`;
- listar as tarefas existentes;
- criar uma tarefa com título válido;
- confirmar o bloqueio de títulos inválidos ou duplicados;
- remover uma tarefa;
- executar as suítes de backend e frontend;
- executar o build de produção do Angular.

## Estrutura do projeto

```text
backend/
├── app/Http/Controllers/
├── app/Http/Requests/
├── app/Http/Resources/
├── app/Models/
├── database/migrations/
└── tests/

frontend/src/app/
├── core/services/
└── features/tasks/
    ├── components/
    ├── models/
    └── pages/

docker-compose.yml
docker-compose.debug.yml
docker-compose.test.yml
docs/
```

## Relatório técnico

As decisões arquiteturais, trade-offs, estratégia de testes, métricas, uso de IA e resultados detalhados estão documentados em:

[Relatório Técnico de Refatoração Full Stack](docs/TECHNICAL_CASE_REPORT.md)

## Uso de IA

> A Inteligência Artificial foi utilizada como ferramenta de apoio para diagnóstico, planejamento, revisão de arquitetura, testes e documentação. Todas as decisões arquiteturais, validações e revisões finais foram realizadas manualmente.

## Resultado final

✅ Más práticas identificadas

✅ Frontend refatorado

✅ Backend refatorado

✅ Responsabilidades separadas

✅ Arquitetura modernizada

✅ Aplicação funcional

✅ Testes automatizados

✅ Ambiente reproduzível

✅ Responsividade

✅ Documentação técnica completa
