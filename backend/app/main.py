from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Estoque Health API")

# Configuração de CORS para permitir que o Frontend acesse os dados
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, substitua pela URL da Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "online", "message": "API do Dashboard"}

@app.get("/api/v1/dashboard/summary")
async def get_summary():
    # Dados reais simulados que alimentam os cards e gráficos
    return {
        "cards": {
            "ativas": "4.078",
            "contadas": "3.210",
            "pendentes": "868",
            "avanco": "78.7%",
            "acuracidade": "99.96%",
            "divergencias": "22"
        },
        "grafico_avanco": [
            {"name": "10/05", "posicoes": 260, "media": 360},
            {"name": "11/05", "posicoes": 350, "media": 340},
            {"name": "12/05", "posicoes": 280, "media": 370},
            {"name": "13/05", "posicoes": 330, "media": 390},
            {"name": "14/05", "posicoes": 400, "media": 410},
            {"name": "15/05", "posicoes": 320, "media": 380},
        ],
        "tabela_pendentes": [
            {"pos": "A12-05-03", "regiao": "Setor A", "rua": "Rua 12", "produto": "Embalagem X", "status": "Pendente"},
            {"pos": "B05-07-02", "regiao": "Setor B", "rua": "Rua 05", "produto": "Item Y", "status": "Pendente"},
            {"pos": "C03-02-01", "regiao": "Setor C", "rua": "Rua 03", "produto": "Produto Z", "status": "Pendente"},
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)