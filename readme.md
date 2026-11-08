# EncilhaDB

Aplicação local para cadastrar, listar, testar, editar e excluir parâmetros de conexões PostgreSQL. Frontend React/Vite, API FastAPI e armazenamento PostgreSQL.

## Limites desta entrega

- Uso individual, somente na própria máquina. Não publicar na internet, não usar proxy reverso e não iniciar com `--host 0.0.0.0`.
- A aplicação não possui login: confia no usuário da máquina e bloqueia clientes remotos e origens web não autorizadas.
- Apenas PostgreSQL é suportado.
- A senha é informada no cadastro/edição e nos testes de conexão. Ao salvar, a credencial é criptografada pelo Windows DPAPI em `.credentials/`, fora do banco e ignorada pelo Git, para reutilizar a conexão sem solicitar a senha na análise. A API nunca retorna a senha.
- Testar antes de salvar é obrigatório. O servidor faz um novo teste no cadastro e na edição, independentemente do botão do navegador.
- A combinação tipo de SGBD + host + porta + banco + usuário identifica um destino duplicado. Nomes também devem ser únicos, diferenciando maiúsculas/minúsculas.
- Espaços externos são removidos dos parâmetros; o host é convertido para minúsculas e perde o ponto final. Senhas não são normalizadas.
- A duplicidade compara o host cadastrado; aliases diferentes para o mesmo IP continuam sendo cadastros diferentes.
- Os estilos existentes da interface foram preservados. A tabela não recebeu adaptação adicional para telas pequenas.

## Requisitos

- Python 3.11 ou superior, com versões de dependências disponíveis para a sua plataforma.
- Node.js 24.x (recomendado) ou 26 e superiores, conforme o campo engines do frontend.
- PostgreSQL disponível localmente.
- Windows para proteger/reutilizar credenciais com DPAPI; PowerShell para os comandos abaixo. Execute a API com o mesmo usuário do Windows que cadastrou as conexões.

As versões Python estão fixadas em `requirements.txt`; as dependências JavaScript são reproduzidas por `package-lock.json`.

## Instalação

Execute na raiz do repositório:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .\app\backend\.env.example .\.env
```

Se já existir um `.env`, preserve-o e adicione apenas as novas configurações do exemplo. Não compartilhe nem versione credenciais.

Crie o banco da aplicação no PostgreSQL, usando psql ou pgAdmin:

```sql
CREATE DATABASE encilhadb;
```

Ajuste a variável do arquivo `.env`:

```env
DATABASE_URL=postgresql+psycopg2://postgres:senha@localhost:5432/encilhadb
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DB_ALLOWED_NETWORKS=127.0.0.0/8,::1/128
```

Na `DATABASE_URL`, codifique caracteres especiais na senha para URL, por exemplo `@` como `%40`. Nos formulários, digite a senha original, sem codificação.

Instale o frontend:

```powershell
Set-Location .\app\frontend
npm.cmd ci
Set-Location ..\..
```

## Banco existente: migração manual obrigatória

Se você já utilizava a versão que armazenava hashes, a API recusará iniciar até que o banco seja migrado. Não há alteração automática do esquema existente.

1. Pare a API e faça backup do banco.
2. Revise `app/backend/migrations/001_parametros_sem_senha.sql`.
3. Resolva previamente registros MySQL, dados inválidos e duplicidades, inclusive após remover espaços e normalizar os hosts.
4. Execute o script completo no pgAdmin ou pelo psql, ajustando usuário e banco:

```powershell
psql -h localhost -U postgres -d encilhadb -v ON_ERROR_STOP=1 -f app/backend/migrations/001_parametros_sem_senha.sql
```

O script normaliza parâmetros, adiciona restrições e remove definitivamente a coluna de hashes. Não apaga conexões cadastradas. Tudo ocorre em uma transação; inconsistências abortam a migração. Execute uma única vez. Se ocorrer um erro no pgAdmin, encerre a transação com `ROLLBACK;` antes de tentar novamente.

Instalações novas criam a tabela já no formato atual ao iniciar a API.

## Executar

Terminal 1, na raiz:

```powershell
.\.venv\Scripts\python.exe -m app.backend
```

Este comando fixa o endereço em `127.0.0.1:8000`, desabilita a confiança em cabeçalhos de proxy e usa apenas um processo. Não utilize proxy reverso nesta entrega.

Para desenvolvimento com recarga:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.backend.route:app --host 127.0.0.1 --port 8000 --no-proxy-headers --reload
```

Terminal 2:

```powershell
Set-Location .\app\frontend
npm.cmd run dev
```

