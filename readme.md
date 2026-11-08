# EncilhaDB

Aplicação local para gerenciar conexões PostgreSQL, analisar relações entre tabelas e salvar os resultados no banco do EncilhaDB. Frontend React/Vite, API FastAPI e armazenamento PostgreSQL.

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

Instalações novas criam as tabelas já no formato atual ao iniciar a API. A tabela `tb_analise` é criada automaticamente, caso ainda não exista, também em instalações atuais. Essa adição não altera tabelas existentes nem dispensa a migração manual de conexões legadas.

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
5. Clique em **Analisar dados** e revise a confirmação. A API consulta os metadados das tabelas escolhidas. Durante a consulta, os controles ficam bloqueados para evitar execuções duplicadas. Falhas preservam a seleção para uma nova tentativa.
6. Ao concluir, a tela `/analises` confirma o sucesso e mostra o grafo de relações com as tabelas sem ligação ao lado, mantendo o estilo simples das demais páginas.

Alterar a conexão limpa schemas e tabelas. Alterar os schemas invalida sua confirmação e limpa as tabelas selecionadas. As consultas desabilitam os controles enquanto estão em andamento; falhas permitem repetir a operação.

As rotas `GET /conexoes/{id}/schemas` e `POST /conexoes/{id}/tabelas` não recebem senha. A segunda recebe apenas a lista `schemas`. O destino e a credencial vêm da conexão cadastrada. As consultas usam transações somente leitura, os mesmos destinos autorizados e os limites de concorrência e tentativas dos testes de conexão. Não há leitura dos registros das tabelas nesta etapa.

`POST /conexoes/{id}/analises` recebe `schemas` e `tabelas` (cada tabela com `schema` e `nome`), valida a disponibilidade e inspeciona colunas, tipos, nulabilidade, chaves primárias, únicas e estrangeiras. O limite por análise é de 500 tabelas. Apenas os metadados são consultados; nenhum registro é lido ou alterado. O navegador aguarda até dois minutos por essa operação, mantendo o timeout de 15 segundos nas demais requisições.

O grafo apresenta as chaves estrangeiras detectadas, incluindo chaves compostas, autorrelações e referências entre schemas selecionados, e sugestões por nomes de colunas e tipos iguais que correspondam a uma chave primária ou única, por exemplo `pedidos.cliente_id` para `clientes.id`. Ter apenas uma coluna genérica `id` em ambas as tabelas não gera sugestão. Essas heurísticas não garantem a existência de uma relação e não descobrem todas as relações semânticas possíveis.

Todas as relações começam **sem confirmação**, inclusive as detectadas como chaves estrangeiras e as criadas manualmente. Enquanto pendentes, são exibidas como **Possível relação**, com linha tracejada. Em **Ações**, clique em **Confirmar relação** após revisar: a relação recebe o ícone verde **✓**, passa a ser identificada como **Relação** e usa linha verde contínua no grafo. As opções de editar e remover continuam disponíveis. Ao salvar uma edição, a confirmação é removida para exigir nova revisão. Desmarcar **Mostrar possíveis relações** exibe somente as confirmadas; a lista de tabelas sem relação considera todas as ligações existentes, independentemente desse filtro.

O grafo utiliza círculos distribuídos em rede, com cores por schema. Quanto mais relações de entrada e saída uma tabela possui, maior é o círculo, que também mostra a quantidade de relações. O espaço da rede cresce conforme o número de tabelas e relações. Relações paralelas e autorrelações são preservadas.

Na lista de ligações da tabela selecionada, a coluna **Ações** oferece confirmação, **Editar** e **Remover**. A edição permite escolher a **Tabela principal (origem)**, a **Tabela relacionada (referenciada)** e os pares de colunas, inclusive para relações compostas. Também é possível informar um **Título da relação** (até 150 caracteres) e uma **Descrição da relação** (até 2.000 caracteres), ambos opcionais. Trocar uma tabela limpa as colunas daquele lado para exigir uma nova seleção. O formulário valida a existência das colunas, evita repetições no mesmo lado e impede relações duplicadas. **Cancelar edição** descarta o rascunho; **Remover** exige confirmação.

