from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from .. import models
from sqlalchemy import func
from ..dhl_pdf_calculator import DHLPdfCalculator
from typing import Optional, List, Dict, Any

router = APIRouter(
    prefix="/hardware",
    tags=["hardware"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models
class HardwareBase(BaseModel):
    brand: str
    supplier_id: int
    pn: str
    eq_reference: str
    unit_cost: Optional[float] = None
    currency: Optional[str] = "USD"
    rate: Optional[float] = 10.5
    unit_cost_mad: float
    p_margin: float
    shipping_discount: Optional[float] = 0.0
    transit: Optional[str] = None
    douane: Optional[str] = None
    unit_price: float
    qty: Optional[int] = 1
    eta: Optional[str] = None
    status: Optional[str] = None
    devis_number: Optional[str] = None
    project_reference: Optional[str] = None
    customer_id: Optional[int] = None
    country: Optional[str] = None
    poids_kg: Optional[float] = None
    dimensions: Optional[str] = None

class HardwareCreate(HardwareBase):
    pass

class HardwareUpdate(HardwareBase):
    pass

class Hardware(HardwareBase):
    id: int
    total_cost: Optional[float] = None
    total_price: Optional[float] = None
    
    class Config:
        orm_mode = True

class HardwareShippingRequest(BaseModel):
    hardware_id: int
    destination_country: str
    direction: str = "export"
    premium_service: Optional[str] = None

# Routes
@router.post("/", response_model=Hardware)
def create_hardware(hardware: HardwareCreate, db: Session = Depends(get_db)):
    # Check if supplier exists
    supplier = db.query(models.Supplier).filter(models.Supplier.id == hardware.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Check if customer exists if customer_id is provided
    if hardware.customer_id:
        customer = db.query(models.Client).filter(models.Client.id == hardware.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    
    # Create hardware item with calculated fields
    hardware_dict = hardware.dict()
    
    # Calculate total_cost and total_price
    unit_cost_mad = hardware_dict.get("unit_cost_mad", 0)
    qty = hardware_dict.get("qty", 1)
    unit_price = hardware_dict.get("unit_price", 0)
    
    hardware_dict["total_cost"] = unit_cost_mad * qty
    hardware_dict["total_price"] = unit_price * qty
    
    db_hardware = models.HardwareIT(**hardware_dict)
    
    db.add(db_hardware)
    db.commit()
    db.refresh(db_hardware)
    return db_hardware

@router.get("/", response_model=List[dict])
def read_hardware(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Get hardware items with supplier and customer information
    hardware_items = db.query(models.HardwareIT).offset(skip).limit(limit).all()
    
    result = []
    for item in hardware_items:
        # Convert SQLAlchemy object to dict
        item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        
        # Add supplier and customer information
        if item.supplier:
            item_dict["supplier"] = {
                "id": item.supplier.id,
                "company": item.supplier.company,
                "country": item.supplier.country
            }
        else:
            item_dict["supplier"] = None
            
        if item.customer:
            item_dict["customer"] = {
                "id": item.customer.id,
                "company_name": item.customer.company_name
            }
        else:
            item_dict["customer"] = None
            
        result.append(item_dict)
        
    return result

@router.get("/{hardware_id}", response_model=dict)
def read_hardware_by_id(hardware_id: int, db: Session = Depends(get_db)):
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if hardware is None:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    # Convert SQLAlchemy object to dict
    hardware_dict = {c.name: getattr(hardware, c.name) for c in hardware.__table__.columns}
    
    # Add supplier and customer information
    if hardware.supplier:
        hardware_dict["supplier"] = {
            "id": hardware.supplier.id,
            "company": hardware.supplier.company,
            "country": hardware.supplier.country
        }
    else:
        hardware_dict["supplier"] = None
        
    if hardware.customer:
        hardware_dict["customer"] = {
            "id": hardware.customer.id,
            "company_name": hardware.customer.company_name
        }
    else:
        hardware_dict["customer"] = None
        
    return hardware_dict

@router.put("/{hardware_id}", response_model=Hardware)
def update_hardware(hardware_id: int, hardware: HardwareUpdate, db: Session = Depends(get_db)):
    db_hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if db_hardware is None:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    # Check if supplier exists
    supplier = db.query(models.Supplier).filter(models.Supplier.id == hardware.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Check if customer exists if customer_id is provided
    if hardware.customer_id:
        customer = db.query(models.Client).filter(models.Client.id == hardware.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update hardware data
    hardware_dict = hardware.dict()
    
    # Calculate total_cost and total_price
    unit_cost_mad = hardware_dict.get("unit_cost_mad", 0)
    qty = hardware_dict.get("qty", 1)
    unit_price = hardware_dict.get("unit_price", 0)
    
    hardware_dict["total_cost"] = unit_cost_mad * qty
    hardware_dict["total_price"] = unit_price * qty
    
    for key, value in hardware_dict.items():
        setattr(db_hardware, key, value)
    
    db.commit()
    db.refresh(db_hardware)
    return db_hardware

@router.delete("/{hardware_id}")
def delete_hardware(hardware_id: int, db: Session = Depends(get_db)):
    db_hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if db_hardware is None:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    db.delete(db_hardware)
    db.commit()
    return {"message": "Hardware deleted successfully"}

@router.get("/by-supplier/{supplier_id}", response_model=List[dict])
def read_hardware_by_supplier(supplier_id: int, db: Session = Depends(get_db)):
    hardware_items = db.query(models.HardwareIT).filter(models.HardwareIT.supplier_id == supplier_id).all()
    
    result = []
    for item in hardware_items:
        # Convert SQLAlchemy object to dict
        item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        
        # Add supplier and customer information
        if item.supplier:
            item_dict["supplier"] = {
                "id": item.supplier.id,
                "company": item.supplier.company,
                "country": item.supplier.country
            }
        else:
            item_dict["supplier"] = None
            
        if item.customer:
            item_dict["customer"] = {
                "id": item.customer.id,
                "company_name": item.customer.company_name
            }
        else:
            item_dict["customer"] = None
            
        result.append(item_dict)
        
    return result

@router.get("/by-brand/{brand}", response_model=List[dict])
def read_hardware_by_brand(brand: str, db: Session = Depends(get_db)):
    hardware_items = db.query(models.HardwareIT).filter(models.HardwareIT.brand == brand).all()
    
    result = []
    for item in hardware_items:
        # Convert SQLAlchemy object to dict
        item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        
        # Add supplier and customer information
        if item.supplier:
            item_dict["supplier"] = {
                "id": item.supplier.id,
                "company": item.supplier.company,
                "country": item.supplier.country
            }
        else:
            item_dict["supplier"] = None
            
        if item.customer:
            item_dict["customer"] = {
                "id": item.customer.id,
                "company_name": item.customer.company_name
            }
        else:
            item_dict["customer"] = None
            
        result.append(item_dict)
        
    return result

@router.get("/by-customer/{customer_id}", response_model=List[dict])
def read_hardware_by_customer(customer_id: int, db: Session = Depends(get_db)):
    hardware_items = db.query(models.HardwareIT).filter(models.HardwareIT.customer_id == customer_id).all()
    
    result = []
    for item in hardware_items:
        # Convert SQLAlchemy object to dict
        item_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
        
        # Add supplier and customer information
        if item.supplier:
            item_dict["supplier"] = {
                "id": item.supplier.id,
                "company": item.supplier.company,
                "country": item.supplier.country
            }
        else:
            item_dict["supplier"] = None
            
        if item.customer:
            item_dict["customer"] = {
                "id": item.customer.id,
                "company_name": item.customer.company_name
            }
        else:
            item_dict["customer"] = None
            
        result.append(item_dict)
        
    return result

@router.get("/brands", response_model=List[str])
def get_unique_brands(db: Session = Depends(get_db)):
    brands = db.query(models.HardwareIT.brand).distinct().all()
    return [brand[0] for brand in brands if brand[0]]

@router.get("/countries", response_model=List[str])
def get_unique_countries(db: Session = Depends(get_db)):
    countries = db.query(models.HardwareIT.country).distinct().all()
    return [country[0] for country in countries if country[0]]

@router.get("/stats/by-brand")
def get_hardware_stats_by_brand(db: Session = Depends(get_db)):
    """Récupère des statistiques sur les équipements hardware par marque"""
    stats = db.query(
        models.HardwareIT.brand,
        func.count(models.HardwareIT.id).label("count"),
        func.avg(models.HardwareIT.unit_price).label("avg_price"),
        func.sum(models.HardwareIT.total_price).label("total_value")
    ).group_by(models.HardwareIT.brand).all()
    
    result = []
    for brand, count, avg_price, total_value in stats:
        if brand:
            result.append({
                "brand": brand,
                "count": count,
                "avg_price": round(avg_price, 2) if avg_price else 0,
                "total_value": round(total_value, 2) if total_value else 0
            })
    
    return result

@router.get("/stats/by-supplier")
def get_hardware_stats_by_supplier(db: Session = Depends(get_db)):
    """Récupère des statistiques sur les équipements hardware par fournisseur"""
    query = db.query(
        models.Supplier.id,
        models.Supplier.company,
        func.count(models.HardwareIT.id).label("count"),
        func.avg(models.HardwareIT.unit_price).label("avg_price"),
        func.sum(models.HardwareIT.unit_price).label("total_value")
    ).join(
        models.HardwareIT, 
        models.Supplier.id == models.HardwareIT.supplier_id
    ).group_by(
        models.Supplier.id, 
        models.Supplier.company
    ).all()
    
    result = []
    for supplier_id, company, count, avg_price, total_value in query:
        result.append({
            "supplier_id": supplier_id,
            "company": company,
            "count": count,
            "avg_price": round(avg_price, 2) if avg_price else 0,
            "total_value": round(total_value, 2) if total_value else 0
        })
    
    return result

@router.get("/generate-excel/{hardware_id}")
def generate_excel(hardware_id: int, db: Session = Depends(get_db)):
    # Cette fonction serait implémentée pour générer un fichier Excel
    # Similaire à celle des bons de commande
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if hardware is None:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    # Logique pour générer un fichier Excel
    # ...
    
    return {"message": "Excel file generated", "download_url": f"/api/hardware/download-excel/{hardware_id}"}




@router.get("/brands-by-supplier/{supplier_id}", response_model=List[str])
def get_brands_by_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Récupère la liste des marques uniques pour un fournisseur spécifique"""
    brands = db.query(models.HardwareIT.brand).filter(
        models.HardwareIT.supplier_id == supplier_id
    ).distinct().all()
    
    # Récupérer aussi les marques des produits pour ce fournisseur
    product_brands = db.query(models.Product.brand).filter(
        models.Product.supplier_id == supplier_id
    ).distinct().all()
    
    # Combiner les deux listes et supprimer les doublons
    all_brands = [brand[0] for brand in brands if brand[0]] + [brand[0] for brand in product_brands if brand[0]]
    unique_brands = list(set(all_brands))
    
    # Si le fournisseur a une marque spécifique définie, l'ajouter aussi
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if supplier and supplier.brand and supplier.brand not in unique_brands:
        unique_brands.append(supplier.brand)
    
    return sorted(unique_brands)



# Ajouter cette route
@router.post("/calculate-shipping", response_model=Dict[str, Any])
def calculate_hardware_shipping(request: HardwareShippingRequest, db: Session = Depends(get_db)):
    """
    Calcule les frais de transport pour un équipement hardware.
    """
    # Récupérer l'équipement hardware
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == request.hardware_id).first()
    if not hardware:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    try:
        # Initialiser le calculateur DHL
        dhl_calculator = DHLPdfCalculator()
        
        # Vérifier si le poids est défini
        if not hardware.poids_kg:
            raise HTTPException(status_code=400, detail="Le poids de l'équipement n'est pas défini")
        
        # Calculer le poids effectif si les dimensions sont fournies
        effective_weight = hardware.poids_kg
        if hardware.dimensions:
            dims = dhl_calculator.parse_dimensions(hardware.dimensions)
            if dims:
                length, width, height = dims
                effective_weight = dhl_calculator.get_effective_weight(hardware.poids_kg, length, width, height)
        
        # Calculer les frais de transport
        shipping_cost = dhl_calculator.calculate_shipping_cost(
            weight_kg=effective_weight,
            country=request.destination_country,
            direction=request.direction,
            premium_service=request.premium_service
        )
        
        # Obtenir la zone pour ce pays
        zone = dhl_calculator.get_zone_for_country(request.destination_country, request.direction)
        
        # Mettre à jour l'équipement avec les informations de transport
        hardware.shipping_cost = shipping_cost
        hardware.shipping_zone = zone
        hardware.shipping_direction = request.direction
        hardware.shipping_service = request.premium_service
        
        db.commit()
        
        return {
            "hardware_id": hardware.id,
            "brand": hardware.brand,
            "eq_reference": hardware.eq_reference,
            "shipping_cost": shipping_cost,
            "currency": "MAD",
            "weight_kg": hardware.poids_kg,
            "effective_weight_kg": effective_weight,
            "country": request.destination_country,
            "direction": request.direction,
            "zone": zone,
            "premium_service": request.premium_service
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Ajouter cette route pour mettre à jour les dimensions et le poids
@router.put("/{hardware_id}/update-shipping-info", response_model=Dict[str, Any])
def update_hardware_shipping_info(
    hardware_id: int, 
    poids_kg: Optional[float] = None,
    dimensions: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Met à jour les informations de poids et dimensions pour un équipement hardware.
    """
    # Récupérer l'équipement hardware
    hardware = db.query(models.HardwareIT).filter(models.HardwareIT.id == hardware_id).first()
    if not hardware:
        raise HTTPException(status_code=404, detail="Hardware not found")
    
    # Mettre à jour les informations
    if poids_kg is not None:
        hardware.poids_kg = poids_kg
    
    if dimensions is not None:
        # Valider le format des dimensions
        dhl_calculator = DHLPdfCalculator()
        if dhl_calculator.parse_dimensions(dimensions):
            hardware.dimensions = dimensions
        else:
            raise HTTPException(status_code=400, detail="Format de dimensions invalide. Utilisez le format 'LxlxH' en cm (ex: '30x20x15')")
    
    db.commit()
    db.refresh(hardware)
    
    return {
        "hardware_id": hardware.id,
        "brand": hardware.brand,
        "eq_reference": hardware.eq_reference,
        "poids_kg": hardware.poids_kg,
        "dimensions": hardware.dimensions
    }
