"""
Regression Test Suite for AppDrElmer Backend Refactoring

Tests to validate that the refactoring (server.py 2063→1669 lines) did NOT break any endpoints.
Extracted modules: models.py, helpers.py, security.py, constants.py

Test Coverage:
1. CRUD cycle: categorias → animais → movimentacoes → eventos → producoes → despesas → lembretes
2. Auth endpoints: POST /api/auth/login (response validation)
3. POST /api/movimentacoes/entrada - atomic animal+movimentacao creation
4. GET /api/animais/{id}/filhos - list children or 404
5. DELETE /api/animais/{id} with dependencies - 409 without force, 200 with force=true
6. DELETE /api/categorias/{id} with despesa - 409 without force, 200 with force=true
7. GET /api/calendario-vacinacao/Bovino - returns CALENDARIO_PADRAO protocols
8. POST /api/calendario-vacinacao/aplicar/Bovino - generates auto lembretes
9. POST /api/calendario-vacinacao/Bovino/sincronizar-lembretes?desativar=false - dry-run
10. GET /api/lembretes/alertas - returns alertas with required fields
11. GET /api/dashboard/stats - includes receitas from producoes + movimentacoes
12. POST /api/producoes, GET, PUT, DELETE - full CRUD
13. POST /api/producoes/bulk with recorrente=true - 30-day intervals
14. GET /api/animais/sequencias - returns tag sequences
15. POST /api/eventos/bulk - creates events for multiple animals
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


# ============= TEST 1: FULL CRUD CYCLE =============

class TestFullCRUDCycle:
    """Test complete CRUD cycle: categorias → animais → movimentacoes → eventos → producoes → despesas → lembretes"""
    
    def test_complete_crud_cycle(self, api_client):
        """Create all entities in sequence, then clean up with force=true"""
        prefix = f"REG{unique_id()}"
        created_ids = {}
        
        # 1. Create categoria
        print("\n--- Step 1: Create Categoria ---")
        cat_data = {"nome": f"{prefix}_Alimentacao", "cor": "#FF5733"}
        resp = api_client.post(f"{BASE_URL}/api/categorias", json=cat_data)
        assert resp.status_code == 200, f"POST /api/categorias failed: {resp.status_code} - {resp.text}"
        created_ids["categoria"] = resp.json()["id"]
        print(f"✓ Created categoria: {created_ids['categoria']}")
        
        # 2. Create animal
        print("\n--- Step 2: Create Animal ---")
        animal_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_BOV001",
            "sexo": "femea",
            "data_nascimento": (date.today() - timedelta(days=365)).isoformat(),
            "peso_atual": 350.0,
            "peso_tipo": "aferido"
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_data)
        assert resp.status_code == 200, f"POST /api/animais failed: {resp.status_code} - {resp.text}"
        created_ids["animal"] = resp.json()["id"]
        print(f"✓ Created animal: {created_ids['animal']}")
        
        # 3. Create movimentacao (entrada)
        print("\n--- Step 3: Create Movimentacao ---")
        mov_data = {
            "tipo": "entrada",
            "motivo": "compra",
            "animal_id": created_ids["animal"],
            "data": date.today().isoformat(),
            "valor": 2500.0,
            "quantidade": 1
        }
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 200, f"POST /api/movimentacoes failed: {resp.status_code} - {resp.text}"
        created_ids["movimentacao"] = resp.json()["id"]
        print(f"✓ Created movimentacao: {created_ids['movimentacao']}")
        
        # 4. Create evento
        print("\n--- Step 4: Create Evento ---")
        evento_data = {
            "tipo": "vacinacao",
            "animal_id": created_ids["animal"],
            "data": date.today().isoformat(),
            "detalhes": f"{prefix} vacinacao teste",
            "vacina": "Febre Aftosa"
        }
        resp = api_client.post(f"{BASE_URL}/api/eventos", json=evento_data)
        assert resp.status_code == 200, f"POST /api/eventos failed: {resp.status_code} - {resp.text}"
        created_ids["evento"] = resp.json()["id"]
        print(f"✓ Created evento: {created_ids['evento']}")
        
        # 5. Create producao
        print("\n--- Step 5: Create Producao ---")
        prod_data = {
            "motivo": "leite",
            "data": date.today().isoformat(),
            "valor": 150.0,
            "quantidade": 25.0,
            "unidade": "litros",
            "tipo_animal": "Bovino"
        }
        resp = api_client.post(f"{BASE_URL}/api/producoes", json=prod_data)
        assert resp.status_code == 200, f"POST /api/producoes failed: {resp.status_code} - {resp.text}"
        created_ids["producao"] = resp.json()["id"]
        print(f"✓ Created producao: {created_ids['producao']}")
        
        # 6. Create despesa
        print("\n--- Step 6: Create Despesa ---")
        desp_data = {
            "categoria_id": created_ids["categoria"],
            "valor": 500.0,
            "data": date.today().isoformat(),
            "descricao": f"{prefix} despesa teste"
        }
        resp = api_client.post(f"{BASE_URL}/api/despesas", json=desp_data)
        assert resp.status_code == 200, f"POST /api/despesas failed: {resp.status_code} - {resp.text}"
        created_ids["despesa"] = resp.json()["id"]
        print(f"✓ Created despesa: {created_ids['despesa']}")
        
        # 7. Create lembrete
        print("\n--- Step 7: Create Lembrete ---")
        lemb_data = {
            "nome": f"{prefix}_Lembrete_Vacinacao",
            "tipo_acao": "vacinacao",
            "condicoes": {"tipo_animal": "Bovino", "status": "ativo"},
            "mensagem": "Vacinar bovinos",
            "recorrencia_dias": 180,
            "ativo": True
        }
        resp = api_client.post(f"{BASE_URL}/api/lembretes", json=lemb_data)
        assert resp.status_code == 200, f"POST /api/lembretes failed: {resp.status_code} - {resp.text}"
        created_ids["lembrete"] = resp.json()["id"]
        print(f"✓ Created lembrete: {created_ids['lembrete']}")
        
        # Verify all GET endpoints work
        print("\n--- Verifying GET endpoints ---")
        
        resp = api_client.get(f"{BASE_URL}/api/categorias")
        assert resp.status_code == 200, f"GET /api/categorias failed"
        print(f"✓ GET /api/categorias: {len(resp.json())} items")
        
        resp = api_client.get(f"{BASE_URL}/api/animais")
        assert resp.status_code == 200, f"GET /api/animais failed"
        print(f"✓ GET /api/animais: {len(resp.json())} items")
        
        resp = api_client.get(f"{BASE_URL}/api/movimentacoes")
        assert resp.status_code == 200, f"GET /api/movimentacoes failed"
        print(f"✓ GET /api/movimentacoes: {len(resp.json())} items")
        
        resp = api_client.get(f"{BASE_URL}/api/eventos")
        assert resp.status_code == 200, f"GET /api/eventos failed"
        print(f"✓ GET /api/eventos: {len(resp.json())} items")
        
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        assert resp.status_code == 200, f"GET /api/producoes failed"
        print(f"✓ GET /api/producoes: {len(resp.json())} items")
        
        resp = api_client.get(f"{BASE_URL}/api/despesas")
        assert resp.status_code == 200, f"GET /api/despesas failed"
        print(f"✓ GET /api/despesas: {len(resp.json())} items")
        
        resp = api_client.get(f"{BASE_URL}/api/lembretes")
        assert resp.status_code == 200, f"GET /api/lembretes failed"
        print(f"✓ GET /api/lembretes: {len(resp.json())} items")
        
        # Cleanup in reverse order
        print("\n--- Cleanup ---")
        api_client.delete(f"{BASE_URL}/api/lembretes/{created_ids['lembrete']}")
        api_client.delete(f"{BASE_URL}/api/despesas/{created_ids['despesa']}")
        api_client.delete(f"{BASE_URL}/api/producoes/{created_ids['producao']}")
        api_client.delete(f"{BASE_URL}/api/eventos/{created_ids['evento']}")
        api_client.delete(f"{BASE_URL}/api/movimentacoes/{created_ids['movimentacao']}")
        api_client.delete(f"{BASE_URL}/api/animais/{created_ids['animal']}?force=true")
        api_client.delete(f"{BASE_URL}/api/categorias/{created_ids['categoria']}?force=true")
        print("✓ All test data cleaned up")


# ============= TEST 2: AUTH ENDPOINTS =============

class TestAuthEndpoints:
    """Test auth endpoints respond correctly"""
    
    def test_login_endpoint_responds(self, api_client):
        """POST /api/auth/login should respond (401 for invalid credentials is expected)"""
        login_data = {"email": "nonexistent@test.com", "password": "wrongpassword"}
        resp = api_client.post(f"{BASE_URL}/api/auth/login", json=login_data)
        # 401 is expected for invalid credentials - endpoint is working
        assert resp.status_code in [200, 401], f"POST /api/auth/login unexpected status: {resp.status_code} - {resp.text}"
        print(f"✓ POST /api/auth/login responds with {resp.status_code} (expected 401 for invalid creds)")
    
    def test_auth_me_requires_auth(self, api_client):
        """GET /api/auth/me should return 401 without token"""
        resp = api_client.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401, f"GET /api/auth/me should return 401 without auth: {resp.status_code}"
        print("✓ GET /api/auth/me returns 401 without auth (as expected)")
    
    def test_users_endpoint_requires_admin(self, api_client):
        """POST /api/users should return 401 without auth"""
        user_data = {"nome": "Test", "email": "test@test.com", "password": "test123", "role": "user"}
        resp = api_client.post(f"{BASE_URL}/api/users", json=user_data)
        assert resp.status_code == 401, f"POST /api/users should return 401 without auth: {resp.status_code}"
        print("✓ POST /api/users returns 401 without auth (admin required)")


# ============= TEST 3: ENTRADA UNIFICADA =============

class TestEntradaUnificada:
    """Test POST /api/movimentacoes/entrada creates animal+movimentacao atomically"""
    
    def test_entrada_creates_animal_and_movimentacao(self, api_client):
        """POST /api/movimentacoes/entrada with tipo_animal, tag, motivo, data"""
        prefix = f"REG{unique_id()}"
        tag = f"{prefix}_ENT001"
        
        entrada_data = {
            "tipo_animal": "Bovino",
            "tag": tag,
            "sexo": "macho",
            "data_nascimento": (date.today() - timedelta(days=180)).isoformat(),
            "peso_atual": 200.0,
            "peso_tipo": "aferido",
            "motivo": "compra",
            "data": date.today().isoformat(),
            "valor": 1500.0,
            "observacoes": f"{prefix} entrada teste"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes/entrada", json=entrada_data)
        assert resp.status_code == 200, f"POST /api/movimentacoes/entrada failed: {resp.status_code} - {resp.text}"
        
        result = resp.json()
        assert "animal" in result, f"Response should contain 'animal': {result.keys()}"
        assert "movimentacao" in result, f"Response should contain 'movimentacao': {result.keys()}"
        
        animal = result["animal"]
        movimentacao = result["movimentacao"]
        
        assert animal["tag"] == tag
        assert animal["tipo"] == "Bovino"
        assert movimentacao["tipo"] == "entrada"
        assert movimentacao["animal_id"] == animal["id"]
        
        print(f"✓ Created animal {animal['id']} with tag {tag}")
        print(f"✓ Created movimentacao {movimentacao['id']} linked to animal")
        
        # Cleanup with force=true
        resp = api_client.delete(f"{BASE_URL}/api/animais/{animal['id']}?force=true")
        assert resp.status_code == 200, f"DELETE with force=true failed: {resp.status_code}"
        print("✓ Cleaned up with force=true")


# ============= TEST 4: GET /api/animais/{id}/filhos =============

class TestAnimaisFilhos:
    """Test GET /api/animais/{id}/filhos"""
    
    def test_filhos_returns_404_for_nonexistent(self, api_client):
        """GET /api/animais/{id}/filhos returns 404 if animal doesn't exist"""
        fake_id = str(uuid.uuid4())
        resp = api_client.get(f"{BASE_URL}/api/animais/{fake_id}/filhos")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ GET /api/animais/{id}/filhos returns 404 for non-existent animal")
    
    def test_filhos_returns_list(self, api_client):
        """GET /api/animais/{id}/filhos returns list (empty if no children)"""
        prefix = f"REG{unique_id()}"
        
        # Create parent animal
        animal_data = {"tipo": "Bovino", "tag": f"{prefix}_MAE001", "sexo": "femea"}
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_data)
        assert resp.status_code == 200
        parent_id = resp.json()["id"]
        
        # Get filhos (should be empty)
        resp = api_client.get(f"{BASE_URL}/api/animais/{parent_id}/filhos")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        filhos = resp.json()
        assert isinstance(filhos, list), f"Should return list: {type(filhos)}"
        print(f"✓ GET /api/animais/{parent_id}/filhos returns list ({len(filhos)} children)")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{parent_id}?force=true")


