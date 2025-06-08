from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from .. import models, database, security

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class UserRegister(BaseModel):
    nom: str
    email: EmailStr
    phone: str
    role: str
    droit_acces: str
    mot_de_passe: str

class UserLogin(BaseModel):
    email: EmailStr
    mot_de_passe: str

# Modèle pour la mise à jour de l'utilisateur
class UserUpdate(BaseModel):
    nom: str
    email: EmailStr
    phone: str
    role: str = None  # Optionnel pour éviter la modification du rôle par l'utilisateur
    droit_acces: str = None  # Optionnel pour éviter la modification des droits par l'utilisateur
    mot_de_passe: str = None  

# Modèle pour le changement de mot de passe
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post("/register")
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    # Vérifie si email déjà utilisé
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    hashed_password = security.get_password_hash(user.mot_de_passe)

    new_user = models.User(
        nom=user.nom,
        email=user.email,
        phone=user.phone,
        role=user.role,
        droit_acces=user.droit_acces,
        mot_de_passe=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "Utilisateur créé avec succès", "user_id": new_user.id}

@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not security.verify_password(user.mot_de_passe, db_user.mot_de_passe):
        raise HTTPException(status_code=400, detail="Identifiants incorrects")

    return {
        "message": "Connexion réussie",
        "user_id": db_user.id,
        "nom": db_user.nom,
        "email": db_user.email,
        "role": db_user.role,
        "droit_acces": db_user.droit_acces
    }

# Récupération de tous les utilisateurs
@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users

# Récupérer un utilisateur par son id
@router.get("/users/{user_id}") 
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Retourner les informations sans le mot de passe
    return {
        "id": user.id,
        "nom": user.nom,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "droit_acces": user.droit_acces
    }

# Ajouter un nouvel utilisateur
@router.post("/")
def create_user(user: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    hashed_password = security.get_password_hash(user.mot_de_passe)
    new_user = models.User(
        nom=user.nom,
        email=user.email,
        phone=user.phone,
        role=user.role,
        droit_acces=user.droit_acces,
        mot_de_passe=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Utilisateur créé avec succès", "user_id": new_user.id}

# Modifier un utilisateur (profil personnel)
@router.put("/{user_id}")
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Mise à jour des informations de base
    db_user.nom = user.nom
    db_user.email = user.email
    db_user.phone = user.phone

    # Ne pas permettre la modification du rôle et des droits via cette route
    # (seulement via une route admin séparée)
    
    # Mise à jour du mot de passe si fourni
    if user.mot_de_passe:  
        db_user.mot_de_passe = security.get_password_hash(user.mot_de_passe)

    db.commit()
    db.refresh(db_user)
    return {"message": "Utilisateur mis à jour avec succès"}

# Changer le mot de passe
@router.put("/{user_id}/password")
def change_password(user_id: int, password_data: PasswordChange, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier le mot de passe actuel
    if not security.verify_password(password_data.current_password, db_user.mot_de_passe):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    # Mettre à jour avec le nouveau mot de passe
    db_user.mot_de_passe = security.get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Mot de passe modifié avec succès"}

# Supprimer un utilisateur
@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé avec succès"}
