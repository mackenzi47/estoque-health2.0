from sqlalchemy import Column, BigInteger, String, Boolean, Numeric
from app.core.database import Base

class WMSPosicao(Base):
    __tablename__ = "wms_posicoes"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    local = Column(String, unique=True, nullable=False, index=True)
    ativo = Column(Boolean, default=True, nullable=False)
    estoque = Column(Numeric(18, 3), default=0, nullable=False)
