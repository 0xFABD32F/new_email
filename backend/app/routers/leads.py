from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from .. import models, database
from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional, List

router = APIRouter(
    prefix="/leads",
    tags=["leads"]
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Modèles Pydantic pour les leads
class LeadBase(BaseModel):
    reference_project: Optional[str] = None
    company_name: str
    country: Optional[str] = None
    contact_name: str
    contact_position: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    sector_field: Optional[str] = None
    project: Optional[str] = None
    current_step: Optional[str] = None
    current_step_date: Optional[date] = None
    status: Optional[str] = "Nouveau"
    client_id: Optional[int] = None  

class LeadCreate(LeadBase):
    pass

class LeadUpdate(LeadBase):
    pass

# Modèle Pydantic pour les opportunités
class OpportunityBase(BaseModel):
    reference_project: Optional[str]
    company_name: str
    country: Optional[str]
    contact_name: str
    contact_position: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    sector_field: Optional[str]
    project: Optional[str]
    current_step: str
    current_step_date: date
    devis_number: str
    montant_devis: float
    client_deadline: Optional[str]
    lead_id: Optional[int]
    
    class Config:
        orm_mode = True

class ConvertLeadRequest(BaseModel):
    devis_number: str
    montant_devis: float
    client_deadline: Optional[str] = None

# Routes
@router.post("/")
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    new_lead = models.Lead(**lead.dict())
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead

@router.get("/")
def list_leads(
    include_converted: bool = Query(False, description="Inclure les leads convertis en opportunités"),
    db: Session = Depends(get_db)
):
    """
    Liste les leads actifs (par défaut exclut les leads convertis en opportunités)
    """
    if include_converted:
        # Récupérer tous les leads
        return db.query(models.Lead).all()
    else:
        # Exclure les leads convertis
        return db.query(models.Lead).filter(
            models.Lead.status.notin_([
                "Converti", 
                "CONVERTI",
                "converti"
            ])
        ).all()

@router.get("/converted")
def list_converted_leads(db: Session = Depends(get_db)):
    """
    Liste uniquement les leads convertis en opportunités
    """
    return db.query(models.Lead).filter(
        models.Lead.status.in_([
            "Converti", 
            "CONVERTI",
            "converti"
        ])
    ).all()

@router.get("/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trouvé")
    return lead

@router.put("/{lead_id}")
def update_lead(lead_id: int, updated_lead: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trouvé")
    
    for key, value in updated_lead.dict().items():
        setattr(lead, key, value)

    db.commit()
    db.refresh(lead)
    return lead

@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead non trouvé")
    
    db.delete(lead)
    db.commit()
    return {"message": "Lead supprimé avec succès"}

#convertir un lead en opportunité
@router.post("/convert/{lead_id}", response_model=OpportunityBase)
def convert_lead(
    lead_id: int,
    convert_data: ConvertLeadRequest,
    db: Session = Depends(get_db)
):
    try:
        lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead non trouvé")

        # Création de l'opportunité avec les champs validés
        opportunity_data = {
            "reference_project": lead.reference_project,
            "company_name": lead.company_name,
            "country": lead.country,
            "contact_name": lead.contact_name,
            "contact_position": lead.contact_position,
            "phone": lead.phone,
            "email": lead.email,
            "sector_field": lead.sector_field,
            "project": lead.project,  
            "current_step": "Demande devis",
            "current_step_date": datetime.today().date(),
            "devis_number": convert_data.devis_number,
            "montant_devis": convert_data.montant_devis,
            "client_deadline": convert_data.client_deadline,
            "lead_id": lead_id,
        }
        
        # Créer l'opportunité avec tous les champs
        opportunity = models.Opportunity(**opportunity_data)
        
        db.add(opportunity)
        lead.status = "Converti"
        db.commit()
        db.refresh(opportunity)
        return opportunity

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur inattendue: {str(e)}")