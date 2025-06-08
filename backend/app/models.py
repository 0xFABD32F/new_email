from sqlalchemy import Column, Integer, String, Date, DateTime, Float, Text, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "oddnet"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255))
    role = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(255))
    droit_acces = Column(String(255))
    mot_de_passe = Column(String(255))


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, unique=True)
    contact_name = Column(String(255), nullable=False)
    contact_position = Column(String(255))
    phone = Column(String(50))
    email = Column(String(255), unique=True)
    country = Column(String(100))
    sector_field = Column(String(255))
    address = Column(Text)
    payment_terms = Column(Text)
    invoice_terms = Column(Text)
    currency = Column(String(20), default="MAD")
    is_zone_franche = Column(String(10), default="NO")

    # Relations
    leads = relationship("Lead", back_populates="client")
    products = relationship("Product", back_populates="customer")
    projects = relationship("Project", back_populates="client_relation")
    hardware_items = relationship("HardwareIT", back_populates="customer")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    reference_project = Column(String(255))
    country = Column(String(255))
    company_name = Column(String(255), nullable=False)
    contact_name = Column(String(255), nullable=False)
    contact_position = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    sector_field = Column(String(255), nullable=True)
    project = Column(String(255), nullable=True)
    current_step = Column(String(255), nullable=True)
    current_step_date = Column(Date, nullable=True)
    status = Column(String(20), default="Nouveau")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    # Relations
    client = relationship("Client", back_populates="leads")
    opportunities = relationship("Opportunity", back_populates="lead")


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True)
    reference_project = Column(String(255))
    country = Column(String(255))
    client_deadline = Column(String(255))
    company_name = Column(String(255))
    contact_name = Column(String(255))
    contact_position = Column(String(255))
    phone = Column(String(50))
    email = Column(String(255))
    sector_field = Column(String(255))
    project = Column(Text)  
    current_step = Column(String(255))
    current_step_date = Column(Date)
    devis_number = Column(String(255))
    montant_devis = Column(Float, default=0.0)
    lead_id = Column(Integer, ForeignKey('leads.id'))

    # Relations
    lead = relationship("Lead", back_populates="opportunities")
    items = relationship("OpportunityItem", back_populates="opportunity", cascade="all, delete-orphan")
    project_relation = relationship("Project", back_populates="opportunity", uselist=False)  

class OpportunityItem(Base):
    __tablename__ = "opportunity_items"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    description = Column(Text)
    qty = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)

    # Relations
    opportunity = relationship("Opportunity", back_populates="items")
    product = relationship("Product", back_populates="opportunity_items")
    

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String(100))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    pn = Column(String(100))
    eq_reference = Column(Text)
    description = Column(Text)
    unit_cost = Column(Float)
    currency = Column(String(10), default="USD")
    rate = Column(Float, default=1.0)
    shipping_discount = Column(Float, default=0.0)
    unit_cost_mad = Column(Float)
    p_margin = Column(Float, default=0.0)
    customer_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    devis_number = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    qty = Column(Integer, default=1, nullable=True)
    total_price = Column(Float, default=0.0, nullable=True)
    eta = Column(String(50), nullable=True)
    transit = Column(String(50), nullable=True)
    douane = Column(String(50), nullable=True)
    dimensions = Column(String, nullable=True)  
    poids_kg = Column(Float, nullable=True)  

    # Relations
    supplier = relationship("Supplier", back_populates="products")
    customer = relationship("Client", back_populates="products")
    po_items = relationship("POItem", back_populates="product")
    opportunity_items = relationship("OpportunityItem", back_populates="product")
    devis_items = relationship("DevisItem", back_populates="product")

    shipping_info = relationship("ProductShippingInfo", back_populates="product", uselist=False)