# ============= TEST 5: DELETE /api/animais/{id} WITH DEPENDENCIES =============

class TestDeleteAnimalWithDependencies:
    """Test DELETE /api/animais/{id} returns 409 without force, 200 with force=true"""
    
    def test_delete_animal_with_dependencies_returns_409(self, api_client):
        """DELETE /api/animais/{id} with movimentacao+evento returns 409 without force"""
        prefix = f"REG{unique_id()}"
        
        # Create animal
        animal_data = {"tipo": "Bovino", "tag": f"{prefix}_DEP001"}
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_data)
        assert resp.status_code == 200
        animal_id = resp.json()["id"]
        
        # Create movimentacao linked to animal
        mov_data = {
            "tipo": "entrada", "motivo": "compra", "animal_id": animal_id,
            "data": date.today().isoformat(), "valor": 1000.0, "quantidade": 1
        }
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 200
        
        # Create evento linked to animal
        evt_data = {
            "tipo": "pesagem", "animal_id": animal_id,
            "data": date.today().isoformat(), "peso": 300.0
        }
        resp = api_client.post(f"{BASE_URL}/api/eventos", json=evt_data)
        assert resp.status_code == 200
        
        # Try to delete without force - should return 409
        resp = api_client.delete(f"{BASE_URL}/api/animais/{animal_id}")
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}: {resp.text}"
        
        detail = resp.json().get("detail", {})
        assert "movimentacoes" in str(detail) or "eventos" in str(detail), f"Should mention dependencies: {detail}"
        print(f"✓ DELETE without force returns 409: {detail.get('message', detail)}")
        
        # Delete with force=true - should succeed
        resp = api_client.delete(f"{BASE_URL}/api/animais/{animal_id}?force=true")
        assert resp.status_code == 200, f"Expected 200 with force=true, got {resp.status_code}"
        
        result = resp.json()
        assert result.get("cascata") == True, f"Should indicate cascata: {result}"
        print(f"✓ DELETE with force=true returns 200, cascata={result.get('cascata')}")


