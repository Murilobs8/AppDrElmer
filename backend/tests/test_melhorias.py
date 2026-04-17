"""
Test suite for the 5 improvements in AppDrElmer - Sistema de Gestão Rural

MELHORIA 1a: DELETE /api/animais/{id} - cascade delete with dependencies
MELHORIA 1b: DELETE /api/categorias/{id} - cascade delete with expenses
MELHORIA 2: GET /api/animais/{id}/filhos - list animal offspring
MELHORIA 2b: GET /api/animais/{id}/historico - includes filhos, total_filhos, genitora
MELHORIA 5: POST /api/calendario-vacinacao/{tipo}/sincronizar-lembretes - sync orphan reminders
"""

import pytest
import requests
import os
import uuid
from datetime import date, timedelta
import time

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


# ============= MELHORIA 1b: DELETE /api/categorias/{id} with force =============

class TestDeleteCategoriaWithDependencies:
    """Tests for DELETE /api/categorias/{id} with cascade delete"""
    
    def test_delete_categoria_without_force_returns_409(self, api_client):
        """DELETE categoria with despesas without force should return 409"""
        prefix = f"T{unique_id()}"
        
        # Create category
        cat_data = {"nome": f"{prefix}_Alimentacao", "cor": "#FF5733"}
        resp = api_client.post(f"{BASE_URL}/api/categorias", json=cat_data)
        assert resp.status_code == 200, f"Failed to create categoria: {resp.text}"
        categoria = resp.json()
        cat_id = categoria["id"]
        print(f"✓ Created categoria: {cat_id}")
        
        # Create expense linked to category
        desp_data = {
            "categoria_id": cat_id,
            "valor": 150.50,
            "data": date.today().isoformat(),
            "descricao": f"{prefix} despesa teste"
        }
        resp = api_client.post(f"{BASE_URL}/api/despesas", json=desp_data)
        assert resp.status_code == 200, f"Failed to create despesa: {resp.text}"
        despesa = resp.json()
        desp_id = despesa["id"]
        print(f"✓ Created despesa: {desp_id} linked to categoria")
        
        # Try to delete without force - should return 409
        resp = api_client.delete(f"{BASE_URL}/api/categorias/{cat_id}")
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}: {resp.text}"
        
        detail = resp.json().get("detail", {})
        assert "despesas" in detail, f"Response should contain 'despesas' count: {detail}"
        assert detail["despesas"] >= 1, f"Should have at least 1 despesa: {detail}"
        print(f"✓ DELETE without force returned 409 with despesas count: {detail['despesas']}")
        
        # Cleanup with force
        api_client.delete(f"{BASE_URL}/api/categorias/{cat_id}?force=true")
    
    def test_delete_categoria_with_force_cascades(self, api_client):
        """DELETE categoria with force=true should delete category and linked expenses"""
        prefix = f"T{unique_id()}"
        
        # Create category
        cat_data = {"nome": f"{prefix}_Racao", "cor": "#00FF00"}
        resp = api_client.post(f"{BASE_URL}/api/categorias", json=cat_data)
        assert resp.status_code == 200, f"Failed to create categoria: {resp.text}"
        cat_id = resp.json()["id"]
        
        # Create 2 expenses
        for i in range(2):
            desp_data = {
                "categoria_id": cat_id,
                "valor": 100.0 + i,
                "data": date.today().isoformat(),
                "descricao": f"{prefix} despesa {i}"
            }
            resp = api_client.post(f"{BASE_URL}/api/despesas", json=desp_data)
            assert resp.status_code == 200
        
        # Delete with force
        resp = api_client.delete(f"{BASE_URL}/api/categorias/{cat_id}?force=true")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result.get("cascata") == True, f"Should indicate cascade: {result}"
        assert result.get("despesas_removidas", 0) >= 2, f"Should have removed 2 despesas: {result}"
        print(f"✓ DELETE with force=true succeeded, despesas_removidas: {result.get('despesas_removidas')}")
        
        # Verify categoria is gone
        resp = api_client.get(f"{BASE_URL}/api/categorias")
        cat_ids = [c["id"] for c in resp.json()]
        assert cat_id not in cat_ids, "Categoria should be deleted"
        print("✓ Verified categoria was deleted")
    
    def test_delete_categoria_without_dependencies_succeeds(self, api_client):
        """DELETE categoria without dependencies should succeed without force"""
        prefix = f"T{unique_id()}"
        
        cat_data = {"nome": f"{prefix}_SemDespesas", "cor": "#0000FF"}
        resp = api_client.post(f"{BASE_URL}/api/categorias", json=cat_data)
        assert resp.status_code == 200
        cat_id = resp.json()["id"]
        
        # Delete without force should succeed
        resp = api_client.delete(f"{BASE_URL}/api/categorias/{cat_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ DELETE categoria without dependencies succeeds without force")
    
    def test_delete_categoria_not_found(self, api_client):
        """DELETE non-existent categoria should return 404"""
        fake_id = str(uuid.uuid4())
        resp = api_client.delete(f"{BASE_URL}/api/categorias/{fake_id}")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("✓ DELETE non-existent categoria returns 404")


