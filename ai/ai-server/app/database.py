# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from decouple import config
from sqlalchemy.orm import Session
from fastapi import Depends
from urllib.parse import quote_plus
# 이미 선언되어 있는 내용들 유지
# engine, SessionLocal, Base ...

# 이걸 추가하세요!

# .env에서 변수 읽기
DB_USERNAME = config("DB_USERNAME")
DB_PASSWORD = quote_plus(config("DB_PASSWORD"))
DB_HOST = config("DB_HOST")
DB_NAME = config("DB_NAME")
DB_PORT = config("DB_PORT")
# SQLAlchemy DB URL 구성
DATABASE_URL = f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# DB 세팅
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()   
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()