from pydantic import BaseModel
from typing import Optional

class PosicaoBase(BaseModel):
    local: str
    ativo: bool = True
    estoque: float = 0

class PosicaoCreate(PosicaoBase):
    pass

class PosicaoResponse(PosicaoBase):
    id: int

    class Config:
        from_attributes = True  # pydantic v2 (permite retornar objeto do SQLAlchemy)
