import os
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://test:test@localhost/test")
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from app.backend.connections import analise
from app.backend.schemas import PedidoAnalise


class AnalysisTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.connection = self.engine.connect()
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.connection.close)
        for sql in (
            'CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT)',
            'CREATE TABLE pedidos (id INTEGER PRIMARY KEY, cliente_id INTEGER REFERENCES clientes(id))',
            'CREATE TABLE itens (id INTEGER PRIMARY KEY, pedido_id INTEGER)',
            'CREATE TABLE logs (id INTEGER PRIMARY KEY, mensagem TEXT)',
            'CREATE TABLE categorias (id INTEGER PRIMARY KEY, pai_id INTEGER REFERENCES categorias(id))',
            'CREATE TABLE pares (a INTEGER, b INTEGER, PRIMARY KEY (a, b))',
            'CREATE TABLE filhos (x INTEGER, y INTEGER, FOREIGN KEY (x, y) REFERENCES pares(a, b))',
        ):
            self.connection.execute(text(sql))
        self.registro = SimpleNamespace(id=1, nome="Teste", database="db")
        self.disponiveis = [{"schema": "main", "nome": nome} for nome in ['clientes', 'pedidos', 'itens', 'logs', 'categorias', 'pares', 'filhos']]
        patch.object(analise.catalogo, "listar_tabelas", return_value=self.disponiveis).start()
        self.addCleanup(patch.stopall)

    def executar(self, nomes):
        pedido = PedidoAnalise(schemas=['main'], tabelas=[{"schema": "main", "nome": nome} for nome in nomes])
        return analise.analisar(self.connection, self.registro, pedido)

    def test_declared_suggested_and_isolated_tables_from_real_metadata(self):
        result = self.executar(['clientes', 'pedidos', 'itens', 'logs'])
        declaradas = [r for r in result['relacoes'] if r['tipo'] == 'declarada']
        sugeridas = [r for r in result['relacoes'] if r['tipo'] == 'sugerida']
        self.assertEqual(len(declaradas), 1)
        self.assertEqual(declaradas[0]['colunas_origem'], ['cliente_id'])
        self.assertEqual(len(sugeridas), 1)
        self.assertEqual(sugeridas[0]['colunas_origem'], ['pedido_id'])
        self.assertEqual(result['sem_relacao'], [analise.identificar('main', 'logs')])
        self.assertTrue(result['tabelas'][0]['colunas'][0]['chave_primaria'])
        for relacao in result['relacoes']:
            self.assertIs(relacao['confirmada'], False)
            self.assertEqual(relacao['titulo'], '')
            self.assertEqual(relacao['descricao'], '')

    def test_composite_and_self_references(self):
        result = self.executar(['pares', 'filhos', 'categorias'])
        self.assertEqual(len(result['relacoes']), 2)
        composite = next(r for r in result['relacoes'] if r['colunas_origem'] == ['x', 'y'])
        self.assertEqual(composite['colunas_destino'], ['a', 'b'])
        self.assertTrue(any(r['origem'] == r['destino'] for r in result['relacoes']))

    def test_references_outside_selection_are_explicit_and_duplicates_removed(self):
        result = self.executar(['pedidos', 'pedidos'])
        self.assertEqual(len(result['tabelas']), 1)
        self.assertEqual(result['relacoes'], [])
        self.assertIn('main.clientes', result['avisos'][0])

    def test_invalid_selection_rejected_before_inspection(self):
        for schemas, nome in [(['outro'], 'clientes'), (['main'], 'inexistente')]:
            pedido = PedidoAnalise(schemas=schemas, tabelas=[{"schema": "main", "nome": nome}])
            with self.assertRaises(HTTPException):
                analise.analisar(self.connection, self.registro, pedido)

    def test_identifier_collisions_are_avoided(self):
        self.assertNotEqual(analise.identificar('a.b', 'c'), analise.identificar('a', 'b.c'))