Abra [EncilhaDB](http://127.0.0.1:5173). As portas do Vite são fixas; se 5173 estiver ocupada, libere-a antes de iniciar.

Documentação da API: [Swagger](http://127.0.0.1:8000/docs).

## Destinos permitidos para testes

Por padrão, apenas IPs loopback e `localhost` são aceitos. Não há consulta DNS: isso evita redirecionamento do destino após a validação e espera indefinida por DNS.

Para um PostgreSQL específico na rede, autorize apenas o IP necessário:

```env
DB_ALLOWED_NETWORKS=127.0.0.0/8,::1/128,192.168.1.10/32
DB_HOST_MAP=db01.interno=192.168.1.10
```

Nesse exemplo, o formulário aceita o IP `192.168.1.10` ou o nome `db01.interno`. O mapeamento não dispensa a autorização da rede. Reinicie a API após mudar o `.env`. A aplicação web continua restrita à máquina, mesmo quando o banco de destino está na rede.

Não use redes amplas como `0.0.0.0/0`. As conexões de destino usam as configurações TLS padrão do driver; destinos remotos com requisitos específicos de TLS/certificados exigem configuração adicional antes do uso.

## Uso e respostas

1. Clique em **Nova conexão** e preencha os parâmetros e a senha.
2. Clique em **Testar conexão**.
3. Salve após o sucesso. Ao alterar qualquer campo, teste novamente.
4. Na edição, informe novamente a senha. A API testa os novos dados antes de gravar.
5. Para excluir, confirme a ação.

Erros preservam os campos preenchidos. Ao salvar um cadastro com sucesso, o formulário é limpo; ao editar, somente a senha é limpa.

## Selecionar dados para análise

Na listagem de conexões, clique em **Analisar dados** para abrir `/analisar_dados`. A tela utiliza os mesmos estilos do cadastro de conexões.

1. Escolha uma única conexão cadastrada. A tela reutiliza a credencial protegida no cadastro, sem campo de senha.
2. Os schemas disponíveis no PostgreSQL são carregados automaticamente. Schemas de sistema são omitidos. Use **Recarregar schemas** para atualizar ou repetir uma consulta.
3. Selecione um ou mais schemas e clique em **Confirmar schemas**.
4. Escolha as tabelas nas listas agrupadas por schema. Visões também são exibidas, identificadas como **(visão)**. Schemas sem tabelas apresentam uma mensagem própria.
5. Clique em **Analisar dados** e revise a segunda confirmação. Nesta versão, confirmar apenas exibe uma mensagem: nenhum processamento de análise é executado e a seleção não é persistida.

Alterar a conexão limpa schemas e tabelas. Alterar os schemas invalida sua confirmação e limpa as tabelas selecionadas. As consultas desabilitam os controles enquanto estão em andamento; falhas permitem repetir a operação.

As rotas `GET /conexoes/{id}/schemas` e `POST /conexoes/{id}/tabelas` não recebem senha. A segunda recebe apenas a lista `schemas`. O destino e a credencial vêm da conexão cadastrada. As consultas usam transações somente leitura, os mesmos destinos autorizados e os limites de concorrência e tentativas dos testes de conexão. Não há leitura dos registros das tabelas nesta etapa.

Conexões cadastradas antes deste recurso precisam ser editadas e salvas uma vez: a versão anterior descartava as senhas. Se a credencial estiver ausente, corrompida ou pertencer a outro usuário do Windows, a tela orienta editar a conexão. Não é necessária uma nova migração do banco para este recurso. Ao excluir uma conexão, sua credencial protegida também é removida.

A API utiliza:
- `201`: conexão criada.
- `200`: consulta, teste, atualização ou exclusão concluídos.
- `400`: teste de conexão malsucedido.
- `403`: cliente, origem ou destino não autorizado.
- `404`: registro inexistente.
- `409`: nome ou destino duplicado.
- `422`: dados inválidos.
- `429`: limite de testes atingido.
- `503`: indisponibilidade do banco da aplicação.

Cada conexão de teste usa timeout de 5 segundos no driver e é encerrada após o uso. Há limite de dois testes simultâneos e 20 tentativas por minuto, compartilhado pelo processo. O reteste ao salvar também consome esse limite. O frontend interrompe a espera após 15 segundos; se isso ocorrer durante um salvamento, confira a listagem antes de tentar novamente, pois interromper a espera não cancela uma transação já concluída no servidor.

## Verificação

Na raiz:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

No frontend:

```powershell
Set-Location .\app\frontend
npm.cmd test
npm.cmd run build
```

Os testes de API usam SQLite em memória e simulam os bancos de destino; os testes React usam jsdom. Não acessam nem migram seu PostgreSQL. Abrangem CRUD, duplicidade, validação, ausência de senhas nas respostas, política de acesso/destinos, timeout configurado, descarte de recursos, porta personalizada, caracteres especiais e resultados assíncronos desatualizados.

Os testes de credenciais usam arquivos temporários e simulam a criptografia. Para validar também o DPAPI real, em um terminal Windows com acesso ao seu perfil, defina `$env:ENCILHADB_TEST_DPAPI = '1'` antes de executar os testes e remova essa variável depois. O teste usa apenas uma credencial fictícia em memória.

Antes de disponibilizar o projeto, valide também com uma instância PostgreSQL de teste: migração de uma cópia do banco antigo, cadastro, teste com senha errada, host indisponível, edição e exclusão.

## Problemas comuns

- **Banco legado:** revise e execute a migração manual descrita acima.
- **Destino não autorizado:** confira o IP e as variáveis `DB_ALLOWED_NETWORKS` e `DB_HOST_MAP`.
- **Limite de testes:** aguarde até um minuto; cadastro e edição também fazem um teste.
- **Erro ao iniciar:** confira o serviço PostgreSQL, a existência do banco e a `DATABASE_URL`.
- **Erro de comunicação:** mantenha API e Vite em execução e utilize as origens locais documentadas.
- **Preview:** para `npm.cmd run preview`, inclua `http://127.0.0.1:4173` em `FRONTEND_ORIGINS` e reinicie a API.
