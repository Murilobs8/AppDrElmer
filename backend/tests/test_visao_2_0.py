"""
Test suite for AppDrElmer 'Visão 2.0' restructuring

Tests for:
1. POST /api/producoes - create production with motivo, data, valor, quantidade, unidade
2. GET /api/producoes - list all productions
3. PUT /api/producoes/{id} - update production
4. DELETE /api/producoes/{id} - delete production
5. POST /api/producoes/bulk - bulk create (recorrente=true creates N records with 30-day intervals; recorrente=false creates N on same date)
6. POST /api/movimentacoes/entrada - create ONE animal + ONE movimentacao atomically
7. POST /api/movimentacoes/entrada/bulk - create N animals with sequential tags + N movimentacoes
8. POST /api/movimentacoes with tipo='producao' - should return 422 (Literal now only 'entrada'/'saida')
9. GET /api/dashboard/stats - should include receitas from new producoes collection
10. Integrity: after POST /api/movimentacoes/entrada, verify /api/animais/{id}/historico returns the movimentacao
"""

import pytest
import requests
import os
import uuid
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def unique_id():
    """Generate unique ID for test data"""
    return uuid.uuid4().hex[:8]


# ============= TEST 1-4: PRODUCAO CRUD =============

class TestProducaoCRUD:
    """Tests for Producao CRUD operations"""
    
    def test_create_producao(self, api_client):
        """POST /api/producoes - create production with all fields"""
        prefix = f"T{unique_id()}"
        
        producao_data = {
            "motivo": "leite",
            "data": date.today().isoformat(),
            "valor": 150.50,
            "quantidade": 25.5,
            "unidade": "litros",
            "tipo_animal": "Bovino",
            "observacoes": f"{prefix} producao teste"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/producoes", json=producao_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        producao = resp.json()
        assert "id" in producao, f"Response should contain 'id': {producao}"
        assert producao["motivo"] == "leite"
        assert producao["valor"] == 150.50
        assert producao["quantidade"] == 25.5
        assert producao["unidade"] == "litros"
        assert producao["tipo_animal"] == "Bovino"
        
        print(f"✓ Created producao: {producao['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/producoes/{producao['id']}")
    
    def test_list_producoes(self, api_client):
        """GET /api/producoes - list all productions"""
        prefix = f"T{unique_id()}"
        
        # Create 2 producoes
        producao_ids = []
        for i in range(2):
            producao_data = {
                "motivo": f"ovos_{i}",
                "data": date.today().isoformat(),
                "valor": 50.0 + i * 10,
                "quantidade": 30 + i,
                "unidade": "unidades",
                "observacoes": f"{prefix} producao {i}"
            }
            resp = api_client.post(f"{BASE_URL}/api/producoes", json=producao_data)
            assert resp.status_code == 200
            producao_ids.append(resp.json()["id"])
        
        # List all
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        producoes = resp.json()
        assert isinstance(producoes, list), f"Should return a list: {type(producoes)}"
        
        # Verify our created producoes are in the list
        returned_ids = [p["id"] for p in producoes]
        for pid in producao_ids:
            assert pid in returned_ids, f"Producao {pid} should be in list"
        
        print(f"✓ Listed producoes, found {len(producoes)} total, including our {len(producao_ids)} test producoes")
        
        # Cleanup
        for pid in producao_ids:
            api_client.delete(f"{BASE_URL}/api/producoes/{pid}")
    
    def test_update_producao(self, api_client):
        """PUT /api/producoes/{id} - update production"""
        prefix = f"T{unique_id()}"
        
        # Create producao
        producao_data = {
            "motivo": "mel",
            "data": date.today().isoformat(),
            "valor": 200.0,
            "quantidade": 5.0,
            "unidade": "kg",
            "observacoes": f"{prefix} original"
        }
        resp = api_client.post(f"{BASE_URL}/api/producoes", json=producao_data)
        assert resp.status_code == 200
        producao_id = resp.json()["id"]
        
        # Update producao
        update_data = {
            "motivo": "mel",
            "data": date.today().isoformat(),
            "valor": 250.0,
            "quantidade": 7.5,
            "unidade": "kg",
            "observacoes": f"{prefix} updated"
        }
        resp = api_client.put(f"{BASE_URL}/api/producoes/{producao_id}", json=update_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        updated = resp.json()
        assert updated["valor"] == 250.0, f"Valor should be updated: {updated['valor']}"
        assert updated["quantidade"] == 7.5, f"Quantidade should be updated: {updated['quantidade']}"
        
        # Verify with GET
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        producoes = resp.json()
        found = [p for p in producoes if p["id"] == producao_id]
        assert len(found) == 1
        assert found[0]["valor"] == 250.0
        
        print(f"✓ Updated producao {producao_id}: valor=250.0, quantidade=7.5")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/producoes/{producao_id}")
    
    def test_delete_producao(self, api_client):
        """DELETE /api/producoes/{id} - delete production"""
        prefix = f"T{unique_id()}"
        
        # Create producao
        producao_data = {
            "motivo": "la",
            "data": date.today().isoformat(),
            "valor": 100.0,
            "quantidade": 2.0,
            "unidade": "kg",
            "observacoes": f"{prefix} to delete"
        }
        resp = api_client.post(f"{BASE_URL}/api/producoes", json=producao_data)
        assert resp.status_code == 200
        producao_id = resp.json()["id"]
        
        # Delete producao
        resp = api_client.delete(f"{BASE_URL}/api/producoes/{producao_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert "message" in result, f"Response should contain 'message': {result}"
        
        # Verify it's gone
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        producoes = resp.json()
        found = [p for p in producoes if p["id"] == producao_id]
        assert len(found) == 0, f"Producao should be deleted"
        
        print(f"✓ Deleted producao {producao_id}")
    
    def test_delete_producao_not_found(self, api_client):
        """DELETE /api/producoes/{id} - should return 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        resp = api_client.delete(f"{BASE_URL}/api/producoes/{fake_id}")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("✓ DELETE non-existent producao returns 404")
    
    def test_update_producao_not_found(self, api_client):
        """PUT /api/producoes/{id} - should return 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        update_data = {
            "motivo": "test",
            "data": date.today().isoformat(),
            "valor": 100.0,
            "quantidade": 1.0
        }
        resp = api_client.put(f"{BASE_URL}/api/producoes/{fake_id}", json=update_data)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("✓ PUT non-existent producao returns 404")


# ============= TEST 5: PRODUCAO BULK =============

class TestProducaoBulk:
    """Tests for POST /api/producoes/bulk"""
    
    def test_bulk_producao_recorrente_true(self, api_client):
        """POST /api/producoes/bulk with recorrente=true creates N records with 30-day intervals"""
        prefix = f"T{unique_id()}"
        
        bulk_data = {
            "motivo": "leite_recorrente",
            "quantidade_registros": 3,
            "data_inicio": date.today().isoformat(),
            "valor": 100.0,
            "quantidade": 20.0,
            "unidade": "litros",
            "tipo_animal": "Bovino",
            "observacoes": f"{prefix} bulk recorrente",
            "recorrente": True
        }
        
        resp = api_client.post(f"{BASE_URL}/api/producoes/bulk", json=bulk_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert "total" in result, f"Response should contain 'total': {result}"
        assert result["total"] == 3, f"Should create 3 producoes: {result['total']}"
        assert "producoes" in result, f"Response should contain 'producoes': {result}"
        assert len(result["producoes"]) == 3, f"Should have 3 producoes in list"
        
        print(f"✓ Bulk recorrente=true created {result['total']} producoes")
        
        # Verify dates are spaced 30 days apart
        producao_ids = [p["id"] for p in result["producoes"]]
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        all_producoes = resp.json()
        
        created_producoes = [p for p in all_producoes if p["id"] in producao_ids]
        dates = sorted([p["data"] for p in created_producoes])
        
        # Check that dates are 30 days apart
        if len(dates) >= 2:
            date1 = date.fromisoformat(dates[0])
            date2 = date.fromisoformat(dates[1])
            diff = (date2 - date1).days
            assert diff == 30, f"Dates should be 30 days apart, got {diff} days"
            print(f"✓ Verified dates are 30 days apart: {dates[0]} -> {dates[1]}")
        
        # Cleanup
        for pid in producao_ids:
            api_client.delete(f"{BASE_URL}/api/producoes/{pid}")
    
    def test_bulk_producao_recorrente_false(self, api_client):
        """POST /api/producoes/bulk with recorrente=false creates N records on same date"""
        prefix = f"T{unique_id()}"
        
        target_date = date.today().isoformat()
        bulk_data = {
            "motivo": "ovos_bulk",
            "quantidade_registros": 4,
            "data_inicio": target_date,
            "valor": 50.0,
            "quantidade": 30.0,
            "unidade": "unidades",
            "observacoes": f"{prefix} bulk same date",
            "recorrente": False
        }
        
        resp = api_client.post(f"{BASE_URL}/api/producoes/bulk", json=bulk_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result["total"] == 4, f"Should create 4 producoes: {result['total']}"
        
        print(f"✓ Bulk recorrente=false created {result['total']} producoes")
        
        # Verify all dates are the same
        producao_ids = [p["id"] for p in result["producoes"]]
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        all_producoes = resp.json()
        
        created_producoes = [p for p in all_producoes if p["id"] in producao_ids]
        dates = [p["data"] for p in created_producoes]
        
        # All dates should be the same
        unique_dates = set(dates)
        assert len(unique_dates) == 1, f"All dates should be the same: {unique_dates}"
        assert target_date in unique_dates, f"Date should be {target_date}: {unique_dates}"
        
        print(f"✓ Verified all {len(dates)} producoes have same date: {target_date}")
        
        # Cleanup
        for pid in producao_ids:
            api_client.delete(f"{BASE_URL}/api/producoes/{pid}")


# ============= TEST 6: ENTRADA UNIFICADA (animal + movimentacao atomicamente) =============

class TestEntradaUnificada:
    """Tests for POST /api/movimentacoes/entrada"""
    
    def test_entrada_creates_animal_and_movimentacao(self, api_client):
        """POST /api/movimentacoes/entrada creates ONE animal + ONE movimentacao atomically"""
        prefix = f"T{unique_id()}"
        tag = f"{prefix}_ENT001"
        
        entrada_data = {
            "tipo_animal": "Bovino",
            "tag": tag,
            "sexo": "femea",
            "data_nascimento": (date.today() - timedelta(days=365)).isoformat(),
            "peso_atual": 350.0,
            "peso_tipo": "aferido",
            "motivo": "compra",
            "data": date.today().isoformat(),
            "valor": 2500.0,
            "observacoes": f"{prefix} entrada teste"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada", json=entrada_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        
        # Validate response structure
        assert "animal" in result, f"Response should contain 'animal': {result.keys()}"
        assert "movimentacao" in result, f"Response should contain 'movimentacao': {result.keys()}"
        
        animal = result["animal"]
        movimentacao = result["movimentacao"]
        
        # Validate animal fields
        assert "id" in animal, f"Animal should have 'id': {animal}"
        assert animal["tag"] == tag, f"Animal tag should be {tag}: {animal['tag']}"
        assert animal["tipo"] == "Bovino", f"Animal tipo should be Bovino: {animal['tipo']}"
        
        # Validate movimentacao fields
        assert "id" in movimentacao, f"Movimentacao should have 'id': {movimentacao}"
        assert movimentacao["tipo"] == "entrada", f"Movimentacao tipo should be 'entrada': {movimentacao['tipo']}"
        assert movimentacao["motivo"] == "compra", f"Movimentacao motivo should be 'compra': {movimentacao['motivo']}"
        
        # Validate movimentacao.animal_id = animal.id
        assert movimentacao["animal_id"] == animal["id"], f"movimentacao.animal_id should equal animal.id: {movimentacao['animal_id']} != {animal['id']}"
        
        print(f"✓ Created animal {animal['id']} with tag {tag}")
        print(f"✓ Created movimentacao {movimentacao['id']} linked to animal")
        print(f"✓ Verified movimentacao.animal_id = animal.id")
        
        # Verify animal exists in /api/animais
        resp = api_client.get(f"{BASE_URL}/api/animais/{animal['id']}")
        assert resp.status_code == 200, f"Animal should exist: {resp.status_code}"
        fetched_animal = resp.json()
        assert fetched_animal["tag"] == tag
        print(f"✓ Verified animal exists in /api/animais")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{animal['id']}?force=true")
    
    def test_entrada_duplicate_tag_returns_400(self, api_client):
        """POST /api/movimentacoes/entrada with duplicate tag should return 400"""
        prefix = f"T{unique_id()}"
        tag = f"{prefix}_DUP001"
        
        # Create first animal via entrada
        entrada_data = {
            "tipo_animal": "Bovino",
            "tag": tag,
            "motivo": "compra",
            "data": date.today().isoformat()
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada", json=entrada_data)
        assert resp.status_code == 200, f"First entrada should succeed: {resp.text}"
        animal_id = resp.json()["animal"]["id"]
        
        # Try to create second animal with same tag
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada", json=entrada_data)
        assert resp.status_code == 400, f"Expected 400 for duplicate tag, got {resp.status_code}: {resp.text}"
        
        detail = resp.json().get("detail", "")
        assert "ja existe" in detail.lower() or "already" in detail.lower(), f"Error should mention duplicate: {detail}"
        
        print(f"✓ Duplicate tag returns 400: {detail}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{animal_id}?force=true")


# ============= TEST 7: ENTRADA BULK =============

class TestEntradaBulk:
    """Tests for POST /api/movimentacoes/entrada/bulk"""
    
    def test_entrada_bulk_creates_n_animals_and_movimentacoes(self, api_client):
        """POST /api/movimentacoes/entrada/bulk creates N animals with sequential tags + N movimentacoes"""
        prefix = f"T{unique_id()}"
        tag_inicial = f"{prefix}BOV-100"
        quantidade = 5
        
        bulk_data = {
            "tipo_animal": "Bovino",
            "tag_inicial": tag_inicial,
            "quantidade": quantidade,
            "sexo": "macho",
            "peso_atual": 200.0,
            "peso_tipo": "estimado",
            "motivo": "compra",
            "data": date.today().isoformat(),
            "valor": 1500.0,
            "observacoes": f"{prefix} bulk entrada"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada/bulk", json=bulk_data)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        
        # Validate response
        assert "total" in result, f"Response should contain 'total': {result}"
        assert result["total"] == quantidade, f"Should create {quantidade} registros: {result['total']}"
        assert "registros" in result, f"Response should contain 'registros': {result}"
        assert len(result["registros"]) == quantidade, f"Should have {quantidade} registros in list"
        
        print(f"✓ Bulk entrada created {result['total']} animals + movimentacoes")
        
        # Validate sequential tags (BOV-100, BOV-101, BOV-102, BOV-103, BOV-104)
        expected_tags = [f"{prefix}BOV-{100 + i}" for i in range(quantidade)]
        actual_tags = [r["tag"] for r in result["registros"]]
        
        for expected_tag in expected_tags:
            assert expected_tag in actual_tags, f"Tag {expected_tag} should be in list: {actual_tags}"
        
        print(f"✓ Verified sequential tags: {actual_tags}")
        
        # Verify all animals were created
        animal_ids = [r["animal_id"] for r in result["registros"]]
        for animal_id in animal_ids:
            resp = api_client.get(f"{BASE_URL}/api/animais/{animal_id}")
            assert resp.status_code == 200, f"Animal {animal_id} should exist"
        
        print(f"✓ Verified all {len(animal_ids)} animals exist in /api/animais")
        
        # Cleanup
        for animal_id in animal_ids:
            api_client.delete(f"{BASE_URL}/api/animais/{animal_id}?force=true")
    
    def test_entrada_bulk_duplicate_tags_returns_400(self, api_client):
        """POST /api/movimentacoes/entrada/bulk with existing tags should return 400"""
        prefix = f"T{unique_id()}"
        tag_inicial = f"{prefix}DUP-001"
        
        # Create first batch
        bulk_data = {
            "tipo_animal": "Bovino",
            "tag_inicial": tag_inicial,
            "quantidade": 2,
            "motivo": "compra",
            "data": date.today().isoformat()
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada/bulk", json=bulk_data)
        assert resp.status_code == 200
        animal_ids = [r["animal_id"] for r in resp.json()["registros"]]
        
        # Try to create second batch with overlapping tags
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada/bulk", json=bulk_data)
        assert resp.status_code == 400, f"Expected 400 for duplicate tags, got {resp.status_code}: {resp.text}"
        
        detail = resp.json().get("detail", "")
        assert "ja existem" in detail.lower() or "already" in detail.lower(), f"Error should mention duplicates: {detail}"
        
        print(f"✓ Bulk with duplicate tags returns 400: {detail}")
        
        # Cleanup
        for animal_id in animal_ids:
            api_client.delete(f"{BASE_URL}/api/animais/{animal_id}?force=true")


# ============= TEST 8: REJEICAO DE tipo='producao' EM POST /movimentacoes =============

class TestMovimentacaoTipoProducaoRejected:
    """Tests for POST /api/movimentacoes rejecting tipo='producao'"""
    
    def test_movimentacao_tipo_producao_returns_422(self, api_client):
        """POST /api/movimentacoes with tipo='producao' should return 422"""
        prefix = f"T{unique_id()}"
        
        mov_data = {
            "tipo": "producao",  # This should be rejected
            "motivo": "leite",
            "data": date.today().isoformat(),
            "valor": 100.0,
            "quantidade": 20.0
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 422, f"Expected 422 for tipo='producao', got {resp.status_code}: {resp.text}"
        
        print(f"✓ POST /api/movimentacoes with tipo='producao' returns 422")
    
    def test_movimentacao_tipo_entrada_accepted(self, api_client):
        """POST /api/movimentacoes with tipo='entrada' should be accepted"""
        prefix = f"T{unique_id()}"
        
        mov_data = {
            "tipo": "entrada",
            "motivo": "compra",
            "data": date.today().isoformat(),
            "valor": 1000.0,
            "quantidade": 1
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 200, f"Expected 200 for tipo='entrada', got {resp.status_code}: {resp.text}"
        
        mov_id = resp.json()["id"]
        print(f"✓ POST /api/movimentacoes with tipo='entrada' accepted: {mov_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/movimentacoes/{mov_id}")
    
    def test_movimentacao_tipo_saida_accepted(self, api_client):
        """POST /api/movimentacoes with tipo='saida' should be accepted"""
        prefix = f"T{unique_id()}"
        
        mov_data = {
            "tipo": "saida",
            "motivo": "venda",
            "data": date.today().isoformat(),
            "valor": 2000.0,
            "quantidade": 1
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 200, f"Expected 200 for tipo='saida', got {resp.status_code}: {resp.text}"
        
        mov_id = resp.json()["id"]
        print(f"✓ POST /api/movimentacoes with tipo='saida' accepted: {mov_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/movimentacoes/{mov_id}")


# ============= TEST 9: DASHBOARD STATS COM PRODUCOES =============

class TestDashboardStatsWithProducoes:
    """Tests for GET /api/dashboard/stats including receitas from producoes"""
    
    def test_dashboard_stats_includes_producoes_receitas(self, api_client):
        """GET /api/dashboard/stats should include receitas from producoes + vendas"""
        prefix = f"T{unique_id()}"
        
        # Create 1 producao with valor=100
        producao_data = {
            "motivo": "leite_stats",
            "data": date.today().isoformat(),
            "valor": 100.0,
            "quantidade": 10.0,
            "unidade": "litros",
            "observacoes": f"{prefix} producao stats"
        }
        resp = api_client.post(f"{BASE_URL}/api/producoes", json=producao_data)
        assert resp.status_code == 200
        producao_id = resp.json()["id"]
        print(f"✓ Created producao with valor=100: {producao_id}")
        
        # Create 1 movimentacao saida/venda with valor=200
        mov_data = {
            "tipo": "saida",
            "motivo": "venda",
            "data": date.today().isoformat(),
            "valor": 200.0,
            "quantidade": 1,
            "observacoes": f"{prefix} venda stats"
        }
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 200
        mov_id = resp.json()["id"]
        print(f"✓ Created movimentacao saida/venda with valor=200: {mov_id}")
        
        # Get dashboard stats
        resp = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        stats = resp.json()
        
        # Validate stats structure
        assert "receitas" in stats, f"Stats should contain 'receitas': {stats.keys()}"
        assert "despesas" in stats, f"Stats should contain 'despesas': {stats.keys()}"
        assert "lucro" in stats, f"Stats should contain 'lucro': {stats.keys()}"
        
        # Receitas should include both producao (100) and venda (200)
        # Note: There might be other data in the DB, so we just check that receitas >= 300
        assert stats["receitas"] >= 300, f"Receitas should be at least 300 (100 producao + 200 venda): {stats['receitas']}"
        
        print(f"✓ Dashboard stats: receitas={stats['receitas']}, despesas={stats['despesas']}, lucro={stats['lucro']}")
        print(f"✓ Verified receitas includes producoes (>= 300)")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/producoes/{producao_id}")
        api_client.delete(f"{BASE_URL}/api/movimentacoes/{mov_id}")


# ============= TEST 10: INTEGRIDADE - HISTORICO ANIMAL APOS ENTRADA =============

class TestIntegridadeHistoricoAnimal:
    """Tests for integrity: after POST /api/movimentacoes/entrada, verify /api/animais/{id}/historico"""
    
    def test_historico_includes_entrada_movimentacao(self, api_client):
        """After POST /api/movimentacoes/entrada, /api/animais/{id}/historico should include the movimentacao"""
        prefix = f"T{unique_id()}"
        tag = f"{prefix}_HIST001"
        
        # Create animal via entrada
        entrada_data = {
            "tipo_animal": "Bovino",
            "tag": tag,
            "sexo": "macho",
            "motivo": "nascimento",
            "data": date.today().isoformat(),
            "valor": 0,
            "observacoes": f"{prefix} historico test"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada", json=entrada_data)
        assert resp.status_code == 200
        
        result = resp.json()
        animal_id = result["animal"]["id"]
        movimentacao_id = result["movimentacao"]["id"]
        
        print(f"✓ Created animal {animal_id} via entrada with movimentacao {movimentacao_id}")
        
        # Get historico
        resp = api_client.get(f"{BASE_URL}/api/animais/{animal_id}/historico")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        historico = resp.json()
        
        # Validate historico structure
        assert "animal" in historico, f"Historico should contain 'animal': {historico.keys()}"
        assert "historico" in historico, f"Historico should contain 'historico': {historico.keys()}"
        assert "total_movimentacoes" in historico, f"Historico should contain 'total_movimentacoes': {historico.keys()}"
        
        # Validate animal in historico
        assert historico["animal"]["id"] == animal_id
        assert historico["animal"]["tag"] == tag
        
        # Validate movimentacao is in historico
        assert historico["total_movimentacoes"] >= 1, f"Should have at least 1 movimentacao: {historico['total_movimentacoes']}"
        
        # Find the movimentacao in historico list
        mov_entries = [h for h in historico["historico"] if h.get("tipo") == "movimentacao"]
        assert len(mov_entries) >= 1, f"Should have at least 1 movimentacao entry in historico: {mov_entries}"
        
        # Verify our movimentacao is there
        mov_ids = [h.get("id") for h in mov_entries]
        assert movimentacao_id in mov_ids, f"Movimentacao {movimentacao_id} should be in historico: {mov_ids}"
        
        print(f"✓ Verified movimentacao {movimentacao_id} is in animal's historico")
        print(f"✓ Historico has {historico['total_movimentacoes']} movimentacoes, {historico.get('total_eventos', 0)} eventos")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{animal_id}?force=true")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
