from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./estoque.db"
# Se for Postgres depois:
# DATABASE_URL = "postgresql+psycopg2://estoque:estoque123@localhost:5432/estoque_db"

engine = create_engine(
    DATABASE_URL,
    echo=True,  # mostra SQL no terminal
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