# ============= MELHORIA 1a: DELETE /api/animais/{id} with dependencies =============

class TestDeleteAnimalWithDependencies:
    """Tests for DELETE /api/animais/{id} with cascade delete"""
    
    def test_delete_animal_without_force_returns_409(self, api_client):
        """DELETE animal with dependencies without force should return 409"""
        prefix = f"T{unique_id()}"
        
        # Create animal A (genitora/mother)
        animal_a_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_MAE001",
            "sexo": "femea",
            "data_nascimento": (date.today() - timedelta(days=730)).isoformat(),
            "peso_atual": 450.0
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_a_data)
        assert resp.status_code == 200, f"Failed to create animal A: {resp.text}"
        animal_a_id = resp.json()["id"]
        print(f"✓ Created animal A (genitora): {animal_a_id}")
        
        # Create animal B (filho) with genitora_id = A
        animal_b_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_FILHO001",
            "sexo": "macho",
            "genitora_id": animal_a_id,
            "data_nascimento": (date.today() - timedelta(days=180)).isoformat()
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_b_data)
        assert resp.status_code == 200, f"Failed to create animal B: {resp.text}"
        animal_b_id = resp.json()["id"]
        print(f"✓ Created animal B (filho): {animal_b_id}")
        
        # Create evento for animal A
        evento_data = {
            "tipo": "vacinacao",
            "animal_id": animal_a_id,
            "data": date.today().isoformat(),
            "vacina": "Febre Aftosa"
        }
        resp = api_client.post(f"{BASE_URL}/api/eventos", json=evento_data)
        assert resp.status_code == 200, f"Failed to create evento: {resp.text}"
        evento_id = resp.json()["id"]
        print(f"✓ Created evento: {evento_id}")
        
        # Create movimentacao for animal A
        mov_data = {
            "tipo": "entrada",
            "motivo": "compra",
            "animal_id": animal_a_id,
            "data": (date.today() - timedelta(days=365)).isoformat(),
            "valor": 2500.0,
            "quantidade": 1
        }
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 200, f"Failed to create movimentacao: {resp.text}"
        mov_id = resp.json()["id"]
        print(f"✓ Created movimentacao: {mov_id}")
        
        # Try to delete animal A without force - should return 409
        resp = api_client.delete(f"{BASE_URL}/api/animais/{animal_a_id}")
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}: {resp.text}"
        
        detail = resp.json().get("detail", {})
        assert "movimentacoes" in detail, f"Response should contain 'movimentacoes': {detail}"
        assert "eventos" in detail, f"Response should contain 'eventos': {detail}"
        assert "filhos" in detail, f"Response should contain 'filhos': {detail}"
        
        assert detail["movimentacoes"] >= 1, f"Should have at least 1 movimentacao: {detail}"
        assert detail["eventos"] >= 1, f"Should have at least 1 evento: {detail}"
        assert detail["filhos"] >= 1, f"Should have at least 1 filho: {detail}"
        
        print(f"✓ DELETE without force returned 409 with dependencies: mov={detail['movimentacoes']}, evt={detail['eventos']}, filhos={detail['filhos']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{animal_a_id}?force=true")
        api_client.delete(f"{BASE_URL}/api/animais/{animal_b_id}?force=true")
    
    def test_delete_animal_with_force_cascades(self, api_client):
        """DELETE animal with force=true should cascade delete and unlink filhos"""
        prefix = f"T{unique_id()}"
        
        # Create animal A (genitora)
        animal_a_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_MAE002",
            "sexo": "femea"
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_a_data)
        assert resp.status_code == 200
        animal_a_id = resp.json()["id"]
        
        # Create animal B (filho)
        animal_b_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_FILHO002",
            "genitora_id": animal_a_id
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_b_data)
        assert resp.status_code == 200
        animal_b_id = resp.json()["id"]
        
        # Create evento
        evento_data = {
            "tipo": "pesagem",
            "animal_id": animal_a_id,
            "data": date.today().isoformat(),
            "peso": 500.0
        }
        resp = api_client.post(f"{BASE_URL}/api/eventos", json=evento_data)
        assert resp.status_code == 200
        evento_id = resp.json()["id"]
        
        # Create movimentacao
        mov_data = {
            "tipo": "entrada",
            "motivo": "compra",
            "animal_id": animal_a_id,
            "data": date.today().isoformat(),
            "valor": 3000.0,
            "quantidade": 1
        }
        resp = api_client.post(f"{BASE_URL}/api/movimentacoes", json=mov_data)
        assert resp.status_code == 200
        mov_id = resp.json()["id"]
        
        # Delete animal A with force
        resp = api_client.delete(f"{BASE_URL}/api/animais/{animal_a_id}?force=true")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result.get("cascata") == True, f"Should indicate cascade: {result}"
        assert result.get("movimentacoes_removidas", 0) >= 1
        assert result.get("eventos_removidos", 0) >= 1
        assert result.get("filhos_desvinculados", 0) >= 1
        print(f"✓ DELETE with force=true: mov_rem={result.get('movimentacoes_removidas')}, evt_rem={result.get('eventos_removidos')}, filhos_desv={result.get('filhos_desvinculados')}")
        
        # Verify animal A is gone
        resp = api_client.get(f"{BASE_URL}/api/animais/{animal_a_id}")
        assert resp.status_code == 404, "Animal A should be deleted"
        print("✓ Verified animal A was deleted")
        
        # Verify animal B still exists but genitora_id is null
        resp = api_client.get(f"{BASE_URL}/api/animais/{animal_b_id}")
        assert resp.status_code == 200, "Animal B should still exist"
        animal_b = resp.json()
        assert animal_b.get("genitora_id") is None, f"Animal B genitora_id should be null: {animal_b.get('genitora_id')}"
        print("✓ Verified animal B exists with genitora_id=null")
        
        # Verify evento is gone
        resp = api_client.get(f"{BASE_URL}/api/eventos")
        evento_ids = [e["id"] for e in resp.json()]
        assert evento_id not in evento_ids, "Evento should be deleted"
        print("✓ Verified evento was deleted")
        
        # Verify movimentacao is gone
        resp = api_client.get(f"{BASE_URL}/api/movimentacoes")
        mov_ids = [m["id"] for m in resp.json()]
        assert mov_id not in mov_ids, "Movimentacao should be deleted"
        print("✓ Verified movimentacao was deleted")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{animal_b_id}?force=true")
    
    def test_delete_animal_without_dependencies_succeeds(self, api_client):
        """DELETE animal without dependencies should succeed without force"""
        prefix = f"T{unique_id()}"
        
        animal_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_SOLO001",
            "sexo": "macho"
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_data)
        assert resp.status_code == 200
        animal_id = resp.json()["id"]
        
        # Delete without force should succeed
        resp = api_client.delete(f"{BASE_URL}/api/animais/{animal_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("✓ DELETE animal without dependencies succeeds without force")
    
    def test_delete_animal_not_found(self, api_client):
        """DELETE non-existent animal should return 404"""
        fake_id = str(uuid.uuid4())
        resp = api_client.delete(f"{BASE_URL}/api/animais/{fake_id}")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("✓ DELETE non-existent animal returns 404")


# ============= MELHORIA 2: GET /api/animais/{id}/filhos =============

class TestListarFilhosAnimal:
    """Tests for GET /api/animais/{id}/filhos"""
    
    def test_get_filhos_returns_offspring_list(self, api_client):
        """GET /api/animais/{id}/filhos should return list of offspring"""
        prefix = f"T{unique_id()}"
        
        # Create genitora
        genitora_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_MAE003",
            "sexo": "femea"
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=genitora_data)
        assert resp.status_code == 200
        genitora_id = resp.json()["id"]
        
        # Create 2 filhos
        filho_ids = []
        for i in range(2):
            filho_data = {
                "tipo": "Bovino",
                "tag": f"{prefix}_FILHO00{i+3}",
                "genitora_id": genitora_id
            }
            resp = api_client.post(f"{BASE_URL}/api/animais", json=filho_data)
            assert resp.status_code == 200
            filho_ids.append(resp.json()["id"])
        
        # Get filhos
        resp = api_client.get(f"{BASE_URL}/api/animais/{genitora_id}/filhos")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        filhos = resp.json()
        assert isinstance(filhos, list), f"Should return a list: {filhos}"
        assert len(filhos) == 2, f"Should have 2 filhos: {len(filhos)}"
        
        returned_ids = [f["id"] for f in filhos]
        for fid in filho_ids:
            assert fid in returned_ids, f"Filho {fid} should be in list"
        
        print(f"✓ GET /api/animais/{genitora_id}/filhos returned {len(filhos)} filhos")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{genitora_id}?force=true")
        for fid in filho_ids:
            api_client.delete(f"{BASE_URL}/api/animais/{fid}?force=true")
    
    def test_get_filhos_nonexistent_animal_returns_404(self, api_client):
        """GET /api/animais/{id}/filhos for non-existent animal should return 404"""
        fake_id = str(uuid.uuid4())
        resp = api_client.get(f"{BASE_URL}/api/animais/{fake_id}/filhos")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("✓ GET /api/animais/{fake_id}/filhos returns 404 for non-existent animal")
    
    def test_get_filhos_empty_list_when_no_offspring(self, api_client):
        """GET /api/animais/{id}/filhos should return empty list when no offspring"""
        prefix = f"T{unique_id()}"
        
        animal_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_SEMFILHOS",
            "sexo": "femea"
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=animal_data)
        assert resp.status_code == 200
        animal_id = resp.json()["id"]
        
        resp = api_client.get(f"{BASE_URL}/api/animais/{animal_id}/filhos")
        assert resp.status_code == 200
        filhos = resp.json()
        assert filhos == [], f"Should return empty list: {filhos}"
        print("✓ GET /api/animais/{id}/filhos returns empty list when no offspring")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{animal_id}")


