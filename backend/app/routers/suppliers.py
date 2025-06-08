from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from sqlalchemy import func

from ..database import get_db
from .. import models

router = APIRouter(
    prefix="/suppliers",
    tags=["suppliers"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
def get_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    suppliers = db.query(models.Supplier).offset(skip).limit(limit).all()
    
    # Convertir les objets SQLAlchemy en dictionnaires
    result = []
    for supplier in suppliers:
        # Compter les produits et les éléments hardware
        products_count = db.query(models.Product).filter(models.Product.supplier_id == supplier.id).count()
        hardware_count = db.query(models.HardwareIT).filter(models.HardwareIT.supplier_id == supplier.id).count()
        
        supplier_dict = {
            "id": supplier.id,
            "company": supplier.company,
            "domain": supplier.domain,
            "brand": supplier.brand,
            "country": supplier.country,
            "address": supplier.address,
            "position": supplier.position,
            "contact_name": supplier.contact_name,
            "phone": supplier.phone,
            "email": supplier.email,
            "currency": supplier.currency,
            "rib": supplier.rib,
            "payment_terms": supplier.payment_terms,
            "reliability": supplier.reliability,
            "products_count": products_count,
            "hardware_count": hardware_count,
            "purchase_orders_count": len(supplier.purchase_orders) if hasattr(supplier, 'purchase_orders') and supplier.purchase_orders else 0
        }
        result.append(supplier_dict)
    
    return result

@router.post("/")
def create_supplier(supplier_data: Dict[str, Any], db: Session = Depends(get_db)):
    # Vérifier si le fournisseur existe déjà
    existing_supplier = db.query(models.Supplier).filter(
        models.Supplier.company == supplier_data["company"]
    ).first()
    
    if existing_supplier:
        raise HTTPException(
            status_code=400,
            detail="Un fournisseur avec ce nom existe déjà"
        )
    
    # Créer le fournisseur
    db_supplier = models.Supplier(**supplier_data)
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_supplier.id,
        "company": db_supplier.company,
        "domain": db_supplier.domain,
        "brand": db_supplier.brand,
        "country": db_supplier.country,
        "address": db_supplier.address,
        "position": db_supplier.position,
        "contact_name": db_supplier.contact_name,
        "phone": db_supplier.phone,
        "email": db_supplier.email,
        "currency": db_supplier.currency,
        "rib": db_supplier.rib,
        "payment_terms": db_supplier.payment_terms,
        "reliability": db_supplier.reliability
    }
    
    return result

@router.get("/{supplier_id}")
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Compter les produits et les éléments hardware
    products_count = db.query(models.Product).filter(models.Product.supplier_id == supplier_id).count()
    hardware_count = db.query(models.HardwareIT).filter(models.HardwareIT.supplier_id == supplier_id).count()
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_supplier.id,
        "company": db_supplier.company,
        "domain": db_supplier.domain,
        "brand": db_supplier.brand,
        "country": db_supplier.country,
        "address": db_supplier.address,
        "position": db_supplier.position,
        "contact_name": db_supplier.contact_name,
        "phone": db_supplier.phone,
        "email": db_supplier.email,
        "currency": db_supplier.currency,
        "rib": db_supplier.rib,
        "payment_terms": db_supplier.payment_terms,
        "reliability": db_supplier.reliability,
        "products_count": products_count,
        "hardware_count": hardware_count
    }
    
    return result

@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, supplier_data: Dict[str, Any], db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Vérifier si le nouveau nom de société existe déjà pour un autre fournisseur
    if "company" in supplier_data and supplier_data["company"] != db_supplier.company:
        existing_supplier = db.query(models.Supplier).filter(
            models.Supplier.company == supplier_data["company"],
            models.Supplier.id != supplier_id
        ).first()
        
        if existing_supplier:
            raise HTTPException(
                status_code=400,
                detail="Un fournisseur avec ce nom existe déjà"
            )
    
    # Mettre à jour les informations
    for key, value in supplier_data.items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_supplier.id,
        "company": db_supplier.company,
        "domain": db_supplier.domain,
        "brand": db_supplier.brand,
        "country": db_supplier.country,
        "address": db_supplier.address,
        "position": db_supplier.position,
        "contact_name": db_supplier.contact_name,
        "phone": db_supplier.phone,
        "email": db_supplier.email,
        "currency": db_supplier.currency,
        "rib": db_supplier.rib,
        "payment_terms": db_supplier.payment_terms,
        "reliability": db_supplier.reliability
    }
    
    return result

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Vérifier si le fournisseur est utilisé dans des produits
    products_count = db.query(models.Product).filter(
        models.Product.supplier_id == supplier_id
    ).count()
    
    if products_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ce fournisseur est associé à {products_count} produit(s) et ne peut pas être supprimé"
        )
    
    # Vérifier si le fournisseur est utilisé dans des éléments hardware
    hardware_count = db.query(models.HardwareIT).filter(
        models.HardwareIT.supplier_id == supplier_id
    ).count()
    
    if hardware_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ce fournisseur est associé à {hardware_count} équipement(s) hardware et ne peut pas être supprimé"
        )
    
    # Vérifier si le fournisseur est utilisé dans des bons de commande
    po_count = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.supplier_id == supplier_id
    ).count()
    
    if po_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ce fournisseur est utilisé dans {po_count} bon(s) de commande et ne peut pas être supprimé"
        )
    
    # Convertir l'objet SQLAlchemy en dictionnaire avant suppression
    result = {
        "id": db_supplier.id,
        "company": db_supplier.company,
        "domain": db_supplier.domain,
        "brand": db_supplier.brand,
        "country": db_supplier.country,
        "address": db_supplier.address,
        "position": db_supplier.position,
        "contact_name": db_supplier.contact_name,
        "phone": db_supplier.phone,
        "email": db_supplier.email,
        "currency": db_supplier.currency,
        "rib": db_supplier.rib,
        "payment_terms": db_supplier.payment_terms,
        "reliability": db_supplier.reliability
    }
    
    db.delete(db_supplier)
    db.commit()
    
    return result

