-- EXECUÇÃO MANUAL, APÓS BACKUP E REVISÃO. Não é executado pela aplicação.
-- Remove definitivamente os hashes. Nenhuma conexão cadastrada é apagada.
-- Execute como script completo com interrupção em erro (psql -v ON_ERROR_STOP=1).
BEGIN;
LOCK TABLE tb_conexao IN ACCESS EXCLUSIVE MODE;

-- A normalização ocorre na mesma transação das verificações e restrições.
UPDATE tb_conexao SET nome = btrim(nome), host = rtrim(lower(btrim(host)), '.'),
    database = btrim(database), usuario = btrim(usuario);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_conexao WHERE nome = '' OR host = '' OR database = ''
               OR usuario = '' OR porta NOT BETWEEN 1 AND 65535 OR tipo_sgbd <> 'postgresql') THEN
        RAISE EXCEPTION 'Existem registros inválidos ou SGBDs sem suporte. Corrija-os antes de migrar.';
    END IF;
    IF EXISTS (SELECT nome FROM tb_conexao GROUP BY nome HAVING count(*) > 1)
       OR EXISTS (SELECT tipo_sgbd, host, porta, database, usuario FROM tb_conexao
                  GROUP BY tipo_sgbd, host, porta, database, usuario HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Existem conexões duplicadas. Resolva-as antes de migrar; nenhum registro foi excluído.';
    END IF;
END $$;

ALTER TABLE tb_conexao ADD CONSTRAINT uq_conexao_nome UNIQUE (nome);
ALTER TABLE tb_conexao ADD CONSTRAINT uq_conexao_destino UNIQUE (tipo_sgbd, host, porta, database, usuario);
ALTER TABLE tb_conexao ADD CONSTRAINT ck_conexao_porta CHECK (porta BETWEEN 1 AND 65535);
ALTER TABLE tb_conexao ADD CONSTRAINT ck_conexao_sgbd CHECK (tipo_sgbd = 'postgresql');
ALTER TABLE tb_conexao DROP COLUMN senha_criptografada;
COMMIT;