# ============= MELHORIA 2b: GET /api/animais/{id}/historico with filhos/genitora =============

class TestHistoricoAnimalWithFilhosGenitora:
    """Tests for GET /api/animais/{id}/historico including filhos, total_filhos, genitora"""
    
    def test_historico_includes_filhos_and_total_filhos(self, api_client):
        """GET /api/animais/{id}/historico should include filhos and total_filhos"""
        prefix = f"T{unique_id()}"
        
        # Create genitora
        genitora_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_MAE004",
            "sexo": "femea"
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=genitora_data)
        assert resp.status_code == 200
        genitora_id = resp.json()["id"]
        
        # Create filho
        filho_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_FILHO004",
            "genitora_id": genitora_id
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=filho_data)
        assert resp.status_code == 200
        filho_id = resp.json()["id"]
        
        # Get historico of genitora
        resp = api_client.get(f"{BASE_URL}/api/animais/{genitora_id}/historico")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        historico = resp.json()
        
        # Check filhos field
        assert "filhos" in historico, f"Response should contain 'filhos': {historico.keys()}"
        assert isinstance(historico["filhos"], list), f"filhos should be a list"
        assert len(historico["filhos"]) >= 1, f"Should have at least 1 filho"
        
        # Check total_filhos field
        assert "total_filhos" in historico, f"Response should contain 'total_filhos': {historico.keys()}"
        assert historico["total_filhos"] >= 1, f"total_filhos should be >= 1"
        
        # Check genitora field (genitora has no mother)
        assert "genitora" in historico, f"Response should contain 'genitora': {historico.keys()}"
        assert historico["genitora"] is None, f"Genitora should be null for this animal"
        
        print(f"✓ Historico includes filhos={len(historico['filhos'])}, total_filhos={historico['total_filhos']}, genitora=None")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{genitora_id}?force=true")
        api_client.delete(f"{BASE_URL}/api/animais/{filho_id}?force=true")
    
    def test_historico_includes_genitora_when_exists(self, api_client):
        """GET /api/animais/{id}/historico should include genitora when animal has mother"""
        prefix = f"T{unique_id()}"
        
        # Create genitora
        genitora_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_MAE005",
            "sexo": "femea"
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=genitora_data)
        assert resp.status_code == 200
        genitora_id = resp.json()["id"]
        
        # Create filho with genitora_id
        filho_data = {
            "tipo": "Bovino",
            "tag": f"{prefix}_FILHO005",
            "genitora_id": genitora_id
        }
        resp = api_client.post(f"{BASE_URL}/api/animais", json=filho_data)
        assert resp.status_code == 200
        filho_id = resp.json()["id"]
        
        # Get historico of filho
        resp = api_client.get(f"{BASE_URL}/api/animais/{filho_id}/historico")
        assert resp.status_code == 200
        
        historico = resp.json()
        
        # Check genitora field is populated
        assert "genitora" in historico, f"Response should contain 'genitora'"
        assert historico["genitora"] is not None, f"Genitora should not be null"
        assert historico["genitora"]["id"] == genitora_id, f"Genitora ID should match"
        
        print(f"✓ Historico of filho includes genitora={historico['genitora']['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/animais/{genitora_id}?force=true")
        api_client.delete(f"{BASE_URL}/api/animais/{filho_id}?force=true")


