from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from ..database import get_db
from .. import models
from ..dhl_pdf_calculator import DHLPdfCalculator
from sqlalchemy.sql import func
import datetime
import traceback

# Créer un routeur avec un préfixe spécifique pour éviter les conflits
router = APIRouter(
    prefix="/shipping-hardware",  # Nouveau préfixe pour éviter les conflits
    tags=["shipping-hardware"],
    responses={404: {"description": "Not found"}},
)

@router.get("/brands", response_model=List[str])
def get_hardware_brands(db: Session = Depends(get_db)):
    """
    Récupère toutes les marques distinctes des équipements hardware.
    """
    try:
        brands = db.query(models.HardwareIT.brand).distinct().all()
        return [brand[0] for brand in brands if brand[0]]
    except Exception as e:
        print(f"Erreur dans get_hardware_brands: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail="Erreur serveur lors de la récupération des marques"
        )

@router.get("/countries", response_model=List[str])
def get_hardware_countries(db: Session = Depends(get_db)):
    """
    Récupère tous les pays de destination distincts des informations de transport.
    """
    try:
        countries = db.query(models.ShippingInfo.destination_country).distinct().all()
        return [country[0] for country in countries if country[0]]
    except Exception as e:
        print(f"Erreur dans get_hardware_countries: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail="Erreur serveur lors de la récupération des pays"
        )

