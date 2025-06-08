from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from .. import models, database
from pydantic import BaseModel
from datetime import date
from typing import Optional, List

router = APIRouter(
    prefix="/projects",
    tags=["projects"]
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Modèles Pydantic pour les projets
class ProjectBase(BaseModel):
    client: str
    project_name: str
    po_client: Optional[str] = None
    montant_po: Optional[float] = 0.0
    devis_oddnet_final: Optional[str] = None
    montant_devis_final: Optional[float] = 0.0
    extra_cost: Optional[float] = 0.0
    status: Optional[str] = "En cours"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    opportunity_id: Optional[int] = None
    client_id: Optional[int] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    
    class Config:
      from_attributes = True

# Routes
@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    new_project = models.Project(**project.dict())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, updated_project: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    for key, value in updated_project.dict().items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    db.delete(project)
    db.commit()
    return {"message": "Projet supprimé avec succès"}