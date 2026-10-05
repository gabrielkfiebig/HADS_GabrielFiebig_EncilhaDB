## Tabela de conexão

CREATE TABLE tb_conexao (
    id                        SERIAL PRIMARY KEY,
    nome                      VARCHAR(100) NOT NULL,
    host                      VARCHAR(255) NOT NULL,
    porta                     INTEGER NOT NULL DEFAULT 5432,
    database                  VARCHAR(100) NOT NULL,
    usuario                   VARCHAR(100) NOT NULL,
    senha_criptografada       VARCHAR(255) NOT NULL,
    tipo_sgbd                 VARCHAR(20)  NOT NULL DEFAULT 'postgresql',
    data_cadastro             TIMESTAMP DEFAULT NOW()
);