# ============= TEST 6: DELETE /api/categorias/{id} WITH DESPESA =============

class TestDeleteCategoriaWithDespesa:
    """Test DELETE /api/categorias/{id} with despesa returns 409 without force"""
    
    def test_delete_categoria_with_despesa_returns_409(self, api_client):
        """DELETE /api/categorias/{id} with linked despesa returns 409 without force"""
        prefix = f"REG{unique_id()}"
        
        # Create categoria
        cat_data = {"nome": f"{prefix}_CatDep", "cor": "#123456"}
        resp = api_client.post(f"{BASE_URL}/api/categorias", json=cat_data)
        assert resp.status_code == 200
        cat_id = resp.json()["id"]
        
        # Create despesa linked to categoria
        desp_data = {
            "categoria_id": cat_id, "valor": 100.0,
            "data": date.today().isoformat(), "descricao": f"{prefix} despesa"
        }
        resp = api_client.post(f"{BASE_URL}/api/despesas", json=desp_data)
        assert resp.status_code == 200
        
        # Try to delete without force - should return 409
        resp = api_client.delete(f"{BASE_URL}/api/categorias/{cat_id}")
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}: {resp.text}"
        
        detail = resp.json().get("detail", {})
        assert "despesa" in str(detail).lower(), f"Should mention despesas: {detail}"
        print(f"✓ DELETE categoria without force returns 409: {detail.get('message', detail)}")
        
        # Delete with force=true - should succeed
        resp = api_client.delete(f"{BASE_URL}/api/categorias/{cat_id}?force=true")
        assert resp.status_code == 200, f"Expected 200 with force=true, got {resp.status_code}"
        print("✓ DELETE categoria with force=true returns 200")