class ProductShippingInfo(Base):
    __tablename__ = "product_shipping_info"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    weight_kg = Column(Float)
    dimensions = Column(String(100), nullable=True)
    destination_country = Column(String(100))
    direction = Column(String(20))
    premium_service = Column(String(50), nullable=True)
    shipping_cost = Column(Float)
    shipping_zone = Column(Integer)
    calculated_at = Column(DateTime, default=func.now())
    is_multi_leg = Column(Boolean, default=False)
    legs_data = Column(String(255), nullable=True)

    product = relationship("Product", back_populates="shipping_info")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(255)) 
    domain = Column(String(255), nullable=True) 
    brand = Column(String(255), nullable=True) 
    contact_name = Column(String(255))
    position = Column(String(255), nullable=True)  
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    country = Column(String(100))
    currency = Column(String(10), default="USD")
    rib = Column(String(255), nullable=True)  
    payment_terms = Column(String(255), nullable=True)  
    reliability = Column(String(50), nullable=True)  

    # Relations
    products = relationship("Product", back_populates="supplier")
    hardware_items = relationship("HardwareIT", back_populates="supplier")  
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier", foreign_keys="PurchaseOrder.supplier_id")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(100), nullable=False, unique=True)
    date_creation = Column(Date, default=datetime.now().date())
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    currency = Column(String(10), default="USD")
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default="En cours")
    eta = Column(String(50), nullable=True)
    rate = Column(Float, default=1.0)  
    discount = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    tva = Column(Float, default=0.0)
    items = relationship("POItem", back_populates="purchase_order", cascade="all, delete-orphan")
    
    # Relations
    supplier = relationship("Supplier", back_populates="purchase_orders", foreign_keys=[supplier_id])


class POItem(Base):
    __tablename__ = "po_items"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    qty = Column(Integer)
    unit_cost = Column(Float)
    unit_price = Column(Float)
    total_price = Column(Float)

    # Relations
    product = relationship("Product", back_populates="po_items")
    purchase_order = relationship("PurchaseOrder", back_populates="items")  

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    client = Column(String(255), nullable=False)
    project_name = Column(String(255), nullable=False)
    po_client = Column(String(255))
    montant_po = Column(Float, default=0.0)
    devis_oddnet_final = Column(String(255))
    montant_devis_final = Column(Float, default=0.0)
    extra_cost = Column(Float, default=0.0)
    status = Column(String(50), default="En cours")
    start_date = Column(Date, default=datetime.now().date())
    end_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    opportunity = relationship("Opportunity", back_populates="project_relation")
    client_relation = relationship("Client", back_populates="projects")

class HardwareIT(Base):
    __tablename__ = "hardware_it"

    id = Column(Integer, primary_key=True, index=True)
    # Informations de base
    brand = Column(String(100))  
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))  
    country = Column(String(100), nullable=True)  
    devis_number = Column(String(100), nullable=True)  
    customer_id = Column(Integer, ForeignKey("clients.id"), nullable=True)  
    project_reference = Column(String(255), nullable=True)  
    
    pn = Column(String(100))  
    eq_reference = Column(Text)  
    qty = Column(Integer, default=1)  
    
    unit_cost = Column(Float, nullable=True) 
    currency = Column(String(10), default="USD")  
    shipping_discount = Column(Float, default=0.0) 
    rate = Column(Float, default=10.5) 
    douane = Column(String(50), nullable=True)  
    transit = Column(String(50), nullable=True)  
    
    # Champs calculés
    unit_cost_mad = Column(Float) 
    total_cost = Column(Float, nullable=True)  
    p_margin = Column(Float)  
    unit_price = Column(Float)  
    total_price = Column(Float, nullable=True)  
    
    # Informations de livraison
    eta = Column(String(50), nullable=True)  
    status = Column(String(50), nullable=True)  
    
    # Ajouter le poids pour le shipping global
    poids_kg = Column(Float, nullable=True, default=0.0)
    dimensions = Column(String(100), nullable=True)

    # Relations
    supplier = relationship("Supplier", back_populates="hardware_items")
    customer = relationship("Client", back_populates="hardware_items")
    devis_items = relationship("DevisItem", back_populates="hardware_item")

