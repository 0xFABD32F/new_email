from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from pydantic import BaseModel


from ..database import get_db
from .. import models
from ..dhl_pdf_calculator import DHLPdfCalculator

router = APIRouter(
    prefix="/products",
    tags=["products"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    
    # Convertir les objets SQLAlchemy en dictionnaires
    result = []
    for product in products:
        product_dict = {
            "id": product.id,
            "brand": product.brand,
            "supplier_id": product.supplier_id,
            "pn": product.pn,
            "eq_reference": product.eq_reference,
            "description": product.description,
            "unit_cost": product.unit_cost,
            "currency": product.currency,
            "rate": product.rate,
            "shipping_discount": product.shipping_discount,
            "unit_cost_mad": product.unit_cost_mad,
            "p_margin": product.p_margin,
            "customer_id": product.customer_id,
            "devis_number": product.devis_number,
            "country": product.country,
            "qty": product.qty,
            "total_price": product.total_price,
            "eta": product.eta,
            "transit": product.transit,
            "douane": product.douane,
            "poids_kg": product.poids_kg,
            "dimensions": product.dimensions,
            # Inclure les noms pour l'affichage
            "supplier_name": product.supplier.company if product.supplier else "N/A",
            "customer_name": product.customer.company_name if product.customer else "N/A"
        }
        result.append(product_dict)
    
    return result

@router.post("/")
def create_product(product_data: Dict[str, Any], db: Session = Depends(get_db)):
    # Vérifier si le fournisseur existe
    if product_data.get("supplier_id"):
        supplier = db.query(models.Supplier).filter(models.Supplier.id == product_data["supplier_id"]).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Vérifier si le client existe
    if product_data.get("customer_id"):
        customer = db.query(models.Client).filter(models.Client.id == product_data["customer_id"]).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Calculer unit_cost_mad si non fourni
    if "unit_cost_mad" not in product_data or not product_data["unit_cost_mad"]:
        product_data["unit_cost_mad"] = product_data["unit_cost"] * product_data["rate"]
    
    # Calculer total_price si non fourni
    if "total_price" not in product_data or not product_data["total_price"]:
        qty = product_data.get("qty", 1)
        unit_cost = product_data.get("unit_cost", 0)
        product_data["total_price"] = qty * unit_cost
    
    # Créer le produit
    db_product = models.Product(**product_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_product.id,
        "brand": db_product.brand,
        "supplier_id": db_product.supplier_id,
        "pn": db_product.pn,
        "eq_reference": db_product.eq_reference,
        "description": db_product.description,
        "unit_cost": db_product.unit_cost,
        "currency": db_product.currency,
        "rate": db_product.rate,
        "shipping_discount": db_product.shipping_discount,
        "unit_cost_mad": db_product.unit_cost_mad,
        "p_margin": db_product.p_margin,
        "customer_id": db_product.customer_id,
        "devis_number": db_product.devis_number,
        "country": db_product.country,
        "qty": db_product.qty,
        "total_price": db_product.total_price,
        "eta": db_product.eta,
        "transit": db_product.transit,
        "douane": db_product.douane,
        "poids_kg": db_product.poids_kg,
        "dimensions": db_product.dimensions,
        "supplier_name": db_product.supplier.company if db_product.supplier else "N/A",
        "customer_name": db_product.customer.company_name if db_product.customer else "N/A"
    }
    
    return result

@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_product.id,
        "brand": db_product.brand,
        "supplier_id": db_product.supplier_id,
        "pn": db_product.pn,
        "eq_reference": db_product.eq_reference,
        "description": db_product.description,
        "unit_cost": db_product.unit_cost,
        "currency": db_product.currency,
        "rate": db_product.rate,
        "shipping_discount": db_product.shipping_discount,
        "unit_cost_mad": db_product.unit_cost_mad,
        "p_margin": db_product.p_margin,
        "customer_id": db_product.customer_id,
        "devis_number": db_product.devis_number,
        "country": db_product.country,
        "qty": db_product.qty,
        "total_price": db_product.total_price,
        "eta": db_product.eta,
        "transit": db_product.transit,
        "douane": db_product.douane,
        "poids_kg": db_product.poids_kg,
        "dimensions": db_product.dimensions,
        "supplier_name": db_product.supplier.company if db_product.supplier else "N/A",
        "customer_name": db_product.customer.company_name if db_product.customer else "N/A"
    }
    
    return result

@router.put("/{product_id}")
def update_product(product_id: int, product_data: Dict[str, Any], db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Vérifier si le fournisseur existe
    if "supplier_id" in product_data and product_data["supplier_id"]:
        supplier = db.query(models.Supplier).filter(models.Supplier.id == product_data["supplier_id"]).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Vérifier si le client existe
    if "customer_id" in product_data and product_data["customer_id"]:
        customer = db.query(models.Client).filter(models.Client.id == product_data["customer_id"]).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Calculer unit_cost_mad si unit_cost ou rate ont changé
    if ("unit_cost" in product_data or "rate" in product_data) and "unit_cost_mad" not in product_data:
        unit_cost = product_data.get("unit_cost", db_product.unit_cost)
        rate = product_data.get("rate", db_product.rate)
        product_data["unit_cost_mad"] = unit_cost * rate
    
    # Calculer total_price si qty ou unit_cost ont changé
    if ("qty" in product_data or "unit_cost" in product_data) and "total_price" not in product_data:
        qty = product_data.get("qty", db_product.qty or 1)
        unit_cost = product_data.get("unit_cost", db_product.unit_cost)
        product_data["total_price"] = qty * unit_cost
    
    # Mettre à jour les attributs
    for key, value in product_data.items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_product.id,
        "brand": db_product.brand,
        "supplier_id": db_product.supplier_id,
        "pn": db_product.pn,
        "eq_reference": db_product.eq_reference,
        "description": db_product.description,
        "unit_cost": db_product.unit_cost,
        "currency": db_product.currency,
        "rate": db_product.rate,
        "shipping_discount": db_product.shipping_discount,
        "unit_cost_mad": db_product.unit_cost_mad,
        "p_margin": db_product.p_margin,
        "customer_id": db_product.customer_id,
        "devis_number": db_product.devis_number,
        "country": db_product.country,
        "qty": db_product.qty,
        "total_price": db_product.total_price,
        "eta": db_product.eta,
        "transit": db_product.transit,
        "douane": db_product.douane,
        "poids_kg": db_product.poids_kg,
        "dimensions": db_product.dimensions,
        "supplier_name": db_product.supplier.company if db_product.supplier else "N/A",
        "customer_name": db_product.customer.company_name if db_product.customer else "N/A"
    }
    
    return result

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Vérifier si le produit est utilisé dans des devis ou commandes
    po_items = db.query(models.POItem).filter(models.POItem.product_id == product_id).first()
    if po_items:
        raise HTTPException(
            status_code=400, 
            detail="Ce produit est utilisé dans des commandes et ne peut pas être supprimé"
        )
    
    devis_items = db.query(models.DevisItem).filter(models.DevisItem.product_id == product_id).first()
    if devis_items:
        raise HTTPException(
            status_code=400, 
            detail="Ce produit est utilisé dans des devis et ne peut pas être supprimé"
        )
    
    # Convertir l'objet SQLAlchemy en dictionnaire avant suppression
    result = {
        "id": db_product.id,
        "brand": db_product.brand,
        "supplier_id": db_product.supplier_id,
        "pn": db_product.pn,
        "eq_reference": db_product.eq_reference,
        "description": db_product.description,
        "unit_cost": db_product.unit_cost,
        "currency": db_product.currency,
        "rate": db_product.rate,
        "shipping_discount": db_product.shipping_discount,
        "unit_cost_mad": db_product.unit_cost_mad,
        "p_margin": db_product.p_margin,
        "customer_id": db_product.customer_id,
        "devis_number": db_product.devis_number,
        "country": db_product.country,
        "qty": db_product.qty,
        "total_price": db_product.total_price,
        "eta": db_product.eta,
        "transit": db_product.transit,
        "douane": db_product.douane,
        "poids_kg": db_product.poids_kg,
        "dimensions": db_product.dimensions
    }
    
    db.delete(db_product)
    db.commit()
    
    return result

@router.get("/supplier/{supplier_id}")
def get_products_by_supplier(supplier_id: int, db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(models.Product.supplier_id == supplier_id).all()
    
    # Convertir les objets SQLAlchemy en dictionnaires
    result = []
    for product in products:
        product_dict = {
            "id": product.id,
            "brand": product.brand,
            "supplier_id": product.supplier_id,
            "pn": product.pn,
            "eq_reference": product.eq_reference,
            "description": product.description,
            "unit_cost": product.unit_cost,
            "currency": product.currency,
            "rate": product.rate,
            "shipping_discount": product.shipping_discount,
            "unit_cost_mad": product.unit_cost_mad,
            "p_margin": product.p_margin,
            "customer_id": product.customer_id,
            "devis_number": product.devis_number,
            "country": product.country,
            "qty": product.qty,
            "total_price": product.total_price,
            "eta": product.eta,
            "transit": product.transit,
            "douane": product.douane,
            "poids_kg": product.poids_kg,
            "dimensions": product.dimensions,
            "supplier_name": product.supplier.company if product.supplier else "N/A",
            "customer_name": product.customer.company_name if product.customer else "N/A"
        }
        result.append(product_dict)
    
    return result

@router.get("/brands/list")
def get_brands(db: Session = Depends(get_db)):
    """Récupère la liste des marques uniques"""
    brands = db.query(models.Product.brand).distinct().all()
    return [brand[0] for brand in brands if brand[0]]

@router.get("/countries/list")
def get_countries(db: Session = Depends(get_db)):
    """Récupère la liste des pays uniques"""
    countries = db.query(models.Product.country).distinct().all()
    return [country[0] for country in countries if country[0]]

@router.get("/brands/supplier/{supplier_id}")
def get_brands_by_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Récupère la liste des marques uniques pour un fournisseur spécifique"""
    brands = db.query(models.Product.brand).filter(
        models.Product.supplier_id == supplier_id,
        models.Product.brand.isnot(None),
        models.Product.brand != ""
    ).distinct().all()
    
    return [brand[0] for brand in brands if brand[0]]

# Nouvelles routes pour le calcul des frais de transport

class ProductShippingRequest(BaseModel):
    product_id: int
    destination_country: str
    direction: str = "export"
    premium_service: Optional[str] = None

@router.post("/calculate-shipping", response_model=Dict[str, Any])
def calculate_product_shipping(request: ProductShippingRequest, db: Session = Depends(get_db)):
    """
    Calcule les frais de transport pour un produit.
    """
    # Récupérer le produit
    product = db.query(models.Product).filter(models.Product.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    try:
        # Initialiser le calculateur DHL
        dhl_calculator = DHLPdfCalculator()
        
        # Vérifier si le poids est défini
        if not product.poids_kg:
            raise HTTPException(status_code=400, detail="Le poids du produit n'est pas défini")
        
        # Calculer le poids effectif si les dimensions sont fournies
        effective_weight = product.poids_kg
        if product.dimensions:
            dims = dhl_calculator.parse_dimensions(product.dimensions)
            if dims:
                length, width, height = dims
                effective_weight = dhl_calculator.get_effective_weight(product.poids_kg, length, width, height)
        
        # Calculer les frais de transport
        shipping_cost = dhl_calculator.calculate_shipping_cost(
            weight_kg=effective_weight,
            country=request.destination_country,
            direction=request.direction,
            premium_service=request.premium_service
        )
        
        # Obtenir la zone pour ce pays
        zone = dhl_calculator.get_zone_for_country(request.destination_country, request.direction)
        
        # Mettre à jour le produit avec les informations de transport
        product.shipping_cost = shipping_cost
        product.shipping_zone = zone
        product.shipping_direction = request.direction
        product.shipping_service = request.premium_service
        
        db.commit()
        
        return {
            "product_id": product.id,
            "brand": product.brand,
            "eq_reference": product.eq_reference,
            "shipping_cost": shipping_cost,
            "currency": "MAD",
            "weight_kg": product.poids_kg,
            "effective_weight_kg": effective_weight,
            "country": request.destination_country,
            "direction": request.direction,
            "zone": zone,
            "premium_service": request.premium_service
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{product_id}/update-shipping-info", response_model=Dict[str, Any])
def update_product_shipping_info(
    product_id: int, 
    poids_kg: Optional[float] = None,
    dimensions: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Met à jour les informations de poids et dimensions pour un produit.
    """
    # Récupérer le produit
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Mettre à jour les informations
    if poids_kg is not None:
        product.poids_kg = poids_kg
    
    if dimensions is not None:
        # Valider le format des dimensions
        dhl_calculator = DHLPdfCalculator()
        if dhl_calculator.parse_dimensions(dimensions):
            product.dimensions = dimensions
        else:
            raise HTTPException(status_code=400, detail="Format de dimensions invalide. Utilisez le format 'LxlxH' en cm (ex: '30x20x15')")
    
    db.commit()
    db.refresh(product)
    
    return {
        "product_id": product.id,
        "brand": product.brand,
        "eq_reference": product.eq_reference,
        "poids_kg": product.poids_kg,
        "dimensions": product.dimensions
    }