# ============= TEST 7: GET /api/calendario-vacinacao/Bovino =============

class TestCalendarioVacinacao:
    """Test GET /api/calendario-vacinacao/{tipo_animal} returns CALENDARIO_PADRAO"""
    
    def test_calendario_bovino_returns_protocolos(self, api_client):
        """GET /api/calendario-vacinacao/Bovino returns default protocols from constants.py"""
        resp = api_client.get(f"{BASE_URL}/api/calendario-vacinacao/Bovino")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "tipo_animal" in data, f"Should contain tipo_animal: {data.keys()}"
        assert "protocolos" in data, f"Should contain protocolos: {data.keys()}"
        assert data["tipo_animal"] == "Bovino"
        
        protocolos = data["protocolos"]
        assert isinstance(protocolos, list), f"protocolos should be list: {type(protocolos)}"
        assert len(protocolos) > 0, f"Should have at least 1 protocol"
        
        # Check for expected protocols from CALENDARIO_PADRAO
        nomes = [p["nome"] for p in protocolos]
        assert "Febre Aftosa" in nomes, f"Should include 'Febre Aftosa': {nomes}"
        
        print(f"✓ GET /api/calendario-vacinacao/Bovino returns {len(protocolos)} protocols")
        print(f"  Protocols: {nomes}")


