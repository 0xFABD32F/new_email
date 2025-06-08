from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from ..database import get_db
from .. import models
from ..dhl_pdf_calculator import DHLPdfCalculator
from sqlalchemy.sql import func
import datetime

router = APIRouter(
    prefix="/product-shipping",
    tags=["product-shipping"],
    responses={404: {"description": "Not found"}},
)

@router.post("/{product_id}/shipping", response_model=Dict[str, Any])
def create_product_shipping(
    product_id: int,
    shipping_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Crée ou met à jour les informations de transport pour un produit.
    """
    # Vérifier que le produit existe
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    try:
        print(f"Données reçues pour shipping standard: {shipping_data}")
        
        # Extraire les données du corps de la requête
        weight = shipping_data.get("weight_kg")
        dest_country = shipping_data.get("destination_country")
        dir_value = shipping_data.get("direction", "export")
        dims_str = shipping_data.get("dimensions")
        premium = shipping_data.get("premium_service")
        
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
        
        # Mettre à jour les informations de poids et dimensions du produit
        product.poids_kg = weight
        product.dimensions = dims_str
        product.country = dest_country
        
        # Créer ou mettre à jour les informations de transport dans la base de données
        product_shipping_info = db.query(models.ProductShippingInfo).filter(
            models.ProductShippingInfo.product_id == product_id
        ).first()
        
        if product_shipping_info:
            # Mettre à jour les informations existantes
            product_shipping_info.weight_kg = weight
            product_shipping_info.dimensions = dims_str
            product_shipping_info.destination_country = dest_country
            product_shipping_info.direction = dir_value
            product_shipping_info.premium_service = premium
            product_shipping_info.shipping_cost = shipping_cost
            product_shipping_info.shipping_zone = zone
            product_shipping_info.calculated_at = func.now()
            product_shipping_info.is_multi_leg = False
            product_shipping_info.legs_data = None
        else:
            # Créer de nouvelles informations de transport
            product_shipping_info = models.ProductShippingInfo(
                product_id=product_id,
                weight_kg=weight,
                dimensions=dims_str,
                destination_country=dest_country,
                direction=dir_value,
                premium_service=premium,
                shipping_cost=shipping_cost,
                shipping_zone=zone,
                is_multi_leg=False,
                legs_data=None
            )
            db.add(product_shipping_info)
        
        db.commit()
        
        print(f"Informations de transport enregistrées avec succès: ID={product_shipping_info.id}")
        
        return {
            "id": product_shipping_info.id,
            "product_id": product_id,
            "brand": product.brand,
            "pn": product.pn,
            "eq_reference": product.eq_reference,
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
    
    except Exception as e:
        db.rollback()
        print(f"Erreur lors de l'enregistrement des informations de transport: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{product_id}/shipping-multi-leg", response_model=Dict[str, Any])
def create_product_shipping_multi_leg(
    product_id: int,
    shipping_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Crée ou met à jour les informations de transport multi-étapes pour un produit.
    """
    # Vérifier que le produit existe
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    try:
        # Extraire les données du corps de la requête
        weight = shipping_data.get("weight_kg")
        leg_string = shipping_data.get("legs")
        dims_str = shipping_data.get("dimensions")
        premium = shipping_data.get("premium_service")
        
        print(f"Données reçues pour multi-leg: weight={weight}, legs={leg_string}, dimensions={dims_str}, premium={premium}")

        if not weight:
            raise HTTPException(status_code=422, detail="Poids requis")
        if not leg_string:
            raise HTTPException(status_code=422, detail="Étapes de transport requises")
        
        # Initialiser le calculateur DHL
        dhl_calculator = DHLPdfCalculator()
        
        # Parser les legs
        leg_list = []
        for leg_str in leg_string.split(","):
            origin, destination = leg_str.split(":")
            leg_list.append({
                "origin_country": origin,
                "destination_country": destination,
                "direction": "export"  # Par défaut, on considère l'export
            })
        
        # Calculer les dimensions si fournies
        dims = None
        if dims_str:
            dims = dhl_calculator.parse_dimensions(dims_str)
        
        # Calculer les frais de transport
        result = dhl_calculator.calculate_multi_leg_shipping(
            legs=leg_list,
            weight_kg=weight,
            dimensions=dims,
            premium_service=premium
        )
        
        # Utiliser le premier pays de destination comme pays principal
        main_destination = leg_list[0]["destination_country"] if leg_list else "Unknown"
        
        # Mettre à jour les informations de poids et dimensions du produit
        product.poids_kg = weight
        product.dimensions = dims_str
        product.country = main_destination
        
        # Créer ou mettre à jour les informations de transport dans la base de données
        product_shipping_info = db.query(models.ProductShippingInfo).filter(
            models.ProductShippingInfo.product_id == product_id
        ).first()
        
        if product_shipping_info:
            # Mettre à jour les informations existantes
            product_shipping_info.weight_kg = weight
            product_shipping_info.dimensions = dims_str
            product_shipping_info.destination_country = main_destination
            product_shipping_info.direction = "export"
            product_shipping_info.premium_service = premium
            product_shipping_info.shipping_cost = result.get("total_cost", 0)
            product_shipping_info.shipping_zone = 0  # Multi-leg n'a pas de zone unique
            product_shipping_info.calculated_at = func.now()
            product_shipping_info.is_multi_leg = True
            product_shipping_info.legs_data = str(leg_list)  # Stocker les informations des étapes
        else:
            # Créer de nouvelles informations de transport
            product_shipping_info = models.ProductShippingInfo(
                product_id=product_id,
                weight_kg=weight,
                dimensions=dims_str,
                destination_country=main_destination,
                direction="export",
                premium_service=premium,
                shipping_cost=result.get("total_cost", 0),
                shipping_zone=0,  # Multi-leg n'a pas de zone unique
                is_multi_leg=True,
                legs_data=str(leg_list)  # Stocker les informations des étapes
            )
            db.add(product_shipping_info)
        
        db.commit()
        
        print(f"Informations de transport multi-leg enregistrées avec succès: ID={product_shipping_info.id}")
        
        # Ajouter des informations supplémentaires au résultat
        result["product_id"] = product_id
        result["brand"] = product.brand
        result["pn"] = product.pn
        result["eq_reference"] = product.eq_reference
        result["saved"] = True
        result["id"] = product_shipping_info.id
        
        return result
    
    except Exception as e:
        db.rollback()
        print(f"Erreur lors de l'enregistrement des informations de transport multi-leg: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{product_id}", response_model=Dict[str, Any])
def get_product_shipping(product_id: int, db: Session = Depends(get_db)):
    """
    Récupère les informations de transport pour un produit.
    """
    # Vérifier que le produit existe
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Récupérer les informations de transport
    product_shipping_info = db.query(models.ProductShippingInfo).filter(
        models.ProductShippingInfo.product_id == product_id
    ).first()
    
    if not product_shipping_info:
        raise HTTPException(status_code=404, detail="Informations de transport non trouvées")
    
    # Construire la réponse
    response = {
        "id": product_shipping_info.id,
        "product_id": product_id,
        "brand": product.brand,
        "pn": product.pn,
        "eq_reference": product.eq_reference,
        "weight_kg": product_shipping_info.weight_kg,
        "dimensions": product_shipping_info.dimensions,
        "destination_country": product_shipping_info.destination_country,
        "direction": product_shipping_info.direction,
        "premium_service": product_shipping_info.premium_service,
        "shipping_cost": product_shipping_info.shipping_cost,
        "shipping_zone": product_shipping_info.shipping_zone,
        "effective_weight_kg": product_shipping_info.weight_kg,  # Approximation
        "currency": "MAD",
        "calculated_at": product_shipping_info.calculated_at.isoformat(),
        "saved": True,
        "is_multi_leg": product_shipping_info.is_multi_leg
    }
    
    # Ajouter les informations des étapes si c'est un transport multi-leg
    if product_shipping_info.is_multi_leg and product_shipping_info.legs_data:
        try:
            # Convertir la chaîne en liste de dictionnaires
            import ast
            legs_data = ast.literal_eval(product_shipping_info.legs_data)
            response["legs"] = legs_data
        except:
            response["legs"] = []
    
    return response

@router.get("/", response_model=List[Dict[str, Any]])
def get_all_product_shipping(db: Session = Depends(get_db)):
    """
    Récupère toutes les informations de transport pour les produits.
    """
    shipping_infos = db.query(models.ProductShippingInfo).all()
    
    result = []
    for info in shipping_infos:
        product = db.query(models.Product).filter(models.Product.id == info.product_id).first()
        
        if product:
            shipping_data = {
                "id": info.id,
                "product_id": info.product_id,
                "brand": product.brand,
                "pn": product.pn,
                "eq_reference": product.eq_reference,
                "weight_kg": info.weight_kg,
                "dimensions": info.dimensions,
                "destination_country": info.destination_country,
                "direction": info.direction,
                "premium_service": info.premium_service,
                "shipping_cost": info.shipping_cost,
                "shipping_zone": info.shipping_zone,
                "calculated_at": info.calculated_at.isoformat(),
                "saved": True,
                "is_multi_leg": info.is_multi_leg
            }
            
            result.append(shipping_data)
    
    return result

@router.delete("/{shipping_id}", response_model=Dict[str, Any])
def delete_product_shipping(shipping_id: int, db: Session = Depends(get_db)):
    """
    Supprime les informations de transport d'un produit.
    """
    shipping_info = db.query(models.ProductShippingInfo).filter(models.ProductShippingInfo.id == shipping_id).first()
    
    if not shipping_info:
        raise HTTPException(status_code=404, detail="Informations de transport non trouvées")
    
    try:
        db.delete(shipping_info)
        db.commit()
        
        return {"message": "Informations de transport supprimées avec succès"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