# ============= MELHORIA 5: POST /api/calendario-vacinacao/{tipo}/sincronizar-lembretes =============

class TestSincronizarLembretesCalendario:
    """Tests for POST /api/calendario-vacinacao/{tipo}/sincronizar-lembretes"""
    
    def test_sincronizar_lembretes_dry_run(self, api_client):
        """POST sincronizar-lembretes with desativar=false should list orphans without deactivating"""
        prefix = f"T{unique_id()}"
        tipo_animal = "Bovino"
        
        # Create custom calendario with 2 protocols
        protocolos = [
            {
                "nome": f"{prefix}_Vacina1",
                "tipo_acao": "vacinacao",
                "mensagem": "Vacina teste 1",
                "recorrencia_dias": 180
            },
            {
                "nome": f"{prefix}_Vacina2",
                "tipo_acao": "vacinacao",
                "mensagem": "Vacina teste 2",
                "recorrencia_dias": 365
            }
        ]
        
        resp = api_client.put(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}", json={"protocolos": protocolos})
        assert resp.status_code == 200, f"Failed to save calendario: {resp.text}"
        print(f"✓ Saved custom calendario with 2 protocols")
        
        # Apply calendario to generate [Auto] lembretes
        resp = api_client.post(f"{BASE_URL}/api/calendario-vacinacao/aplicar/{tipo_animal}")
        assert resp.status_code == 200, f"Failed to apply calendario: {resp.text}"
        result = resp.json()
        print(f"✓ Applied calendario: criados={result.get('criados')}")
        
        # Update calendario to remove one protocol (Vacina2)
        protocolos_updated = [
            {
                "nome": f"{prefix}_Vacina1",
                "tipo_acao": "vacinacao",
                "mensagem": "Vacina teste 1",
                "recorrencia_dias": 180
            }
        ]
        resp = api_client.put(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}", json={"protocolos": protocolos_updated})
        assert resp.status_code == 200
        print(f"✓ Updated calendario with only 1 protocol (removed Vacina2)")
        
        # Call sincronizar-lembretes with desativar=false (dry-run)
        resp = api_client.post(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}/sincronizar-lembretes?desativar=false")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert "total_orfaos" in result, f"Response should contain 'total_orfaos': {result}"
        assert "orfaos" in result, f"Response should contain 'orfaos': {result}"
        assert "desativados" in result, f"Response should contain 'desativados': {result}"
        
        # Should have at least 1 orphan (Vacina2 was removed)
        assert result["total_orfaos"] >= 1, f"Should have at least 1 orphan: {result}"
        assert result["desativados"] == 0, f"Dry-run should not deactivate: {result['desativados']}"
        
        print(f"✓ Dry-run: total_orfaos={result['total_orfaos']}, desativados={result['desativados']}")
        
        # Verify lembretes are still active
        resp = api_client.get(f"{BASE_URL}/api/lembretes")
        lembretes = resp.json()
        vacina2_lembretes = [l for l in lembretes if f"{prefix}_Vacina2" in l.get("nome", "")]
        for l in vacina2_lembretes:
            assert l.get("ativo") == True, f"Lembrete should still be active after dry-run"
        print("✓ Verified lembretes are still active after dry-run")
        
        # Cleanup
        for l in lembretes:
            if prefix in l.get("nome", ""):
                api_client.delete(f"{BASE_URL}/api/lembretes/{l['id']}")
        api_client.delete(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}")
    
    def test_sincronizar_lembretes_deactivate(self, api_client):
        """POST sincronizar-lembretes with desativar=true should deactivate orphans"""
        prefix = f"T{unique_id()}"
        tipo_animal = "Bovino"
        
        # Create custom calendario with 2 protocols
        protocolos = [
            {
                "nome": f"{prefix}_VacA",
                "tipo_acao": "vacinacao",
                "mensagem": "Vacina A",
                "recorrencia_dias": 180
            },
            {
                "nome": f"{prefix}_VacB",
                "tipo_acao": "vacinacao",
                "mensagem": "Vacina B",
                "recorrencia_dias": 365
            }
        ]
        
        resp = api_client.put(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}", json={"protocolos": protocolos})
        assert resp.status_code == 200
        
        # Apply calendario
        resp = api_client.post(f"{BASE_URL}/api/calendario-vacinacao/aplicar/{tipo_animal}")
        assert resp.status_code == 200
        
        # Update calendario to remove VacB
        protocolos_updated = [
            {
                "nome": f"{prefix}_VacA",
                "tipo_acao": "vacinacao",
                "mensagem": "Vacina A",
                "recorrencia_dias": 180
            }
        ]
        resp = api_client.put(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}", json={"protocolos": protocolos_updated})
        assert resp.status_code == 200
        
        # Call sincronizar-lembretes with desativar=true
        resp = api_client.post(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}/sincronizar-lembretes?desativar=true")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        result = resp.json()
        assert result["total_orfaos"] >= 1, f"Should have at least 1 orphan: {result}"
        assert result["desativados"] >= 1, f"Should have deactivated at least 1: {result['desativados']}"
        
        print(f"✓ Deactivate: total_orfaos={result['total_orfaos']}, desativados={result['desativados']}")
        
        # Verify lembretes are now inactive
        resp = api_client.get(f"{BASE_URL}/api/lembretes")
        lembretes = resp.json()
        vacb_lembretes = [l for l in lembretes if f"{prefix}_VacB" in l.get("nome", "")]
        for l in vacb_lembretes:
            assert l.get("ativo") == False, f"Lembrete should be inactive: {l}"
        print("✓ Verified orphan lembretes are now inactive (ativo=false)")
        
        # Cleanup
        for l in lembretes:
            if prefix in l.get("nome", ""):
                api_client.delete(f"{BASE_URL}/api/lembretes/{l['id']}")
        api_client.delete(f"{BASE_URL}/api/calendario-vacinacao/{tipo_animal}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