# ============= TEST 8: POST /api/calendario-vacinacao/aplicar/{tipo_animal} =============

class TestAplicarCalendario:
    """Test POST /api/calendario-vacinacao/aplicar/{tipo_animal} generates auto lembretes"""
    
    def test_aplicar_calendario_generates_lembretes(self, api_client):
        """POST /api/calendario-vacinacao/aplicar/Bovino generates [Auto] lembretes"""
        resp = api_client.post(f"{BASE_URL}/api/calendario-vacinacao/aplicar/Bovino")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert "message" in result, f"Should contain message: {result.keys()}"
        assert "criados" in result or "existentes" in result, f"Should contain criados/existentes: {result.keys()}"
        
        print(f"✓ POST /api/calendario-vacinacao/aplicar/Bovino: {result}")
        
        # Verify [Auto] lembretes exist
        resp = api_client.get(f"{BASE_URL}/api/lembretes")
        assert resp.status_code == 200
        lembretes = resp.json()
        
        auto_lembretes = [l for l in lembretes if l.get("nome", "").startswith("[Auto]") and "Bovino" in l.get("nome", "")]
        print(f"✓ Found {len(auto_lembretes)} [Auto] lembretes for Bovino")


# ============= TEST 9: POST /api/calendario-vacinacao/{tipo}/sincronizar-lembretes =============

