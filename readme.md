# EncilhaDB

Aplicação web para cadastrar e gerenciar conexões com bancos de dados. O frontend usa React/Vite, a API usa FastAPI e o PostgreSQL armazena as conexões cadastradas.

Este tutorial usa Windows PowerShell. Mantenha os comandos executados a partir da raiz do repositório, exceto quando indicado.

## Requisitos

- Git
- Python 3.11 ou superior
- Node.js 18 ou superior (inclui npm)
- PostgreSQL local ou acessível pela rede

## Configuração inicial

Faça esta configuração uma vez por máquina.

### 1. Obtenha o projeto

```powershell
git clone https://github.com/gabrielkfiebig/HADS_GabrielFiebig_EncilhaDB.git
Set-Location .\HADS_GabrielFiebig_EncilhaDB
```

Se o repositório já estiver clonado, abra um terminal PowerShell na pasta que contém este `readme.md`.

### 2. Crie o banco de dados da aplicação

Inicie o serviço do PostgreSQL. Pelo `psql`, conecte-se ao servidor e crie o banco:

```powershell
psql -U postgres -h localhost -p 5432
```

No prompt do `psql`, execute:

```sql
CREATE DATABASE encilhadb;
\q
```

O nome `encilhadb` deve ser o mesmo usado na URL de conexão abaixo. Se preferir, crie esse banco pelo pgAdmin. Ajuste usuário, host e porta aos valores da sua instalação.

### 3. Configure e instale o backend

Na raiz do repositório, crie o ambiente virtual e instale as dependências:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" sqlalchemy python-dotenv bcrypt psycopg2-binary
```

Crie o arquivo `.env` na raiz do repositório a partir do exemplo:

```powershell
Copy-Item .\app\backend\.env.example .\.env
```

Edite `.env` e substitua usuário e senha pelos dados do PostgreSQL:

```env
DATABASE_URL=postgresql+psycopg2://postgres:senha@localhost:5432/encilhadb
```

Se a senha contiver caracteres especiais, codifique-os para URL antes de colocá-la na conexão (por exemplo, `@` como `%40`). Não compartilhe nem versione o arquivo `.env`; ele contém credenciais locais.

### 4. Instale as dependências do frontend

```powershell
Set-Location .\app\frontend
npm.cmd ci
Set-Location ..\..
```

## Iniciar a aplicação

Sempre que for usar o sistema:

1. Inicie o serviço do PostgreSQL.
2. Abra um terminal PowerShell na raiz do repositório e inicie a API:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.backend.route:app --reload
   ```

   A API ficará disponível em `http://localhost:8000`. A primeira inicialização cria a tabela necessária no banco `encilhadb`.
3. Abra um segundo terminal PowerShell na raiz do repositório e inicie o frontend:

   ```powershell
   Set-Location .\app\frontend
   npm.cmd run dev
   ```

4. Abra no navegador o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

Deixe os dois terminais abertos enquanto usar o sistema. Para encerrar, pressione `Ctrl+C` em cada terminal.

## Tutorial rápido

1. Na página inicial, clique em **Nova conexão**.
2. Informe um nome, o tipo de banco, host, porta, nome do banco de dados, usuário e senha da conexão que deseja cadastrar.
3. Clique em **Testar conexão**. O botão **Salvar conexão** só fica disponível quando o teste termina com sucesso.
4. Clique em **Salvar conexão**. A conexão cadastrada aparecerá na lista inicial; use **Editar** para alterá-la ou **Apagar** para removê-la.

O banco `encilhadb` configurado no `.env` é usado pela aplicação para guardar os cadastros. Os campos preenchidos no formulário se referem ao banco de dados de destino. Atualmente, o teste de conexão da aplicação é implementado para PostgreSQL.

## Documentação da API

Com o backend em execução, acesse `http://localhost:8000/docs` para consultar e testar os endpoints da API.

## Problemas comuns

- **`UnicodeDecodeError` ao iniciar a API:** essa mensagem pode mascarar um erro retornado pelo PostgreSQL em português. Confira o nome do banco na linha `DATABASE_URL` do `.env` e crie exatamente esse banco no PostgreSQL; neste tutorial, o nome é `encilhadb`. Pelo pgAdmin, conecte ao servidor, abra o Query Tool no banco `postgres` e execute `CREATE DATABASE encilhadb;`. Depois, reinicie a API.
- **Erro de conexão com o banco na inicialização:** confira se o serviço do PostgreSQL está ativo, se o banco `encilhadb` existe e se usuário, senha, host e porta em `.env` estão corretos.
- **Erro ao carregar a aplicação ou falar com o servidor:** confirme que backend e frontend estão em execução nos dois terminais e que o backend iniciou sem erros.
- **`psql` não é reconhecido:** crie o banco pelo pgAdmin ou adicione a pasta `bin` do PostgreSQL ao `PATH` do Windows.
- **Dependências do frontend desatualizadas ou ausentes:** execute `npm.cmd ci` novamente dentro de `app\frontend`.
