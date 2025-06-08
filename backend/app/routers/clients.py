from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, database
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(
    prefix="/clients",
    tags=["clients"]
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ClientResponse(BaseModel):
    id: int
    company_name: str
    contact_name: str
    contact_position: Optional[str]
    phone: Optional[str]
    email: str
    country: Optional[str]
    sector_field: Optional[str]
    address: Optional[str]
    payment_terms: Optional[str]
    invoice_terms: Optional[str]
    currency: str
    is_zone_franche: str

    class Config:
         from_attributes = True

class ClientCreate(BaseModel):
    company_name: str
    contact_name: str
    contact_position: Optional[str] = None
    phone: Optional[str] = None
    email: str
    country: Optional[str] = None
    sector_field: Optional[str] = None
    address: Optional[str] = None
    payment_terms: Optional[str] = None
    invoice_terms: Optional[str] = None
    currency: str
    is_zone_franche: str

class ClientResponse(ClientCreate):
    id: int

    class Config:
        from_attributes = True  



@router.get("/", response_model=List[ClientResponse])
def get_all_clients(db: Session = Depends(get_db)):
    return db.query(models.Client).all()

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.post("/", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    db_client = models.Client(**client.dict())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}



@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, updated_client: ClientCreate, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for field, value in updated_client.dict().items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client