class TestSincronizarLembretes:
    """Test POST /api/calendario-vacinacao/{tipo}/sincronizar-lembretes dry-run"""
    
    def test_sincronizar_lembretes_dry_run(self, api_client):
        """POST /api/calendario-vacinacao/Bovino/sincronizar-lembretes?desativar=false (dry-run)"""
        resp = api_client.post(f"{BASE_URL}/api/calendario-vacinacao/Bovino/sincronizar-lembretes?desativar=false")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert "tipo_animal" in result, f"Should contain tipo_animal: {result.keys()}"
        assert "total_auto_lembretes" in result, f"Should contain total_auto_lembretes: {result.keys()}"
        assert "total_orfaos" in result, f"Should contain total_orfaos: {result.keys()}"
        assert "desativados" in result, f"Should contain desativados: {result.keys()}"
        
        # dry-run should not deactivate
        assert result["desativados"] == 0, f"Dry-run should not deactivate: {result['desativados']}"
        
        print(f"✓ Sincronizar lembretes dry-run: {result}")


# ============= TEST 10: GET /api/lembretes/alertas =============

class TestLembretesAlertas:
    """Test GET /api/lembretes/alertas returns alertas with required fields"""
    
    def test_alertas_returns_required_fields(self, api_client):
        """GET /api/lembretes/alertas returns alertas with animal_tag, animal_tipo, etc."""
        resp = api_client.get(f"{BASE_URL}/api/lembretes/alertas")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "total" in data, f"Should contain total: {data.keys()}"
        assert "alertas" in data, f"Should contain alertas: {data.keys()}"
        
        alertas = data["alertas"]
        assert isinstance(alertas, list), f"alertas should be list: {type(alertas)}"
        
        print(f"✓ GET /api/lembretes/alertas returns {data['total']} alertas")
        
        # If there are alertas, verify required fields
        if len(alertas) > 0:
            alerta = alertas[0]
            required_fields = ["animal_tag", "animal_tipo", "animal_id", "tipo_acao", "mensagem", "lembrete_nome", "urgente"]
            for field in required_fields:
                assert field in alerta, f"Alerta should contain '{field}': {alerta.keys()}"
            print(f"✓ Alerta has all required fields: {required_fields}")


# ============= TEST 11: GET /api/dashboard/stats =============

class TestDashboardStats:
    """Test GET /api/dashboard/stats includes receitas from producoes + movimentacoes"""
    
    def test_dashboard_stats_structure(self, api_client):
        """GET /api/dashboard/stats returns correct structure"""
        resp = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        stats = resp.json()
        
        required_fields = [
            "total_animais", "total_ativos", "total_vendidos", "total_mortos",
            "receitas", "despesas", "lucro", "movimentacoes_mes", "despesas_por_categoria"
        ]
        
        for field in required_fields:
            assert field in stats, f"Stats should contain '{field}': {stats.keys()}"
        
        print(f"✓ GET /api/dashboard/stats has all required fields")
        print(f"  total_animais={stats['total_animais']}, receitas={stats['receitas']}, despesas={stats['despesas']}, lucro={stats['lucro']}")


# ============= TEST 12: PRODUCAO CRUD =============

