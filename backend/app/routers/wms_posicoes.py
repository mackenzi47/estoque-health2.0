from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.wms_posicao import WMSPosicao
from app.schemas.wms_posicoes import PosicaoCreate, PosicaoResponse

router = APIRouter()

@router.get("/posicoes", response_model=List[PosicaoResponse])
def listar_posicoes(db: Session = Depends(get_db)):
    return db.query(WMSPosicao).order_by(WMSPosicao.local.asc()).all()

@router.get("/posicoes/{local}", response_model=PosicaoResponse)
def buscar_posicao(local: str, db: Session = Depends(get_db)):
    pos = db.query(WMSPosicao).filter(WMSPosicao.local == local).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    return pos

@router.post("/posicoes", response_model=PosicaoResponse)
def criar_posicao(payload: PosicaoCreate, db: Session = Depends(get_db)):
    existe = db.query(WMSPosicao).filter(WMSPosicao.local == payload.local).first()
    if existe:
        raise HTTPException(status_code=409, detail="Local já cadastrado")

    pos = WMSPosicao(local=payload.local, ativo=payload.ativo, estoque=payload.estoque)
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return pos
