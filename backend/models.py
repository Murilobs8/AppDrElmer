"""
Modelos Pydantic do sistema. Separados do server.py para facilitar manutenção.
Importar: `from models import Animal, Movimentacao, ...`
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone, date
import uuid


# ============= AUTH =============

class LoginInput(BaseModel):
    email: str
    password: str

class RegisterUserInput(BaseModel):
    nome: str
    email: str
    password: str
    role: str = "user"

class UpdateUserInput(BaseModel):
    nome: str
    email: str
    password: Optional[str] = None
    role: str = "user"

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    email: str
    role: str
    created_at: datetime


# ============= CATEGORIAS / OPCOES =============

class CategoriaCreate(BaseModel):
    nome: str
    cor: str = "#4A6741"

class Categoria(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cor: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OpcaoCreate(BaseModel):
    campo: str
    valor: str

class Opcao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campo: str
    valor: str

class CategoriaBulkCreate(BaseModel):
    categorias: List[dict]


# ============= ANIMAIS =============

class AnimalCreate(BaseModel):
    tipo: str
    tag: str
    sexo: Optional[str] = None
    genitora_id: Optional[str] = None
    data_nascimento: Optional[date] = None
    peso_atual: Optional[float] = None
    peso_tipo: Optional[str] = "efetivo"
    observacoes: Optional[str] = ""

class AnimalBulkCreate(BaseModel):
    tipo: str
    tag_inicial: str
    quantidade: int
    sexo: Optional[str] = None
    data_nascimento: Optional[date] = None
    peso_atual: Optional[float] = None
    peso_tipo: Optional[str] = "estimado"
    observacoes: Optional[str] = ""

class Animal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str
    tag: str
    sexo: Optional[str] = None
    genitora_id: Optional[str] = None
    data_nascimento: Optional[date] = None
    peso_atual: Optional[float] = None
    peso_tipo: Optional[str] = "efetivo"
    observacoes: Optional[str] = ""
    status: str = "ativo"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============= MOVIMENTACOES =============

class MovimentacaoCreate(BaseModel):
    tipo: Literal["entrada", "saida"]
    motivo: str
    animal_id: Optional[str] = None
    data: date
    valor: Optional[float] = None
    quantidade: float = 1
    unidade: Optional[str] = None
    tipo_animal: Optional[str] = None
    observacoes: Optional[str] = ""

class Movimentacao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: Literal["entrada", "saida", "producao"]  # producao aceita em leitura para compat
    motivo: str
    animal_id: Optional[str] = None
    data: date
    valor: Optional[float] = None
    quantidade: float = 1
    unidade: Optional[str] = None
    tipo_animal: Optional[str] = None
    observacoes: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MovimentacaoBulkCreate(BaseModel):
    tipo: Literal["entrada", "saida"]
    motivo: str
    tag_prefixo: str
    tag_inicio: int
    tag_fim: int
    data: date
    valor: Optional[float] = None
    observacoes: Optional[str] = ""

# Entrada unificada: cria animal + movimentação atomicamente
class EntradaAnimalCreate(BaseModel):
    # Animal
    tipo_animal: str
    tag: str
    sexo: Optional[str] = None
    genitora_id: Optional[str] = None
    data_nascimento: Optional[date] = None
    peso_atual: Optional[float] = None
    peso_tipo: Optional[str] = "aferido"
    # Movimentação
    motivo: str
    data: date
    valor: Optional[float] = None
    observacoes: Optional[str] = ""

class EntradaAnimalBulkCreate(BaseModel):
    tipo_animal: str
    tag_inicial: str
    quantidade: int
    sexo: Optional[str] = None
    data_nascimento: Optional[date] = None
    peso_atual: Optional[float] = None
    peso_tipo: Optional[str] = "estimado"
    motivo: str
    data: date
    valor: Optional[float] = None
    observacoes: Optional[str] = ""


# ============= PRODUCAO =============

class ProducaoCreate(BaseModel):
    motivo: str
    data: date
    valor: Optional[float] = None
    quantidade: float = 1
    unidade: Optional[str] = None
    tipo_animal: Optional[str] = None
    observacoes: Optional[str] = ""

class Producao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    motivo: str
    data: date
    valor: Optional[float] = None
    quantidade: float = 1
    unidade: Optional[str] = None
    tipo_animal: Optional[str] = None
    observacoes: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProducaoBulkCreate(BaseModel):
    motivo: str
    quantidade_registros: int
    data_inicio: date
    data_fim: Optional[date] = None
    valor: Optional[float] = None
    quantidade: float = 1
    unidade: Optional[str] = None
    tipo_animal: Optional[str] = None
    observacoes: Optional[str] = ""
    recorrente: bool = False


# ============= EVENTOS =============

class EventoCreate(BaseModel):
    tipo: str
    animal_id: str
    data: date
    detalhes: Optional[str] = ""
    peso: Optional[float] = None
    vacina: Optional[str] = None

class EventoBulkCreate(BaseModel):
    tipo: str
    tag_prefixo: str
    tag_inicio: int
    tag_fim: int
    data: date
    detalhes: Optional[str] = ""
    peso: Optional[float] = None
    vacina: Optional[str] = None

class Evento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str
    animal_id: str
    data: date
    detalhes: Optional[str] = ""
    peso: Optional[float] = None
    vacina: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============= DESPESAS =============

class DespesaCreate(BaseModel):
    categoria_id: str
    valor: float
    data: date
    descricao: Optional[str] = ""

class Despesa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    categoria_id: str
    valor: float
    data: date
    descricao: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DespesaBulkCreate(BaseModel):
    categoria_id: str
    quantidade: int
    valor: float
    data_inicio: date
    data_fim: Optional[date] = None
    descricao: Optional[str] = ""
    recorrente: bool = False


# ============= CALENDARIO VACINACAO =============

class ProtocoloVacinacao(BaseModel):
    nome: str
    tipo_acao: str = "vacinacao"
    mensagem: Optional[str] = ""
    recorrencia_dias: int
    idade_min_meses: Optional[int] = None
    idade_max_meses: Optional[int] = None
    sexo: Optional[str] = None

class CalendarioVacinacaoCreate(BaseModel):
    tipo_animal: str
    protocolos: List[ProtocoloVacinacao]

class CalendarioVacinacaoUpdate(BaseModel):
    protocolos: List[ProtocoloVacinacao]


# ============= LEMBRETES =============

class LembreteCondicao(BaseModel):
    tipo_animal: Optional[str] = None
    sexo: Optional[str] = None
    idade_min_meses: Optional[int] = None
    idade_max_meses: Optional[int] = None
    peso_min: Optional[float] = None
    peso_max: Optional[float] = None
    status: Optional[str] = "ativo"

class LembreteCreate(BaseModel):
    nome: str
    tipo_acao: str
    condicoes: LembreteCondicao = LembreteCondicao()
    mensagem: Optional[str] = ""
    recorrencia_dias: Optional[int] = None
    ativo: bool = True

class Lembrete(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    tipo_acao: str
    condicoes: dict = {}
    mensagem: Optional[str] = ""
    recorrencia_dias: Optional[int] = None
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============= DASHBOARD =============

class DashboardStats(BaseModel):
    total_animais: int
    total_ativos: int
    total_vendidos: int
    total_mortos: int
    receitas: float
    despesas: float
    lucro: float
    movimentacoes_mes: List[dict]
    despesas_por_categoria: List[dict]
