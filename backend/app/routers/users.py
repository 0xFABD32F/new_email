from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, database, security

router = APIRouter(
    prefix="/users",    
    tags=["users"]     
)
