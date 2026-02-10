from fastapi import FastAPI
from app.routers import wms_posicoes

app = FastAPI(title="Estoque Health")

app.include_router(wms_posicoes.router, prefix="/wms/posicoes", tags=["WMS - Posições"])
