"""
Constantes do sistema: calendário padrão de vacinação por tipo de animal,
textos de documentação, etc.
"""

CALENDARIO_PADRAO = {
    "Bovino": [
        {"nome": "Febre Aftosa", "tipo_acao": "vacinacao", "mensagem": "Vacina contra febre aftosa", "recorrencia_dias": 180},
        {"nome": "Brucelose (femeas)", "tipo_acao": "vacinacao", "mensagem": "Vacina B19 - femeas 3 a 8 meses", "recorrencia_dias": 0, "idade_min_meses": 3, "idade_max_meses": 8, "sexo": "femea"},
        {"nome": "Raiva Bovina", "tipo_acao": "vacinacao", "mensagem": "Vacina antirrabica", "recorrencia_dias": 365},
        {"nome": "Clostridiose", "tipo_acao": "vacinacao", "mensagem": "Vacina polivalente contra clostridioses", "recorrencia_dias": 180},
        {"nome": "Vermifugacao", "tipo_acao": "vermifugacao", "mensagem": "Vermifugo estrategico", "recorrencia_dias": 90},
        {"nome": "Pesagem de Controle", "tipo_acao": "pesagem", "mensagem": "Pesagem de acompanhamento", "recorrencia_dias": 30},
    ],
    "Suino": [
        {"nome": "Peste Suina", "tipo_acao": "vacinacao", "mensagem": "Vacina contra peste suina classica", "recorrencia_dias": 180},
        {"nome": "Erisipela", "tipo_acao": "vacinacao", "mensagem": "Vacina contra erisipela suina", "recorrencia_dias": 180},
        {"nome": "Leptospirose", "tipo_acao": "vacinacao", "mensagem": "Vacina contra leptospirose", "recorrencia_dias": 180},
        {"nome": "Vermifugacao", "tipo_acao": "vermifugacao", "mensagem": "Vermifugo", "recorrencia_dias": 60},
    ],
    "Ovino": [
        {"nome": "Clostridiose", "tipo_acao": "vacinacao", "mensagem": "Vacina polivalente", "recorrencia_dias": 180},
        {"nome": "Raiva", "tipo_acao": "vacinacao", "mensagem": "Vacina antirrabica", "recorrencia_dias": 365},
        {"nome": "Vermifugacao", "tipo_acao": "vermifugacao", "mensagem": "Vermifugo estrategico", "recorrencia_dias": 60},
    ],
    "Caprino": [
        {"nome": "Clostridiose", "tipo_acao": "vacinacao", "mensagem": "Vacina polivalente", "recorrencia_dias": 180},
        {"nome": "Raiva", "tipo_acao": "vacinacao", "mensagem": "Vacina antirrabica", "recorrencia_dias": 365},
        {"nome": "Vermifugacao", "tipo_acao": "vermifugacao", "mensagem": "Vermifugo - metodo Famacha", "recorrencia_dias": 45},
    ],
    "Equino": [
        {"nome": "Influenza Equina", "tipo_acao": "vacinacao", "mensagem": "Vacina contra influenza", "recorrencia_dias": 180},
        {"nome": "Encefalomielite", "tipo_acao": "vacinacao", "mensagem": "Vacina contra encefalomielite", "recorrencia_dias": 365},
        {"nome": "Raiva", "tipo_acao": "vacinacao", "mensagem": "Vacina antirrabica", "recorrencia_dias": 365},
        {"nome": "Tetano", "tipo_acao": "vacinacao", "mensagem": "Vacina antitetanica", "recorrencia_dias": 365},
        {"nome": "Vermifugacao", "tipo_acao": "vermifugacao", "mensagem": "Vermifugo", "recorrencia_dias": 60},
    ],
    "Aves": [
        {"nome": "Newcastle", "tipo_acao": "vacinacao", "mensagem": "Vacina contra doenca de Newcastle", "recorrencia_dias": 90},
        {"nome": "Gumboro", "tipo_acao": "vacinacao", "mensagem": "Vacina contra Gumboro", "recorrencia_dias": 0, "idade_min_meses": 0, "idade_max_meses": 3},
    ],
}