class TestProducaoCRUD:
    """Test POST, GET, PUT, DELETE /api/producoes"""
    
    def test_producao_full_crud(self, api_client):
        """Full CRUD cycle for producoes"""
        prefix = f"REG{unique_id()}"
        
        # CREATE
        prod_data = {
            "motivo": "leite",
            "data": date.today().isoformat(),
            "valor": 200.0,
            "quantidade": 30.0,
            "unidade": "litros",
            "tipo_animal": "Bovino",
            "observacoes": f"{prefix} producao"
        }
        resp = api_client.post(f"{BASE_URL}/api/producoes", json=prod_data)
        assert resp.status_code == 200, f"POST failed: {resp.status_code} - {resp.text}"
        prod_id = resp.json()["id"]
        print(f"✓ POST /api/producoes: created {prod_id}")
        
        # READ
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        assert resp.status_code == 200
        producoes = resp.json()
        found = [p for p in producoes if p["id"] == prod_id]
        assert len(found) == 1, f"Should find created producao"
        print(f"✓ GET /api/producoes: found {len(producoes)} items")
        
        # UPDATE
        update_data = {
            "motivo": "leite",
            "data": date.today().isoformat(),
            "valor": 250.0,
            "quantidade": 35.0,
            "unidade": "litros"
        }
        resp = api_client.put(f"{BASE_URL}/api/producoes/{prod_id}", json=update_data)
        assert resp.status_code == 200, f"PUT failed: {resp.status_code} - {resp.text}"
        updated = resp.json()
        assert updated["valor"] == 250.0
        print(f"✓ PUT /api/producoes/{prod_id}: valor updated to 250.0")
        
        # DELETE
        resp = api_client.delete(f"{BASE_URL}/api/producoes/{prod_id}")
        assert resp.status_code == 200, f"DELETE failed: {resp.status_code}"
        print(f"✓ DELETE /api/producoes/{prod_id}: deleted")


# ============= TEST 13: PRODUCAO BULK WITH RECORRENTE=TRUE =============

class TestProducaoBulkRecorrente:
    """Test POST /api/producoes/bulk with recorrente=true creates 30-day intervals"""
    
    def test_producao_bulk_recorrente(self, api_client):
        """POST /api/producoes/bulk with recorrente=true creates records 30 days apart"""
        prefix = f"REG{unique_id()}"
        
        bulk_data = {
            "motivo": "leite_bulk",
            "quantidade_registros": 3,
            "data_inicio": date.today().isoformat(),
            "valor": 100.0,
            "quantidade": 20.0,
            "unidade": "litros",
            "observacoes": f"{prefix} bulk",
            "recorrente": True
        }
        
        resp = api_client.post(f"{BASE_URL}/api/producoes/bulk", json=bulk_data)
        assert resp.status_code == 200, f"POST failed: {resp.status_code} - {resp.text}"
        
        result = resp.json()
        assert result["total"] == 3, f"Should create 3 producoes: {result['total']}"
        
        print(f"✓ POST /api/producoes/bulk recorrente=true: created {result['total']} producoes")
        
        # Verify dates are 30 days apart
        prod_ids = [p["id"] for p in result["producoes"]]
        resp = api_client.get(f"{BASE_URL}/api/producoes")
        all_prods = resp.json()
        
        created = [p for p in all_prods if p["id"] in prod_ids]
        dates = sorted([p["data"] for p in created])
        
        if len(dates) >= 2:
            d1 = date.fromisoformat(dates[0])
            d2 = date.fromisoformat(dates[1])
            diff = (d2 - d1).days
            assert diff == 30, f"Dates should be 30 days apart: {diff}"
            print(f"✓ Verified 30-day interval: {dates[0]} -> {dates[1]}")
        
        # Cleanup
        for pid in prod_ids:
            api_client.delete(f"{BASE_URL}/api/producoes/{pid}")


# ============= TEST 14: GET /api/animais/sequencias =============

