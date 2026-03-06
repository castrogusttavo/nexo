# Backend Architecture

## 1. Login

### 1.1 Caso de Uso — Autenticacao

```mermaid
graph LR
    User((Usuario))

    UC1(Login com Email/Senha)
    UC2(Login com Google)
    UC3(Login com GitHub)
    UC4(Cadastro com Email/Senha)
    UC5(Validar Credenciais)
    UC6(Criar Sessao)
    UC7(Enviar Email de Boas-vindas)
    UC8(Vincular Conta OAuth)

    User --- UC1
    User --- UC2
    User --- UC3
    User --- UC4

    UC1 -.->|include| UC5
    UC1 -.->|include| UC6
    UC2 -.->|include| UC6
    UC3 -.->|include| UC6
    UC2 -.->|extend| UC8
    UC3 -.->|extend| UC8
    UC4 -.->|include| UC5
    UC4 -.->|include| UC6
    UC4 -.->|include| UC7

    BA[[Better Auth]]
    UC5 -.- BA
    UC6 -.- BA
    UC8 -.- BA
```

**Atores:** Usuario
**Providers:** Email/Senha, Google OAuth, GitHub OAuth
**Lib:** Better Auth v1 com Prisma Adapter (PostgreSQL)

---

### 1.2 Diagrama de Sequencia — Login com Email/Senha

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as /sign-in (React)
    participant AC as authClient (Better Auth)
    participant API as /api/auth/[...all]
    participant BA as Better Auth Server
    participant DB as PostgreSQL

    U ->> P: Preenche email + senha
    P ->> P: Validacao client-side (campos obrigatorios)

    alt Validacao falha
        P -->> U: Exibe erros de campo
    end

    P ->> AC: signIn.email({ email, password })
    AC ->> API: POST /api/auth/sign-in/email
    API ->> BA: toNextJsHandler(auth)

    BA ->> DB: SELECT Account WHERE email (providerId = 'credentials')
    DB -->> BA: Account + hashed password

    BA ->> BA: bcrypt.compare(password, hash)

    alt Credenciais invalidas
        BA -->> API: 401 Unauthorized
        API -->> AC: Error response
        AC -->> P: { error: { message } }
        P -->> U: "E-mail ou senha invalidos"
    end

    BA ->> DB: INSERT Session (token, userId, expiresAt)
    DB -->> BA: Session criada

    BA -->> API: 200 OK + Set-Cookie (session token)
    API -->> AC: Session data
    AC -->> P: { data: session }
    P ->> P: router.push("/")
    P -->> U: Redirect para Dashboard
```

---

### 1.3 Diagrama de Sequencia — Login com OAuth (Google/GitHub)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as /sign-in (React)
    participant AC as authClient (Better Auth)
    participant API as /api/auth/[...all]
    participant BA as Better Auth Server
    participant OAuth as Google / GitHub
    participant DB as PostgreSQL

    U ->> P: Clica "Continuar com Google/GitHub"
    P ->> AC: signIn.social({ provider, callbackURL: "/" })
    AC ->> API: POST /api/auth/sign-in/social
    API ->> BA: toNextJsHandler(auth)
    BA -->> U: 302 Redirect para OAuth Provider

    U ->> OAuth: Autoriza acesso
    OAuth -->> API: GET /api/auth/callback/{provider}?code=...

    API ->> BA: toNextJsHandler(auth)
    BA ->> OAuth: Troca code por access_token + id_token
    OAuth -->> BA: Tokens + user info (name, email)

    BA ->> DB: SELECT User WHERE email
    DB -->> BA: User | null

    alt Usuario novo
        BA ->> DB: INSERT User (name, email, emailVerified: true)
        BA ->> DB: INSERT Account (providerId, accessToken, refreshToken)
    else Usuario existente (account linking)
        BA ->> DB: INSERT Account vinculada ao User existente
    end

    BA ->> DB: INSERT Session (token, userId, expiresAt)
    DB -->> BA: Session criada

    BA -->> U: 302 Redirect para callbackURL + Set-Cookie
    U ->> P: Acessa Dashboard
```

---

