# EncilhaDB

Guia rápido para configurar o projeto pela primeira vez e iniciá-lo no dia a dia. Os comandos abaixo usam o Windows PowerShell.

## Requisitos

- Git
- Python 3.11 ou superior
- Node.js 18 ou superior (inclui o npm)
- PostgreSQL

## Configuração inicial

Faça estes passos uma única vez em cada máquina.

### 1. Baixe o projeto

Clone o repositório usando a URL:

```powershell
git clone <URL_DO_REPOSITORIO>
```

Abra a pasta criada pelo clone no VS Code. Nos próximos passos, use terminais PowerShell abertos na raiz do projeto, onde estão `readme.md` e `app/`.

### 2. Crie o banco PostgreSQL

Inicie o serviço do PostgreSQL e crie um banco vazio chamado `encilhadb`. Pelo `psql`:

```text
psql -U postgres -h localhost -p 5432
CREATE DATABASE encihadb;
\q
```

Use o usuário, host e porta configurados na sua instalação. Também é possível criar o banco pelo pgAdmin.

### 3. Configure o backend

Na raiz do projeto, crie um ambiente Python e instale as dependências:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" sqlalchemy python-dotenv bcrypt psycopg2-binary
```

Crie o arquivo `.env` na raiz a partir do exemplo e abra-o para edição:

```powershell
Copy-Item .\app\backend\.env.example .\.env
notepad .env
```

Configure a URL com os dados do seu PostgreSQL:

```env
DATABASE_URL=postgresql+psycopg2://USUARIO:SENHA@localhost:5432/encilhadb
```

Troque `USUARIO` e `SENHA` pelas suas credenciais. Mantenha o `.env` local; ele contém dados privados de acesso.

### 4. Instale as dependências do frontend

```powershell
Set-Location .\app\frontend
npm install
```

Após a instalação, volte à raiz do projeto:

```powershell
Set-Location ..\..
```

## Como iniciar o projeto

Faça estes passos sempre que quiser usar a aplicação. São necessários três serviços em execução: PostgreSQL, backend e frontend.

1. Inicie o serviço do PostgreSQL.
2. Abra um terminal PowerShell na raiz do projeto e execute o backend:

    ```powershell
    .\.venv\Scripts\python.exe -m uvicorn app.backend.route:app --reload
    ```

3. Abra um segundo terminal PowerShell na raiz do projeto e inicie o frontend:

    ```powershell
    Set-Location .\app\frontend
    npm run dev
    ```

4. Abra no navegador o endereço exibido pelo Vite`http://localhost:5173`.

Deixe os dois terminais abertos enquanto estiver usando a aplicação. Para encerrá-la, pressione `Ctrl+C` em cada terminal. Na próxima vez, repita apenas os passos desta seção; não é necessário reinstalar as dependências.