@router.get("/{supplier_id}/products")
def get_supplier_products(supplier_id: int, db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    products = db.query(models.Product).filter(
        models.Product.supplier_id == supplier_id
    ).all()
    
    # Convertir les objets SQLAlchemy en dictionnaires
    result = []
    for product in products:
        product_dict = {
            "id": product.id,
            "brand": product.brand,
            "pn": product.pn,
            "eq_reference": product.eq_reference,
            "description": product.description,
            "unit_cost": product.unit_cost,
            "currency": product.currency,
            "unit_cost_mad": product.unit_cost_mad
        }
        result.append(product_dict)
    
    return result

@router.get("/{supplier_id}/hardware")
def get_supplier_hardware(supplier_id: int, db: Session = Depends(get_db)):
    """Récupère tous les éléments hardware d'un fournisseur"""
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    hardware_items = db.query(models.HardwareIT).filter(
        models.HardwareIT.supplier_id == supplier_id
    ).all()
    
    # Convertir les objets SQLAlchemy en dictionnaires
    result = []
    for item in hardware_items:
        item_dict = {
            "id": item.id,
            "brand": item.brand,
            "pn": item.pn,
            "eq_reference": item.eq_reference,
            "unit_cost_mad": item.unit_cost_mad,
            "p_margin": item.p_margin,
            "unit_price": item.unit_price,
            "country": item.country,
            "eta": item.eta,
            "transit": item.transit,
            "douane": item.douane,
            "devis_number": item.devis_number
        }
        result.append(item_dict)
    
    return result

@router.get("/{supplier_id}/purchase-orders")
def get_supplier_purchase_orders(supplier_id: int, db: Session = Depends(get_db)):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if db_supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    purchase_orders = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.supplier_id == supplier_id
    ).all()
    
    # Convertir les objets SQLAlchemy en dictionnaires
    result = []
    for po in purchase_orders:
        po_dict = {
            "id": po.id,
            "po_number": po.po_number,
            "date_creation": po.date_creation.isoformat() if po.date_creation else None,
            "currency": po.currency,
            "total_amount": po.total_amount,
            "status": po.status,
            "eta": po.eta
        }
        result.append(po_dict)
    
    return result

@router.get("/domains/list")
def get_domains(db: Session = Depends(get_db)):
    """Récupère la liste des domaines uniques"""
    domains = db.query(models.Supplier.domain).distinct().all()
    return [domain[0] for domain in domains if domain[0]]

@router.get("/countries/list")
def get_countries(db: Session = Depends(get_db)):
    """Récupère la liste des pays uniques"""
    countries = db.query(models.Supplier.country).distinct().all()
    return [country[0] for country in countries if country[0]]

@router.get("/brands/list")
def get_brands(db: Session = Depends(get_db)):
    """Récupère la liste des marques uniques (produits et hardware)"""

    product_brands = db.query(models.Product.brand).distinct().all()
    product_brands = [brand[0] for brand in product_brands if brand[0]]
    

    hardware_brands = db.query(models.HardwareIT.brand).distinct().all()
    hardware_brands = [brand[0] for brand in hardware_brands if brand[0]]
    

    all_brands = list(set(product_brands + hardware_brands))
    all_brands.sort()
    
    return all_brands

@router.get("/product-brands/list")
def get_product_brands(db: Session = Depends(get_db)):
    """Récupère la liste des marques uniques des produits"""
    brands = db.query(models.Product.brand).distinct().all()
    return [brand[0] for brand in brands if brand[0]]

@router.get("/hardware-brands/list")
def get_hardware_brands(db: Session = Depends(get_db)):
    """Récupère la liste des marques uniques du hardware"""
    brands = db.query(models.HardwareIT.brand).distinct().all()
    return [brand[0] for brand in brands if brand[0]]

@router.get("/stats/brands")
def get_brands_stats(db: Session = Depends(get_db)):
    """Récupère des statistiques sur les marques (nombre de produits et d'équipements hardware par marque)"""
    # Compter les produits par marque
    product_counts = db.query(
        models.Product.brand, 
        func.count(models.Product.id).label("count")
    ).group_by(models.Product.brand).all()
    
    # Compter les équipements hardware par marque
    hardware_counts = db.query(
        models.HardwareIT.brand, 
        func.count(models.HardwareIT.id).label("count")
    ).group_by(models.HardwareIT.brand).all()
    
    # Créer un dictionnaire pour stocker les résultats
    result = {}
    
    # Ajouter les comptages de produits
    for brand, count in product_counts:
        if brand:
            if brand not in result:
                result[brand] = {"products": 0, "hardware": 0}
            result[brand]["products"] = count
    
    # Ajouter les comptages de hardware
    for brand, count in hardware_counts:
        if brand:
            if brand not in result:
                result[brand] = {"products": 0, "hardware": 0}
            result[brand]["hardware"] = count
    

    return [{"brand": brand, "products": data["products"], "hardware": data["hardware"]} for brand, data in result.items()]