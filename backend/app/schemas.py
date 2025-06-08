from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# Schémas pour les fournisseurs
class SupplierBase(BaseModel):
    company: str
    domain: Optional[str] = None
    brand: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    position: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: Optional[str] = "USD"
    rib: Optional[str] = None
    payment_terms: Optional[str] = None
    reliability: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: int

    class Config:
        orm_mode = True

# Schémas pour les produits
class ProductBase(BaseModel):
    brand: Optional[str] = None
    supplier_id: int
    pn: str
    eq_reference: str
    description: Optional[str] = None
    unit_cost: float
    currency: str = "USD"
    rate: float = 1.0
    unit_cost_mad: float
    p_margin: float = 0.0

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int

    class Config:
        orm_mode = True

# Schémas pour les éléments de bon de commande
class POItemBase(BaseModel):
    product_id: int
    qty: int = 1
    unit_cost: float
    unit_price: float
    total_price: float

class POItemCreate(POItemBase):
    pass

class POItem(POItemBase):
    id: int
    po_id: int

    class Config:
        orm_mode = True

# Schémas pour les bons de commande
class PurchaseOrderBase(BaseModel):
    po_number: str
    supplier_id: int
    date_creation: date = date.today()
    currency: str = "USD"
    rate: float = 1.0
    eta: Optional[str] = None
    shipping_cost: float = 0.0
    discount: float = 0.0
    tva: float = 0.0
    status: str = "Draft"

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[POItemCreate]

class PurchaseOrder(PurchaseOrderBase):
    id: int
    total_amount: float
    items: List[POItem] = []

    class Config:
        orm_mode = True





class SupplierResponse(BaseModel):
    id: int
    company: str
    domain: str
    brand: str
    country: str
    address: str
    position: str
    contact_name: str
    phone: str
    email: str
    currency: str
    rib: str
    payment_terms: str
    reliability: str

    class Config:
        orm_mode = True