### 1.4 Diagrama de Sequencia — Cadastro com Email/Senha

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as /sign-up (React)
    participant AC as authClient (Better Auth)
    participant API as /api/auth/[...all]
    participant BA as Better Auth Server
    participant DB as PostgreSQL
    participant Mail as Resend (Email)

    U ->> P: Preenche nome, email, senha
    P ->> P: Validacao client-side (nome >= 2, senha >= 6)

    alt Validacao falha
        P -->> U: Exibe erros de campo
    end

    P ->> AC: signUp.email({ name, email, password })
    AC ->> API: POST /api/auth/sign-up/email
    API ->> BA: toNextJsHandler(auth)

    BA ->> DB: SELECT User WHERE email
    DB -->> BA: User | null

    alt Email ja existe
        BA -->> API: 409 Conflict
        API -->> AC: Error response
        AC -->> P: { error: { message } }
        P -->> U: "Erro ao criar conta"
    end

    BA ->> BA: bcrypt.hash(password)
    BA ->> DB: INSERT User (name, email, role: MEMBER)
    BA ->> DB: INSERT Account (providerId: credentials, password: hash)
    BA ->> DB: INSERT Session (token, userId, expiresAt)

    Note over BA, Mail: databaseHook: user.create.after
    BA ->> Mail: send WelcomeEmail({ userFirstname })
    Mail -->> BA: Email enviado

    BA -->> API: 200 OK + Set-Cookie
    API -->> AC: Session data
    AC -->> P: { data: session }
    P ->> P: router.push("/")
    P -->> U: Redirect para Dashboard
```

---

### 1.5 Diagrama de Sequencia — Request Autenticado (GET /api/auth/me)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant Browser as Browser
    participant API as GET /api/auth/me
    participant Auth as getAuthSession()
    participant BA as Better Auth Server
    participant Svc as UserService
    participant Cache as Redis (UserCache)
    participant Repo as UserRepository
    participant DB as PostgreSQL

    U ->> Browser: Acessa pagina protegida
    Browser ->> API: GET /api/auth/me (Cookie: session_token)
    API ->> Auth: getAuthSession()
    Auth ->> BA: auth.api.getSession({ headers })
    BA ->> DB: SELECT Session WHERE token
    DB -->> BA: Session + User

    alt Sessao invalida ou expirada
        BA -->> Auth: null
        Auth -->> API: err(unauthorized)
        API -->> Browser: 401 { code: "UNAUTHORIZED" }
    end

    Auth -->> API: ok({ user, session })
    API ->> Svc: UserService.getProfile(userId)

    Svc ->> Cache: UserCache.get(userId)

    alt Cache hit
        Cache -->> Svc: UserDTO
    else Cache miss
        Cache -->> Svc: null
        Svc ->> Repo: UserRepository.findById(userId)
        Repo ->> DB: SELECT User WHERE id
        DB -->> Repo: User
        Repo -->> Svc: ok(User)
        Svc ->> Svc: toUserDTO(user)
        Svc ->> Cache: UserCache.set(userId, userDTO)
    end

    Svc -->> API: ok(UserDTO)
    API -->> Browser: 200 { data: UserDTO }
    Browser -->> U: Renderiza perfil
```

---

### 1.6 Resumo da Arquitetura de Auth

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Config | `src/lib/auth.ts` | Better Auth com Prisma adapter, providers, hooks |
| Client | `src/lib/auth-client.ts` | `createAuthClient()` para chamadas client-side |
| Sessao | `src/lib/auth-session.ts` | `getAuthSession()` retorna `Result<Session>` |
| Route | `app/api/auth/[...all]/route.ts` | Catch-all para endpoints do Better Auth |
| Route | `app/api/auth/me/route.ts` | Perfil do usuario autenticado |
| Service | `src/services/user.service.ts` | Logica de negocio (getProfile, updateProfile) |
| Repo | `src/repositories/user.repository.ts` | Acesso ao banco (findById, findByEmail, create) |
| Cache | `src/cache/user.cache.ts` | Redis cache-aside (TTL 15 min) |
| Mapper | `src/mappers/user.mapper.ts` | `toUserDTO()` converte Prisma -> DTO |
| Schema | `src/schemas/user.schema.ts` | Zod validation (UpdateUserSchema) |
| Pages | `app/sign-in/page.tsx`, `app/sign-up/page.tsx` | UI de login/cadastro |