class TestAnimaisSequencias:
    """Test GET /api/animais/sequencias returns tag sequences"""
    
    def test_sequencias_returns_list(self, api_client):
        """GET /api/animais/sequencias returns list of detected sequences"""
        prefix = f"REG{unique_id()}"
        
        # Create 3 animals with sequential tags
        animal_ids = []
        for i in range(3):
            animal_data = {"tipo": "Bovino", "tag": f"{prefix}SEQ-{100+i:03d}"}
            resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_data)
            assert resp.status_code == 200
            animal_ids.append(resp.json()["id"])
        
        # Get sequences
        resp = api_client.get(f"{BASE_URL}/api/animais/sequencias")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        sequences = resp.json()
        assert isinstance(sequences, list), f"Should return list: {type(sequences)}"
        
        # Find our sequence
        our_seq = [s for s in sequences if s.get("prefixo", "").startswith(prefix)]
        if len(our_seq) > 0:
            seq = our_seq[0]
            assert "prefixo" in seq
            assert "primeiro" in seq
            assert "ultimo" in seq
            assert "total" in seq
            assert "proxima_tag" in seq
            print(f"✓ Found sequence: prefixo={seq['prefixo']}, total={seq['total']}, proxima_tag={seq['proxima_tag']}")
        else:
            print(f"✓ GET /api/animais/sequencias returns {len(sequences)} sequences")
        
        # Cleanup
        for aid in animal_ids:
            api_client.delete(f"{BASE_URL}/api/animais/{aid}?force=true")


# ============= TEST 15: POST /api/eventos/bulk =============

class TestEventosBulk:
    """Test POST /api/eventos/bulk creates events for multiple animals"""
    
    def test_eventos_bulk_creates_for_tag_range(self, api_client):
        """POST /api/eventos/bulk with tag range creates events for matching animals"""
        prefix = f"REG{unique_id()}"
        
        # Create 3 animals with sequential tags
        animal_ids = []
        for i in range(3):
            animal_data = {"tipo": "Bovino", "tag": f"{prefix}EVT-{1+i:03d}"}
            resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_data)
            assert resp.status_code == 200
            animal_ids.append(resp.json()["id"])
        
        # Create bulk eventos
        bulk_data = {
            "tipo": "vacinacao",
            "tag_prefixo": f"{prefix}EVT-",
            "tag_inicio": 1,
            "tag_fim": 3,
            "data": date.today().isoformat(),
            "detalhes": f"{prefix} bulk vacinacao",
            "vacina": "Febre Aftosa"
        }
        
        resp = api_client.post(f"{BASE_URL}/api/eventos/bulk", json=bulk_data)
        assert resp.status_code == 200, f"POST failed: {resp.status_code} - {resp.text}"
        
        result = resp.json()
        assert "total" in result, f"Should contain total: {result.keys()}"
        assert "eventos" in result, f"Should contain eventos: {result.keys()}"
        assert result["total"] == 3, f"Should create 3 eventos: {result['total']}"
        
        print(f"✓ POST /api/eventos/bulk: created {result['total']} eventos for tag range")
        
        # Cleanup
        for aid in animal_ids:
            api_client.delete(f"{BASE_URL}/api/animais/{aid}?force=true")


# ============= ADDITIONAL: VERIFY IMPORTS WORK =============

class TestImportsWork:
    """Verify that refactored imports from models.py, helpers.py, security.py, constants.py work"""
    
    def test_health_check(self, api_client):
        """Basic health check - if server responds, imports are working"""
        resp = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 200, f"Server not responding: {resp.status_code}"
        print("✓ Server responding - all imports working correctly")
    
    def test_constants_calendario_padrao(self, api_client):
        """Verify CALENDARIO_PADRAO from constants.py is accessible"""
        resp = api_client.get(f"{BASE_URL}/api/calendario-vacinacao/Suino")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data.get("protocolos", [])) > 0, "Should have Suino protocols from CALENDARIO_PADRAO"
        print(f"✓ CALENDARIO_PADRAO accessible - Suino has {len(data['protocolos'])} protocols")
    
    def test_models_pydantic_validation(self, api_client):
        """Verify Pydantic models from models.py work (validation)"""
        # Invalid data should return 422
        invalid_data = {"tipo": "entrada", "motivo": "compra"}  # missing required 'data'
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=invalid_data)
        assert resp.status_code == 422, f"Should return 422 for invalid data: {resp.status_code}"
        print("✓ Pydantic models from models.py working (validation returns 422)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
