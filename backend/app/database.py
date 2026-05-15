from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

# NullPool disables SQLAlchemy-side connection pooling.
# Supabase recommends this when using their pooler so that
# connections are opened/closed directly via psycopg2.
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