# MODÈLE MODIFIÉ : Shipping au niveau du devis avec support de conversion de devise
class DevisShipping(Base):
    __tablename__ = "devis_shipping"

    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis_oddnet.id"), unique=True)
    
    # Informations de shipping essentielles
    enabled = Column(Boolean, default=False)
    total_weight_kg = Column(Float, nullable=True)
    dimensions = Column(String(100), nullable=True)  # Format "LxlxH" en cm
    destination_country = Column(String(100), nullable=True)
    direction = Column(String(20), default="export")  # "export" ou "import"
    premium_service = Column(String(50), nullable=True)  # "Premium 9:00", "Premium 10:30", "Premium 12:00"
    
    # Support pour transport multi-étapes
    is_multi_leg = Column(Boolean, default=False)
    legs_data = Column(Text, nullable=True)  # JSON des étapes pour multi-leg
    
    # Coûts calculés - NOUVEAU: support de conversion de devise
    shipping_cost = Column(Float, default=0.0)  # Coût dans la devise du devis
    shipping_cost_mad = Column(Float, default=0.0)  # Coût original en MAD (base DHL)
    shipping_zone = Column(Integer, nullable=True)
    effective_weight_kg = Column(Float, nullable=True)  # Poids effectif (max entre réel et volumétrique)
    calculated_at = Column(DateTime, default=func.now())
    
    # Relation
    devis = relationship("DevisOddnet", back_populates="shipping_info", uselist=False)

class DevisOddnet(Base):
    __tablename__ = "devis_oddnet"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(255))
    devis_number = Column(String(255))
    date_creation = Column(Date, default=datetime.utcnow().date())  

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    company_name = Column(String(255))
    contact_name = Column(String(255))
    contact_position = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    country = Column(String(100))
    project = Column(Text)
    sector_field = Column(String(255))
    currency = Column(String(10), default="MAD")
    total_amount = Column(Float, default=0.0)
    tva = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    status = Column(String(50), default="Nouveau")
    po_client = Column(String(255), nullable=True)
    eta = Column(String(100), nullable=True)
    comment = Column(Text, nullable=True, default="")

    # Relations
    items = relationship("DevisItem", back_populates="devis", cascade="all, delete-orphan")
    shipping_info = relationship("DevisShipping", back_populates="devis", uselist=False, cascade="all, delete-orphan")

# MODÈLE COMPLET : DevisItem avec hardware_id et source_type
class DevisItem(Base):
    __tablename__ = "devis_items"

    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis_oddnet.id"))
    
    # Références optionnelles vers Product OU HardwareIT
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    hardware_id = Column(Integer, ForeignKey("hardware_it.id"), nullable=True)
    
    # Type de source pour identifier d'où viennent les données
    source_type = Column(String(20), nullable=True)  # 'product', 'hardware', 'manual'
    
    # Informations produit de base (peuvent être copiées ou saisies manuellement)
    brand = Column(String(100))
    pn = Column(String(100))  # Part Number
    eq_reference = Column(Text)  # Description
    qty = Column(Integer, default=1)
    unit = Column(String(20), default="Unit")  # Unité
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)

    # Relations
    devis = relationship("DevisOddnet", back_populates="items")
    product = relationship("Product", back_populates="devis_items")
    hardware_item = relationship("HardwareIT", back_populates="devis_items")

# Garder ShippingInfo pour la compatibilité avec les équipements individuels
class ShippingInfo(Base):
    __tablename__ = "shipping_info"

    id = Column(Integer, primary_key=True, index=True)
    hardware_id = Column(Integer, ForeignKey("hardware_it.id", ondelete="CASCADE"), nullable=False)
    weight_kg = Column(Float, nullable=False)
    dimensions = Column(String(100), nullable=True)
    destination_country = Column(String(100), nullable=False)
    direction = Column(String(20), nullable=False, default="export")
    premium_service = Column(String(50), nullable=True)
    shipping_cost = Column(Float, nullable=True)
    shipping_zone = Column(Integer, nullable=True)
    calculated_at = Column(DateTime(), server_default=func.now(), nullable=False)

    # Relation avec HardwareIT
    hardware = relationship("HardwareIT")