As tabelas sem relação ficam somente na lista lateral e não participam do posicionamento, tamanho, cores ou destaque do grafo. O botão **+** ao lado de cada uma abre **Criar relação**, com a tabela principal preenchida. Selecione a tabela relacionada, as colunas e, opcionalmente, título e descrição. Ao criar, a tabela entra no grafo, sai da lista de isoladas e a relação segue o mesmo fluxo de confirmação, edição e remoção. A visualização de possíveis relações é ativada ao salvar para mostrar a ligação pendente.

Criar, editar, confirmar ou remover uma relação atualiza o grafo, os tamanhos dos círculos, as ligações, as contagens e a lista de tabelas sem relação. Títulos e descrições aparecem nas listas e na identificação das arestas do grafo. As ações também ficam disponíveis em **Detalhes das relações**. As alterações pertencem apenas ao resultado da análise e são mantidas no estado da navegação, inclusive ao recarregar essa entrada do histórico. Uma nova análise consulta novamente os metadados originais e começa sem confirmações. Nenhuma chave estrangeira, coluna ou registro é alterado no PostgreSQL.

Clique em um círculo para destacar todas as suas ligações e as tabelas conectadas. Um painel mostra as relações de entrada e saída, com tabelas e colunas de origem/destino, seguindo o filtro de possíveis relações. Clique nas tabelas desse painel para navegar pela rede. Clique novamente no círculo ou em **Mostrar toda a rede** para remover o destaque. As colunas e os tipos continuam disponíveis abaixo. O grafo se ajusta à área disponível, sem botões de zoom nem barras de rolagem. Segure o botão esquerdo do mouse e arraste para mover a visão em qualquer direção. Use **Ctrl + rolagem do mouse** sobre o grafo para ampliar ou reduzir em torno do cursor; a rolagem sem Ctrl continua rolando a página. As tabelas sem relação permanecem na lista lateral. Referências para tabelas fora da seleção são informadas separadamente. O resultado é um retrato dos metadados no momento da análise. Para guardá-lo permanentemente no banco do EncilhaDB, utilize **Salvar análise**.

## Salvar e reabrir análises

1. Na tela de resultado, clique em **Salvar análise**.
2. Informe um nome (obrigatório, até 100 caracteres) e uma descrição (opcional, até 4.000 caracteres).
3. O campo **Database** é preenchido automaticamente pela conexão de origem e aparece somente para leitura. O servidor verifica essa origem e impede sua alteração, inclusive ao atualizar uma análise salva.
4. Clique em **Confirmar salvamento**. Tabelas, schemas, metadados, relações detectadas/criadas/editadas, títulos, descrições e confirmações são persistidos em `tb_analise`, no PostgreSQL configurado em `DATABASE_URL` do EncilhaDB.
5. Abra **Análises salvas** na lista de conexões ou na tela de resultado. A tela `/analises_salvas` mostra nome, descrição, database, data de criação e **Abrir análise**, com as mais recentes primeiro.
6. O endereço `/analises_salvas/{id}` recupera o resultado diretamente do banco, inclusive após fechar o navegador. Não consulta o banco de origem nem exige sua senha para mostrar o resultado salvo.
7. Após revisar relações, clique em **Salvar alterações** para atualizar a mesma análise. No formulário, somente a descrição pode ser editada: o nome fica bloqueado após a criação, assim como o database. A API também rejeita tentativas de alterar o nome. A data de criação é preservada. A tela indica quando há alterações ainda não salvas.

Uma análise salva permanece disponível mesmo que a conexão de origem seja posteriormente alterada ou excluída. Para salvar uma análise nova, a conexão deve existir e seu database deve continuar correspondendo à origem da análise. Os snapshots armazenam metadados, sem credenciais. As rotas `POST /analises`, `GET /analises`, `GET /analises/{id}` e `PUT /analises/{id}` usam o banco da aplicação e seguem as mesmas restrições de acesso local da API.

Reinicie a API após atualizar o código para carregar essas rotas e criar/verificar a tabela de análises. Não é preciso iniciar outra instância caso a API já esteja em execução: encerre-a no terminal antes de reiniciar.

Conexões cadastradas antes deste recurso precisam ser editadas e salvas uma vez: a versão anterior descartava as senhas. Se a credencial estiver ausente, corrompida ou pertencer a outro usuário do Windows, a tela orienta editar a conexão. Não é necessária uma nova migração do banco para este recurso. Ao excluir uma conexão, sua credencial protegida também é removida.

A API utiliza:
- `201`: conexão ou análise criada.
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
