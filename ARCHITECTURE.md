# Arquitectura inicial do SHONGA

O projecto segue uma arquitectura modular com separação explícita entre interface, transporte e regras de negócio.

```text
shonga-project/
├── src/                         # shonga-app (Quasar/Vue, temporariamente na raiz)
│   ├── boot/                    # Apollo Client e integrações
│   ├── layouts/
│   ├── pages/
│   ├── router/
│   └── stores/                  # Pinia
├── shonga-api/
│   ├── prisma/                  # schema, migrations e seed
│   └── src/
│       ├── config/              # ambiente validado
│       ├── database/            # Prisma Client
│       ├── generated/           # código gerado pelo Prisma
│       └── graphql/             # schema modular GraphQL
└── docker-compose.yml           # MySQL 8.4 local
```

As próximas funcionalidades da API serão divididas por domínio (`auth`, `users`, `salons`, `employees`, `customers`) com resolvers finos e regras em services/use-cases.

## Autenticação

O módulo `shonga-api/src/auth` fornece registo de cliente, login, renovação com rotação de refresh token, logout, consulta `me` e guards reutilizáveis de perfil. Passwords são protegidas com Argon2; refresh tokens são persistidos apenas como hash SHA-256.

Exemplo de login:

```graphql
mutation Login {
  login(input: { email: "ornelio.mahingue2@gmail.com", password: "a-password-do-env" }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      firstName
      roles
    }
  }
}
```

Para testar `me`, enviar `Authorization: Bearer ACCESS_TOKEN` no cabeçalho da requisição GraphQL.

## Execução local

1. Copiar `shonga-api/.env.example` para `shonga-api/.env` e `.env.example` para `.env`.
2. Iniciar MySQL: `docker-compose up -d mysql` (ou `docker compose up -d mysql` quando o plugin Compose estiver disponível).
3. Na pasta `shonga-api`: `npm run prisma:generate`, `npm run prisma:migrate -- --name init` e `npm run prisma:seed`.
4. Iniciar a API: `npm run dev`.
5. Na raiz, iniciar o frontend: `npm run dev`.

Query de teste em `http://localhost:4000/graphql`:

```graphql
query Health {
  health {
    status
    database
    timestamp
  }
}
```
