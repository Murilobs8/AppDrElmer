"""
Funções utilitárias compartilhadas. Importado pelos routers e server.py.
"""
from datetime import datetime, date


def serialize_doc(doc):
    """Converte strings ISO em datetime/date ao ler do MongoDB."""
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    if isinstance(doc.get('data'), str):
        doc['data'] = date.fromisoformat(doc['data'])
    if isinstance(doc.get('data_nascimento'), str):
        doc['data_nascimento'] = date.fromisoformat(doc['data_nascimento'])
    return doc


def prepare_for_db(doc):
    """Prepara um documento para persistência, convertendo datetime/date em ISO strings."""
    result = doc.copy()
    if 'created_at' in result and isinstance(result['created_at'], datetime):
        result['created_at'] = result['created_at'].isoformat()
    if 'data' in result and isinstance(result['data'], date):
        result['data'] = result['data'].isoformat()
    if 'data_nascimento' in result and result['data_nascimento'] and isinstance(result['data_nascimento'], date):
        result['data_nascimento'] = result['data_nascimento'].isoformat()
    return result
