# Samar-Minime Systems — Package Dependency Map

## Platform Layer Dependencies

### Foundational
- **@samar/core** (no dependencies except node)
  - Exports: types, enums, constants
  - Used by: every other package

### Database & Config
- **@samar/database** → @samar/core
  - Exports: Prisma client, migrations, seed scripts
  - Used by: modules, all apps

- **@samar/config** → @samar/core
  - Exports: environment variables, configuration objects
  - Used by: API core, modules

### Security
- **@samar/auth** → @samar/core, @samar/config
  - Exports: JWT utilities, session management
  - Used by: @samar/api-core, modules

- **@samar/validation** → @samar/core
  - Exports: Zod schemas, validation utilities
  - Used by: @samar/api-core, modules

### API & Server
- **@samar/logging** → @samar/core, @samar/config
  - Exports: logger instances, middleware
  - Used by: @samar/api-core, all services

- **@samar/errors** → @samar/core
  - Exports: custom error classes, error handlers
  - Used by: @samar/api-core, modules

- **@samar/api-core** → @samar/core, @samar/auth, @samar/validation, @samar/logging, @samar/errors, @samar/config
  - Exports: Express setup, middleware, base routes
  - Used by: API applications

### UI & Frontend
- **@samar/ui-core** → @samar/core
  - Exports: TailwindCSS config, theme
  - Used by: @samar/components, all UI apps

- **@samar/hooks** → @samar/core
  - Exports: Custom React hooks
  - Used by: @samar/components, all UI apps

- **@samar/state** → @samar/core
  - Exports: Zustand stores
  - Used by: @samar/components, all UI apps

- **@samar/components** → @samar/core, @samar/ui-core, @samar/hooks, @samar/state
  - Exports: Reusable React components
  - Used by: all UI applications

### Utilities
- **@samar/utils** → @samar/core
  - Exports: Helper functions, common utilities
  - Used by: all packages

- **@samar/testing** → @samar/core
  - Exports: Test utilities, fixtures, mocks
  - Used by: module tests

## Domain Module Dependencies

### Core Modules (Platform-only)
- **analytics** → @samar/database, @samar/core, @samar/logging
- **monitoring** → @samar/logging, @samar/core
- **file-storage** → @samar/core, @samar/validation
- **cache-layer** → @samar/core, @samar/config
- **queue-system** → @samar/core, @samar/database, @samar/config

### Authentication & Authorization
- **authentication** → @samar/auth, @samar/database, @samar/core, @samar/validation
  - Used by: all API endpoints

### Business Logic Modules
- **approval-system** → @samar/database, @samar/core, workflows
- **ai-orchestration** → @samar/core, @samar/config, ai-agents
- **ai-agents** → @samar/core, @samar/config
- **code-generation** → @samar/core, ai-orchestration
- **research-engine** → @samar/core, ai-orchestration, analytics
- **documentation-engine** → @samar/core, research-engine, ai-orchestration
- **seo-engine** → @samar/core, analytics
- **templates** → @samar/core, @samar/validation
- **workflows** → @samar/database, @samar/core, approval-system, queue-system
- **data-transformation** → @samar/database, @samar/core, @samar/validation

### Communication Modules
- **messaging** → @samar/database, @samar/core, @samar/validation, notification-hub
- **notification-hub** → @samar/core, @samar/config, @samar/logging, queue-system

## Application Dependencies

### API Applications
All API apps depend on:
- @samar/api-core
- @samar/database
- All relevant domain modules

### Frontend Applications
All UI apps depend on:
- @samar/components
- @samar/state
- @samar/hooks
- @samar/utils

## Dependency Constraints

### No Circular Dependencies
- Core cannot depend on modules
- Modules can depend on platform only
- Modules can depend on other modules

### Cross-Domain Communication
- Use event bus (via queue-system)
- Use shared database tables
- No direct service-to-service calls

### External Dependencies
- OpenAI SDK (in ai-orchestration)
- Anthropic SDK (in ai-orchestration)
- Prisma (database layer)
- Redis (cache-layer)
- Express (api-core)
- React (all UI)

## Build Optimization

### Dependency Graph
```
node_modules/
├── core dependencies (express, prisma, zod, etc.)
└── dev dependencies (typescript, eslint, etc.)

platform/
├── core
├── database
├── auth
├── api-core
├── ui-core
├── state
├── hooks
├── components
├── utils
├── validation
├── logging
├── config
├── errors
└── testing

modules/
├── authentication
├── ai-orchestration
├── approval-system
├── ... (15 more)

apps/
├── api (depends on api-core + modules)
└── dashboard (depends on components + state)
```

### Build Order (Turborepo)
1. Build @samar/core (no deps)
2. Build platform packages in parallel (all depend on core)
3. Build modules in parallel (depend on platform)
4. Build applications (depend on everything)

## Testing Strategy

### Unit Tests
- Test each package in isolation
- Mock external dependencies
- Use @samar/testing fixtures

### Integration Tests
- Test module interactions
- Use real database (in-memory or test DB)
- Mock external AI services

### E2E Tests
- Full workflow through API
- Real database and Redis
- Feature flag for test mode