@router.get("/list", response_model=List[Dict[str, Any]])
def get_all_hardware_shipping(
    db: Session = Depends(get_db),
    country_code: str = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Récupère toutes les informations de transport hardware.
    Le paramètre country_code est optionnel.
    """
    try:
        print(f"DEBUG: Requête reçue pour /shipping-hardware/list avec country_code={country_code!r}, skip={skip}, limit={limit}")
        
        # Récupérer toutes les informations de transport avec les équipements associés
        query = db.query(
            models.ShippingInfo,
            models.HardwareIT
        ).join(
            models.HardwareIT,
            models.HardwareIT.id == models.ShippingInfo.hardware_id
        ).filter(
            models.ShippingInfo.hardware_id.isnot(None)
        )
        
        # Filtrer par pays si spécifié et non vide
        if country_code:
            print(f"DEBUG: Filtrage par pays: {country_code!r}")
            query = query.filter(models.ShippingInfo.destination_country == country_code)
        else:
            print("DEBUG: Aucun filtrage par pays")
            
        # Appliquer la pagination
        query = query.offset(skip).limit(limit)

        results = query.all()
        
        shipping_list = []
        for shipping_info, hardware in results:
            shipping_data = {
                "id": shipping_info.id,
                "hardware_id": hardware.id,
                "brand": hardware.brand,
                "eq_reference": hardware.eq_reference,
                "pn": hardware.pn,
                "weight_kg": shipping_info.weight_kg,
                "dimensions": shipping_info.dimensions,
                "destination_country": shipping_info.destination_country,
                "direction": shipping_info.direction,
                "premium_service": shipping_info.premium_service,
                "shipping_cost": shipping_info.shipping_cost,
                "shipping_zone": shipping_info.shipping_zone,
                "calculated_at": shipping_info.calculated_at.isoformat() if shipping_info.calculated_at else None,
                "saved": True
            }
            shipping_list.append(shipping_data)
        
        print(f"DEBUG: Données récupérées avec succès: {len(shipping_list)} enregistrements")
        return shipping_list
        
    except Exception as e:
        print(f"ERREUR dans get_all_hardware_shipping: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur lors de la récupération des données de transport: {str(e)}"
        )

@router.get("/item/{hardware_id}", response_model=Dict[str, Any])
def get_hardware_shipping(hardware_id: int, db: Session = Depends(get_db)):
    """
    Récupère les informations de transport pour un équipement hardware spécifique.
    """
    try:
        hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
        if not hardware:
            return {"message": "Équipement hardware non trouvé", "exists": False}
        
        info = db.query(models.ShippingInfo).filter(models.ShippingInfo.hardware_id == hardware_id).first()
        if not info:
            return {"message": "Informations de transport non trouvées", "exists": False}
        
        return {
            "id": info.id,
            "hardware_id": hardware_id,
            "brand": hardware.brand,
            "eq_reference": hardware.eq_reference,
            "weight_kg": info.weight_kg,
            "dimensions": info.dimensions,
            "destination_country": info.destination_country,
            "direction": info.direction,
            "premium_service": info.premium_service,
            "shipping_cost": info.shipping_cost,
            "shipping_zone": info.shipping_zone,
            "effective_weight_kg": info.weight_kg,
            "currency": "MAD",
            "calculated_at": info.calculated_at.isoformat() if info.calculated_at else None,
            "saved": True,
            "exists": True
        }
    except Exception as e:
        print(f"Erreur dans get_hardware_shipping: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Erreur serveur lors de la récupération des données")

@router.delete("/delete/{id}")
def delete_hardware_shipping(id: int, db: Session = Depends(get_db)):
    """
    Supprime les informations de transport pour un ID spécifique.
    """
    shipping = db.query(models.ShippingInfo).filter(models.ShippingInfo.id == id).first()
    if not shipping:
        raise HTTPException(status_code=404, detail="Information de transport non trouvée")
    
    db.delete(shipping)
    db.commit()
    return {"deleted": True}

@router.post("/create/{hardware_id}")
def create_hardware_shipping(
    hardware_id: int,
    shipping_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Crée ou met à jour les informations de transport pour un équipement hardware.
    """
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if not hardware:
        raise HTTPException(status_code=404, detail="Équipement hardware non trouvé")
    
    try:
        # Extraire les données du corps de la requête
        weight = shipping_data.get("weight_kg")
        dest_country = shipping_data.get("destination_country")
        dir_value = shipping_data.get("direction", "export")
        dims_str = shipping_data.get("dimensions")
        premium = shipping_data.get("premium_service")
        
        print(f"Données reçues pour hardware shipping: {shipping_data}")
        
        # Valider les données requises
        if not weight or not dest_country:
            raise HTTPException(status_code=422, detail="Poids et pays de destination requis")
        
        # Initialiser le calculateur DHL
        dhl_calculator = DHLPdfCalculator()
        
        # Calculer le poids effectif si les dimensions sont fournies
        effective_weight = weight
        if dims_str:
            dims = dhl_calculator.parse_dimensions(dims_str)
            if dims:
                length, width, height = dims
                effective_weight = dhl_calculator.get_effective_weight(weight, length, width, height)
        
        # Calculer les frais de transport
        shipping_cost = dhl_calculator.calculate_shipping_cost(
            weight_kg=effective_weight,
            country=dest_country,
            direction=dir_value,
            premium_service=premium
        )
        
        # Obtenir la zone pour ce pays
        zone = dhl_calculator.get_zone_for_country(dest_country, dir_value)
        
        # Mettre à jour les informations de poids et dimensions de l'équipement
        hardware.poids_kg = weight
        hardware.dimensions = dims_str
        
        # Vérifier si des informations de transport existent déjà pour cet équipement
        hardware_shipping_info = db.query(models.ShippingInfo).filter(
            models.ShippingInfo.hardware_id == hardware_id
        ).first()
        
        if hardware_shipping_info:
            # Mettre à jour les informations existantes
            hardware_shipping_info.weight_kg = weight
            hardware_shipping_info.dimensions = dims_str
            hardware_shipping_info.destination_country = dest_country
            hardware_shipping_info.direction = dir_value
            hardware_shipping_info.premium_service = premium
            hardware_shipping_info.shipping_cost = shipping_cost
            hardware_shipping_info.shipping_zone = zone
            hardware_shipping_info.calculated_at = func.now()
        else:
            # Créer de nouvelles informations de transport
            hardware_shipping_info = models.ShippingInfo(
                hardware_id=hardware_id,
                weight_kg=weight,
                dimensions=dims_str,
                destination_country=dest_country,
                direction=dir_value,
                premium_service=premium,
                shipping_cost=shipping_cost,
                shipping_zone=zone
            )
            db.add(hardware_shipping_info)
        
        # Enregistrer les modifications
        db.commit()
        db.refresh(hardware_shipping_info)
        
        print(f"Informations de transport hardware enregistrées avec succès: ID={hardware_shipping_info.id}")
        
        # Retourner les informations mises à jour
        return {
            "id": hardware_shipping_info.id,
            "hardware_id": hardware_id,
            "brand": hardware.brand,
            "eq_reference": hardware.eq_reference,
            "weight_kg": weight,
            "dimensions": dims_str,
            "destination_country": dest_country,
            "direction": dir_value,
            "premium_service": premium,
            "shipping_cost": shipping_cost,
            "shipping_zone": zone,
            "effective_weight_kg": effective_weight,
            "currency": "MAD",
            "calculated_at": datetime.datetime.now().isoformat(),
            "saved": True
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur dans create_hardware_shipping: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Erreur lors du calcul des frais de transport: {str(e)}")

@router.put("/update/{hardware_id}")
def update_hardware_shipping(
    hardware_id: int,
    shipping_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Met à jour les informations de transport pour un équipement hardware.
    """
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if not hardware:
        raise HTTPException(status_code=404, detail="Équipement hardware non trouvé")
    
    try:
        # Vérifier si des informations de transport existent déjà
        shipping_info = db.query(models.ShippingInfo)\
            .filter(models.ShippingInfo.hardware_id == hardware_id)\
            .first()
        
        if not shipping_info:
            raise HTTPException(status_code=404, detail="Informations de transport non trouvées pour mise à jour")
        
        # Mettre à jour les champs
        for field in ['weight_kg', 'dimensions', 'destination_country', 'direction', 'premium_service']:
            if field in shipping_data:
                setattr(shipping_info, field, shipping_data[field])
        
        # Recalculer si nécessaire
        dhl_calculator = DHLPdfCalculator()
        shipping_info.shipping_cost = dhl_calculator.calculate_shipping_cost(
            weight_kg=shipping_info.weight_kg,
            country=shipping_info.destination_country,
            direction=shipping_info.direction,
            premium_service=shipping_info.premium_service
        )
        shipping_info.shipping_zone = dhl_calculator.get_zone_for_country(
            shipping_info.destination_country,
            shipping_info.direction
        )
        shipping_info.calculated_at = func.now()
        
        db.commit()
        
        return {
            "message": "Informations mises à jour avec succès",
            "id": shipping_info.id,
            "hardware_id": hardware_id
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
