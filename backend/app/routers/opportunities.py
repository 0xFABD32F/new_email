from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import date, datetime
from sqlalchemy.orm import Session
from .. import models, database
from pydantic import BaseModel
from typing import List, Optional
import traceback

router = APIRouter(
    prefix="/opportunities",
    tags=["opportunities"]
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for validation
class OpportunityBase(BaseModel):
    id: int
    reference_project: Optional[str] = None
    company_name: str
    country: Optional[str] = None
    contact_name: str
    contact_position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    sector_field: Optional[str] = None
    project: Optional[str] = None 
    current_step: str
    current_step_date: date
    devis_number: str
    montant_devis: float
    client_deadline: Optional[str] = None
    lead_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class OpportunityCreate(BaseModel):
    reference_project: Optional[str] = None
    company_name: str
    country: Optional[str] = None
    contact_name: str
    contact_position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    sector_field: Optional[str] = None
    project: Optional[str] = None
    current_step: str
    current_step_date: date
    devis_number: str
    montant_devis: float
    client_deadline: Optional[str] = None
    lead_id: Optional[int] = None

class OpportunityUpdate(BaseModel):
    reference_project: Optional[str] = None
    company_name: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    sector_field: Optional[str] = None
    project: Optional[str] = None
    current_step: Optional[str] = None
    current_step_date: Optional[date] = None
    devis_number: Optional[str] = None
    montant_devis: Optional[float] = None
    client_deadline: Optional[str] = None
    lead_id: Optional[int] = None

class ConvertToProjectRequest(BaseModel):
    project_name: str
    status: Optional[str] = "En cours"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    extra_cost: Optional[float] = 0.0
    po_client: str  

# Routes
@router.post("/", response_model=OpportunityBase)
def create_opportunity(opportunity: OpportunityCreate, db: Session = Depends(get_db)):
    new_opportunity = models.Opportunity(**opportunity.dict())
    db.add(new_opportunity)
    db.commit()
    db.refresh(new_opportunity)
    return new_opportunity

@router.get("/", response_model=List[OpportunityBase])
def list_opportunities(
    include_converted: bool = Query(False, description="Inclure les opportunités converties en projets"),
    db: Session = Depends(get_db)
):
    """
    Liste les opportunités actives (par défaut exclut les opportunités converties en projets)
    """
    # Filtrer les opportunités selon le paramètre include_converted
    if include_converted:
        # Récupérer toutes les opportunités
        opportunities = db.query(models.Opportunity).all()
    else:
        # Exclure les opportunités converties en projets
        opportunities = db.query(models.Opportunity).filter(
            models.Opportunity.current_step.notin_([
                "Converti en projet", 
                "CONVERTI EN PROJET",
                "converti en projet"
            ])
        ).all()
    
    results = []

    for opp in opportunities:
        # Gérer le champ project correctement
        project_value = None
        if opp.project:
            if isinstance(opp.project, str):
                project_value = opp.project
            elif hasattr(opp.project, 'project_name'):
                project_value = opp.project.project_name
            else:
                project_value = str(opp.project)

        results.append({
            "id": opp.id,
            "reference_project": opp.reference_project,
            "company_name": opp.company_name,
            "country": opp.country,
            "contact_name": opp.contact_name,
            "contact_position": opp.contact_position,
            "phone": opp.phone,
            "email": opp.email,
            "sector_field": opp.sector_field,
            "project": project_value,
            "current_step": opp.current_step,
            "current_step_date": opp.current_step_date,
            "devis_number": opp.devis_number,
            "montant_devis": opp.montant_devis,
            "client_deadline": opp.client_deadline,
            "lead_id": opp.lead_id
        })

    return results

@router.get("/converted", response_model=List[OpportunityBase])
def list_converted_opportunities(db: Session = Depends(get_db)):
    """
    Liste uniquement les opportunités converties en projets
    """
    opportunities = db.query(models.Opportunity).filter(
        models.Opportunity.current_step.in_([
            "Converti en projet", 
            "CONVERTI EN PROJET",
            "converti en projet"
        ])
    ).all()
    
    results = []

    for opp in opportunities:
        # Gérer le champ project correctement
        project_value = None
        if opp.project:
            if isinstance(opp.project, str):
                project_value = opp.project
            elif hasattr(opp.project, 'project_name'):
                project_value = opp.project.project_name
            else:
                project_value = str(opp.project)

        results.append({
            "id": opp.id,
            "reference_project": opp.reference_project,
            "company_name": opp.company_name,
            "country": opp.country,
            "contact_name": opp.contact_name,
            "contact_position": opp.contact_position,
            "phone": opp.phone,
            "email": opp.email,
            "sector_field": opp.sector_field,
            "project": project_value,
            "current_step": opp.current_step,
            "current_step_date": opp.current_step_date,
            "devis_number": opp.devis_number,
            "montant_devis": opp.montant_devis,
            "client_deadline": opp.client_deadline,
            "lead_id": opp.lead_id
        })

    return results

@router.get("/{opportunity_id}", response_model=OpportunityBase)
def get_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    opportunity = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    # Gérer le champ project correctement
    project_value = None
    if opportunity.project:
        if isinstance(opportunity.project, str):
            project_value = opportunity.project
        elif hasattr(opportunity.project, 'project_name'):
            project_value = opportunity.project.project_name
        else:
            project_value = str(opportunity.project)
    
    opportunity_dict = {
        "id": opportunity.id,
        "reference_project": opportunity.reference_project,
        "company_name": opportunity.company_name,
        "country": opportunity.country,
        "contact_name": opportunity.contact_name,
        "contact_position": opportunity.contact_position,
        "phone": opportunity.phone,
        "email": opportunity.email,
        "sector_field": opportunity.sector_field,
        "project": project_value,
        "current_step": opportunity.current_step,
        "current_step_date": opportunity.current_step_date,
        "devis_number": opportunity.devis_number,
        "montant_devis": opportunity.montant_devis,
        "client_deadline": opportunity.client_deadline,
        "lead_id": opportunity.lead_id
    }
    
    return opportunity_dict

@router.put("/{opportunity_id}", response_model=OpportunityBase)
def update_opportunity(opportunity_id: int, updated_opportunity: OpportunityUpdate, db: Session = Depends(get_db)):
    try:
        opportunity = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        update_data = updated_opportunity.dict(exclude_unset=True)
        
        # Mettre à jour les attributs de l'opportunité
        for key, value in update_data.items():
            if key == "project" and value is not None:
                opportunity.project = value
            elif hasattr(opportunity, key):
                setattr(opportunity, key, value)
        
        db.commit()
        db.refresh(opportunity)
        
        # Gérer le champ project pour la réponse
        project_value = None
        if opportunity.project:
            if isinstance(opportunity.project, str):
                project_value = opportunity.project
            elif hasattr(opportunity.project, 'project_name'):
                project_value = opportunity.project.project_name
            else:
                project_value = str(opportunity.project)
        
        opportunity_dict = {
            "id": opportunity.id,
            "reference_project": opportunity.reference_project,
            "company_name": opportunity.company_name,
            "country": opportunity.country,
            "contact_name": opportunity.contact_name,
            "contact_position": opportunity.contact_position,
            "phone": opportunity.phone,
            "email": opportunity.email,
            "sector_field": opportunity.sector_field,
            "project": project_value,
            "current_step": opportunity.current_step,
            "current_step_date": opportunity.current_step_date,
            "devis_number": opportunity.devis_number,
            "montant_devis": opportunity.montant_devis,
            "client_deadline": opportunity.client_deadline,
            "lead_id": opportunity.lead_id
        }
        
        return opportunity_dict
        
    except Exception as e:
        db.rollback()
        print(f"Erreur lors de la mise à jour: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@router.delete("/{opportunity_id}")
def delete_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    opportunity = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    db.delete(opportunity)
    db.commit()
    return {"message": "Opportunity deleted successfully"}

@router.post("/convert-to-project/{opportunity_id}", response_model=dict)
def convert_to_project(opportunity_id: int, data: ConvertToProjectRequest, db: Session = Depends(get_db)):
    try:
        opportunity = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunité non trouvée")

        if opportunity.current_step != "PO Client":
            raise HTTPException(status_code=400, detail="Conversion autorisée uniquement à l'étape 'PO Client'")

        # Vérifier si un projet existe déjà pour cette opportunité
        existing_project = db.query(models.Project).filter(models.Project.opportunity_id == opportunity_id).first()
        if existing_project:
            raise HTTPException(status_code=409, detail="Un projet existe déjà pour cette opportunité")

        # Trouver le client associé à l'opportunité si possible
        client_id = None
        client_name = opportunity.company_name 
        
        if opportunity.lead_id:
            lead = db.query(models.Lead).filter(models.Lead.id == opportunity.lead_id).first()
            if lead and lead.client_id:
                client_id = lead.client_id
                client = db.query(models.Client).filter(models.Client.id == client_id).first()
                if client:
                    client_name = client.company_name

        # Utiliser le nom du projet de l'opportunité si disponible
        project_name = None
        if opportunity.project:
            if isinstance(opportunity.project, str):
                project_name = opportunity.project
            elif hasattr(opportunity.project, "project_name"):
                project_name = opportunity.project.project_name
        
        if not project_name:
            project_name = data.project_name
            
        if not project_name:
            raise HTTPException(status_code=400, detail="Nom du projet requis")

        # Créer le nouveau projet
        new_project = models.Project(
            client=client_name,
            project_name=project_name,
            po_client=data.po_client,
            montant_po=opportunity.montant_devis,
            devis_oddnet_final=opportunity.devis_number,
            montant_devis_final=opportunity.montant_devis,
            extra_cost=data.extra_cost,
            status=data.status,
            start_date=data.start_date or datetime.now().date(),
            end_date=data.end_date,
            description=data.description or (opportunity.project if isinstance(opportunity.project, str) else None),
            opportunity_id=opportunity_id,
            client_id=client_id
        )

        db.add(new_project)
        
        # IMPORTANT: Mettre à jour le statut de l'opportunité pour qu'elle soit filtrée
        opportunity.current_step = "CONVERTI EN PROJET"
        
        db.commit()
        db.refresh(new_project)

        project_dict = {
            "id": new_project.id,
            "project_name": new_project.project_name,
            "status": new_project.status,
            "client": new_project.client,
            "start_date": new_project.start_date,
            "end_date": new_project.end_date,
            "description": new_project.description,
            "po_client": new_project.po_client
        }

        return {"message": "Projet créé avec succès", "project": project_dict}

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de la conversion: {str(e)}")

# Route optionnelle pour restaurer une opportunité convertie
@router.post("/restore/{opportunity_id}", response_model=dict)
def restore_opportunity(opportunity_id: int, new_step: str, db: Session = Depends(get_db)):
    """
    Restaure une opportunité convertie en projet vers un statut actif
    """
    try:
        opportunity = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunité non trouvée")

        if opportunity.current_step not in ["Converti en projet", "CONVERTI EN PROJET", "converti en projet"]:
            raise HTTPException(status_code=400, detail="Cette opportunité n'est pas convertie en projet")

        # Mettre à jour le statut
        opportunity.current_step = new_step
        opportunity.current_step_date = datetime.now().date()
        
        db.commit()

        return {"message": "Opportunité restaurée avec succès"}

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la restauration: {str(e)}")