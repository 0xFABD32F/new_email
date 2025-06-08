from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from .. import models
from ..database import get_db
from pydantic import BaseModel, field_validator
from datetime import datetime, date
import tempfile
import os
import pandas as pd
import json
import io
import re
import logging
from ..dhl_pdf_calculator import DHLPdfCalculator
from functools import lru_cache

# Configurer le logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/devis",
    tags=["devis"],
    responses={404: {"description": "Not found"}},
)

# TAUX DE CHANGE CORRIGÉS - Mise à jour avec des taux réalistes
EXCHANGE_RATES = {
    "MAD": 1.0,
    "EUR": 10.85,   # 1 EUR = 10.85 MAD (taux réaliste)
    "USD": 10.50,   # 1 USD = 10.50 MAD (taux réaliste)
}

def convert_currency(amount_mad: float, target_currency: str) -> float:
    """Convertir un montant de MAD vers la devise cible"""
    if target_currency == "MAD":
        return amount_mad
    
    rate = EXCHANGE_RATES.get(target_currency)
    if not rate:
        raise ValueError(f"Devise non supportée: {target_currency}")
    
    # Diviser par le taux car on a 1 EUR = 10.85 MAD
    return round(amount_mad / rate, 2)

def convert_to_mad(amount: float, source_currency: str) -> float:
    """Convertir un montant vers MAD"""
    if source_currency == "MAD":
        return amount
    
    rate = EXCHANGE_RATES.get(source_currency)
    if not rate:
        raise ValueError(f"Devise non supportée: {source_currency}")
    
    # Multiplier par le taux car on a 1 EUR = 10.85 MAD
    return round(amount * rate, 2)

class DevisItemCreate(BaseModel):
    product_id: Optional[int] = None
    hardware_id: Optional[int] = None
    source_type: Optional[str] = None  
    brand: str
    pn: str  
    eq_reference: str  
    qty: int
    unit: str = "Unit"
    unit_price: float

class ShippingLeg(BaseModel):
    origin_country: str
    destination_country: str
    direction: str = "export"

class DevisShippingCreate(BaseModel):
    enabled: bool = False
    total_weight_kg: Optional[float] = None
    dimensions: Optional[str] = None  
    destination_country: Optional[str] = None
    direction: str = "export"
    premium_service: Optional[str] = None
    is_multi_leg: bool = False
    legs: Optional[List[ShippingLeg]] = None
    # AJOUT: Champs pour les coûts calculés
    shipping_cost: Optional[float] = None
    shipping_cost_mad: Optional[float] = None
    shipping_zone: Optional[int] = None
    effective_weight_kg: Optional[float] = None

class DevisCreate(BaseModel):
    reference: str
    devis_number: str
    client_id: Optional[int] = None
    company_name: str
    contact_name: str = ""
    contact_position: str = ""
    email: str = ""
    phone: str = ""
    country: str = ""
    project: str = ""
    sector_field: str = ""
    currency: str = "USD"
    eta: str = ""
    comment: str = ""
    items: List[DevisItemCreate] = []
    shipping: Optional[DevisShippingCreate] = None

class DevisItemResponse(BaseModel):
    id: int
    product_id: Optional[int] = None
    hardware_id: Optional[int] = None
    source_type: Optional[str] = None
    brand: str
    pn: str  
    eq_reference: str  
    qty: int
    unit: str = "Unit"
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True

class DevisShippingResponse(BaseModel):
    id: int
    enabled: bool
    total_weight_kg: Optional[float] = None
    dimensions: Optional[str] = None
    destination_country: Optional[str] = None
    direction: str = "export"
    premium_service: Optional[str] = None
    is_multi_leg: bool = False
    legs_data: Optional[str] = None
    shipping_cost: float = 0.0
    shipping_cost_mad: float = 0.0  
    shipping_zone: Optional[int] = None
    effective_weight_kg: Optional[float] = None
    calculated_at: Optional[datetime] = None

    @field_validator('shipping_cost', 'shipping_cost_mad', mode='before')
    @classmethod
    def handle_none_values(cls, value):
        return value if value is not None else 0.0

    class Config:
        from_attributes = True

class DevisResponse(BaseModel):
    id: int
    reference: str
    devis_number: str
    date_creation: Optional[date] = None  
    client_id: Optional[int]
    company_name: str
    contact_name: str
    contact_position: str
    email: str
    phone: str
    country: str
    project: str
    sector_field: str
    currency: str
    total_amount: float
    status: str
    eta: Optional[str] = ""
    comment: Optional[str] = ""
    items: List[DevisItemResponse] = []
    shipping_info: Optional[DevisShippingResponse] = None

    @field_validator('comment', mode='before')
    @classmethod
    def validate_comment(cls, v):
        return v if v is not None else ""

    class Config:
        from_attributes = True

# ===== FONCTIONS D'IMPORTATION RÉUTILISÉES DEPUIS HARDWARE =====

def extract_devis_info(df) -> dict:
    """Extraire les informations du devis à partir du fichier Excel."""
    devis_info = {
        "devis_number": None,
        "client": None,
        "date_creation": datetime.now().date(),
        "total_amount": 0.0,
    }
    
    # Essayer de trouver l'ID du devis et le client
    for i in range(min(30, len(df))):
        row = df.iloc[i]
        for col in df.columns:
            cell_value = str(row.get(col, ""))
            
            # Recherche plus flexible pour l'ID du devis
            if any(keyword in cell_value.lower() for keyword in ["quote", "devis", "quotation", "id", "ref"]):
                # Essayer d'extraire un numéro
                numbers = re.findall(r'\d+', cell_value)
                if numbers:
                    devis_info["devis_number"] = numbers[0]
                    logger.info(f"ID de devis trouvé: {devis_info['devis_number']}")
            
            # Recherche plus flexible pour le client
            if any(keyword in cell_value.lower() for keyword in ["customer", "client", "end user", "end-user"]):
                # Chercher le nom du client dans les prochaines lignes
                for j in range(i+1, min(i+5, len(df))):
                    next_row = df.iloc[j]
                    client_cell = next_row.get(col, "")
                    if client_cell and not pd.isna(client_cell) and len(str(client_cell).strip()) > 2:
                        devis_info["client"] = str(client_cell).strip()
                        logger.info(f"Client trouvé: {devis_info['client']}")
                        break
    
    # Si aucun numéro de devis n'est trouvé, générer un numéro automatique
    if not devis_info["devis_number"]:
        devis_info["devis_number"] = f"DEV-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        logger.info(f"Aucun ID de devis trouvé, génération automatique: {devis_info['devis_number']}")
    
    # Si aucun client n'est trouvé, utiliser un nom par défaut
    if not devis_info["client"]:
        devis_info["client"] = "Client non spécifié"
        logger.info("Aucun client trouvé, utilisation du nom par défaut")
    
    return devis_info

def parse_excel_generic(df) -> dict:
    """Analyser un fichier Excel générique et extraire les éléments matériels."""
    items = []
    devis_info = extract_devis_info(df)
    
    # Afficher les premières lignes pour le débogage
    logger.info(f"Premières lignes du DataFrame:\n{df.head(10)}")
    logger.info(f"Colonnes du DataFrame: {df.columns.tolist()}")
    
    # Recherche plus flexible des données d'équipement
    # Essayer de trouver les colonnes pertinentes
    column_mapping = {}
    potential_headers = {
        "item_number": ["item", "line", "no", "number", "#"],
        "pn": ["part number", "pn", "reference", "ref", "product code", "code"],
        "description": ["description", "desc", "product", "item", "designation"],
        "qty": ["quantity", "qty", "qté", "quantité", "amount"],
        "unit_cost": ["price", "cost", "unit price", "unit cost", "prix"]
    }
    
    # Chercher les en-têtes de colonnes
    header_row_idx = None
    for i in range(min(20, len(df))):
        row = df.iloc[i]
        matches = 0
        for key, keywords in potential_headers.items():
            for col_idx, col_name in enumerate(df.columns):
                cell_value = str(row.get(col_name, "")).lower()
                if any(keyword in cell_value for keyword in keywords):
                    column_mapping[key] = col_name
                    matches += 1
                    break
        
        if matches >= 3:  # Si on trouve au moins 3 colonnes pertinentes
            header_row_idx = i
            logger.info(f"En-tête trouvé à la ligne {i+1} avec {matches} colonnes correspondantes")
            break
    
    # Si on n'a pas trouvé d'en-tête, essayer d'utiliser les noms de colonnes directement
    if not header_row_idx and len(df.columns) >= 3:
        for key, keywords in potential_headers.items():
            for col_name in df.columns:
                col_str = str(col_name).lower()
                if any(keyword in col_str for keyword in keywords):
                    column_mapping[key] = col_name
                    break
        
        logger.info(f"Utilisation des noms de colonnes directement: {column_mapping}")
    
    # Si on a trouvé des colonnes pertinentes, extraire les données
    if column_mapping:
        logger.info(f"Colonnes identifiées: {column_mapping}")
        
        # Déterminer la ligne de début des données
        start_row = header_row_idx + 1 if header_row_idx is not None else 0
        
        # Parcourir les lignes pour extraire les données
        for i in range(start_row, len(df)):
            row = df.iloc[i]
            
            # Vérifier si la ligne contient des données valides
            has_data = False
            for key, col in column_mapping.items():
                if not pd.isna(row.get(col, "")):
                    has_data = True
                    break
            
            if not has_data:
                continue
            
            # Extraire les données
            pn = ""
            description = ""
            qty = 0
            unit_cost = 0
            
            if "pn" in column_mapping:
                pn_value = row.get(column_mapping["pn"], "")
                if not pd.isna(pn_value):
                    pn = str(pn_value).strip()
            
            if "description" in column_mapping:
                desc_value = row.get(column_mapping["description"], "")
                if not pd.isna(desc_value):
                    description = str(desc_value).strip()
            
            if "qty" in column_mapping:
                qty_value = row.get(column_mapping["qty"], 0)
                if not pd.isna(qty_value):
                    try:
                        qty = int(float(qty_value))
                    except (ValueError, TypeError):
                        qty = 0
            
            if "unit_cost" in column_mapping:
                cost_value = row.get(column_mapping["unit_cost"], 0)
                if not pd.isna(cost_value):
                    try:
                        unit_cost = float(cost_value)
                    except (ValueError, TypeError):
                        unit_cost = 0
            
            # Si on a au moins un PN et une quantité, ajouter l'élément
            if pn and qty > 0:
                item = {
                    "brand": "Cisco",  # Par défaut
                    "pn": pn,
                    "eq_reference": description or pn,
                    "qty": qty,
                    "unit_price": unit_cost,
                    "currency": "USD"  # Par défaut
                }
                items.append(item)
                logger.info(f"Élément trouvé: {item}")
    
    return {
        "devis_number": devis_info["devis_number"],
        "client": devis_info["client"],
        "items": items
    }

def extract_pdf_text(pdf_content) -> str:
    """Extraire le texte d'un fichier PDF."""
    try:
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        
        # Extraire le texte de chaque page
        text = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += page.extract_text() + "\n\n"
        
        logger.info(f"Texte extrait du PDF ({len(text)} caractères)")
        return text
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction du texte PDF: {str(e)}", exc_info=True)
        return ""

def parse_cisco_quote_pdf(text) -> dict:
    """Analyser spécifiquement un devis Cisco au format PDF."""
    items = []
    devis_info = {
        "devis_number": None,
        "client": None,
        "project": None,
        "date_creation": datetime.now().date(),
        "total_amount": 0.0,
    }
    
    # Extraire les informations du devis
    quote_id_match = re.search(r'Quote ID\s*:\s*(\d+)', text)
    if quote_id_match:
        devis_info["devis_number"] = quote_id_match.group(1)
        logger.info(f"Numéro de devis Cisco trouvé: {devis_info['devis_number']}")
    
    # Extraire le nom du client
    client_match = re.search(r'End Customer\s*:\s*\n([A-Z\s]+)', text)
    if client_match:
        devis_info["client"] = client_match.group(1).strip()
        logger.info(f"Client trouvé: {devis_info['client']}")
    
    # Extraire le nom du projet
    project_match = re.search(r'Quote Name\s*:\s*([^\n]+)', text)
    if project_match:
        devis_info["project"] = project_match.group(1).strip()
        logger.info(f"Projet trouvé: {devis_info['project']}")
    
    # Extraire les éléments matériels avec pattern amélioré
    item_pattern = r'(\d+\.\d+)\s+([A-Z0-9\-/]+)\s+.*?([0-9,.]+)?\s+(\d+)\s+([0-9,.]+)?'
    item_matches = re.finditer(item_pattern, text)
    
    for match in item_matches:
        item_number, pn, unit_price_str, qty_str, extended_price_str = match.groups()
        
        pn = pn.strip()
        qty = int(qty_str) if qty_str else 1
        
        unit_price = 0.0
        if unit_price_str:
            unit_price_str = unit_price_str.replace(',', '')
            try:
                unit_price = float(unit_price_str)
            except ValueError:
                unit_price = 0.0
        
        # Chercher la description
        description_pattern = f"{re.escape(pn)}[^A-Z0-9\n]*\n([^\n]+)"
        description_match = re.search(description_pattern, text)
        description = description_match.group(1).strip() if description_match else pn
        
        if unit_price > 0 and qty > 0:
            item = {
                "brand": "Cisco",
                "pn": pn,
                "eq_reference": description,
                "qty": qty,
                "unit_price": unit_price,
                "currency": "USD"
            }
            items.append(item)
            logger.info(f"Élément Cisco trouvé: {item}")
    
    return {
        "devis_number": devis_info["devis_number"] or f"CISCO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "client": devis_info["client"] or "Client non spécifié",
        "project": devis_info["project"],
        "items": items
    }

def parse_pdf_content(pdf_content) -> dict:
    """Analyser le contenu d'un PDF et extraire les éléments matériels."""
    text = extract_pdf_text(pdf_content)
    
    # Vérifier si c'est un devis Cisco
    if "Price Quotation" in text and "Cisco" in text:
        logger.info("Détection d'un devis Cisco, utilisation du parser spécialisé")
        cisco_result = parse_cisco_quote_pdf(text)
        if cisco_result["items"]:
            return cisco_result
    
    # Fallback pour autres types de PDF
    devis_info = {
        "devis_number": f"PDF-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "client": "Client non spécifié",
        "items": []
    }
    
    # Recherche basique dans le texte
    lines = text.split('\n')
    for line in lines:
        # Chercher des lignes qui pourraient contenir des produits
        if re.search(r'[A-Z0-9][\w\-]{4,}', line) and re.search(r'\d+', line):
            # Extraire les informations basiques
            pn_match = re.search(r'([A-Z0-9][\w\-]{4,})', line)
            qty_match = re.search(r'\b(\d+)\b', line)
            price_match = re.search(r'(\d+(?:\.\d+)?)', line)
            
            if pn_match and qty_match:
                item = {
                    "brand": "Cisco",
                    "pn": pn_match.group(1),
                    "eq_reference": line.strip()[:50],  # Description limitée
                    "qty": int(qty_match.group(1)),
                    "unit_price": float(price_match.group(1)) if price_match else 0,
                    "currency": "USD"
                }
                devis_info["items"].append(item)
    
    return devis_info

def process_file(file_content, file_extension):
    """Traiter le contenu du fichier en fonction de son extension."""
    if file_extension in ('.xlsx', '.xls'):
        df = pd.read_excel(io.BytesIO(file_content))
        return parse_excel_generic(df)
    elif file_extension == '.pdf':
        return parse_pdf_content(file_content)
    else:
        raise ValueError(f"Format de fichier non pris en charge: {file_extension}")

# Cache pour les données statiques
@lru_cache(maxsize=1)
def get_shipping_countries():
    """Récupérer la liste des pays disponibles pour le shipping avec cache."""
    try:
        calculator = DHLPdfCalculator()
        countries = set(calculator.export_zones.keys()).union(set(calculator.import_zones.keys()))
        return sorted(list(countries))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des pays: {str(e)}")

@lru_cache(maxsize=1)
def get_premium_services():
    """Récupérer la liste des services premium avec cache."""
    try:
        calculator = DHLPdfCalculator()
        return {
            "premium_services": calculator.premium_services,
            "currency": "MAD"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des services premium: {str(e)}")

# Endpoint pour récupérer les taux de change
@router.get("/exchange-rates")
def get_exchange_rates():
    """Récupérer les taux de change actuels."""
    return {
        "rates": EXCHANGE_RATES,
        "base_currency": "MAD",
        "supported_currencies": list(EXCHANGE_RATES.keys())
    }

# Endpoint optimisé pour récupérer les produits et hardware combinés
@router.get("/available-items")
def get_available_items(db: Session = Depends(get_db)):
    """Récupérer tous les items disponibles (products + hardware) pour la sélection."""
    
    products = db.query(models.Product).options(selectinload(models.Product.supplier)).all()
    hardware_items = db.query(models.HardwareIT).options(selectinload(models.HardwareIT.supplier)).all()
    
    # Formater les données pour l'interface
    available_items = []
    
    # Ajouter les produits
    for product in products:
        available_items.append({
            "id": product.id,
            "type": "product",
            "brand": product.brand or "",
            "pn": product.pn or "",
            "eq_reference": product.eq_reference or "",
            "unit_price": product.unit_price if hasattr(product, 'unit_price') else (
                product.unit_cost_mad * (1 + (product.p_margin or 0) / 100) if product.unit_cost_mad else 0
            ),
            "currency": product.currency or "MAD",
            "supplier": product.supplier.company if product.supplier else "",
            "display_name": f"{product.brand or ''} - {product.pn or ''} - {product.eq_reference or ''}"
        })
    
    # Ajouter les équipements hardware
    for hardware in hardware_items:
        available_items.append({
            "id": hardware.id,
            "type": "hardware",
            "brand": hardware.brand or "",
            "pn": hardware.pn or "",
            "eq_reference": hardware.eq_reference or "",
            "unit_price": hardware.unit_price or 0,
            "currency": hardware.currency or "MAD",
            "supplier": hardware.supplier.company if hardware.supplier else "",
            "display_name": f"{hardware.brand or ''} - {hardware.pn or ''} - {hardware.eq_reference or ''}"
        })
    
    return available_items

@router.get("/shipping/countries")
def get_shipping_countries_endpoint():
    """Endpoint pour récupérer les pays avec cache."""
    return get_shipping_countries()

@router.get("/shipping/premium-services")
def get_premium_services_endpoint():
    """Endpoint pour récupérer les services premium avec cache."""
    return get_premium_services()

# ===== NOUVEAUX ENDPOINTS D'IMPORTATION POUR DEVIS =====

@router.post("/preview-file/")
async def preview_file_import(file: UploadFile = File(...)):
    """Prévisualiser les données qui seraient importées à partir d'un fichier Excel ou PDF."""
    logger.info(f"Prévisualisation du fichier: {file.filename}, content_type: {file.content_type}")
    
    # Vérifier le type de fichier
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ('.xlsx', '.xls', '.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Le fichier doit être au format Excel (.xlsx ou .xls) ou PDF (.pdf)"
        )
    
    try:
        # Lire le contenu du fichier
        contents = await file.read()
        logger.info(f"Taille du fichier lu: {len(contents)} octets")
        
        # Traiter le fichier en fonction de son extension
        parsed_data = process_file(contents, file_extension)
        logger.info(f"Analyse terminée, {len(parsed_data['items'])} éléments trouvés")
        
        return parsed_data
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse du fichier: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'analyse du fichier: {str(e)}")

@router.post("/import-file/")
async def import_file_to_devis(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importer un fichier et créer directement un devis."""
    logger.info(f"Importation du fichier vers devis: {file.filename}")
    
    # Vérifier le type de fichier
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ('.xlsx', '.xls', '.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Le fichier doit être au format Excel (.xlsx ou .xls) ou PDF (.pdf)"
        )
    
    try:
        # Lire le contenu du fichier
        contents = await file.read()
        logger.info(f"Taille du fichier lu: {len(contents)} octets")
        
        # Traiter le fichier en fonction de son extension
        parsed_data = process_file(contents, file_extension)
        logger.info(f"Analyse terminée, {len(parsed_data['items'])} éléments trouvés")
        
        # Vérifier si des éléments ont été trouvés
        if not parsed_data["items"]:
            raise HTTPException(
                status_code=400, 
                detail="Aucun équipement trouvé dans le fichier. Vérifiez que le format du fichier est correct."
            )
        
        # Créer le devis avec les informations extraites
        devis_number = parsed_data["devis_number"]
        client_name = parsed_data["client"]
        
        # Essayer de trouver le client dans la base de données
        client = None
        if parsed_data["client"] and parsed_data["client"] != "Client non spécifié":
            client = db.query(models.Client).filter(models.Client.company_name == parsed_data["client"]).first()
        
        # Calculer le montant total
        total_amount = sum(item["unit_price"] * item["qty"] for item in parsed_data["items"])
        
        # Créer le devis
        new_devis = models.DevisOddnet(
            reference=f"REF-{devis_number}",
            devis_number=devis_number,
            date_creation=datetime.now().date(),
            client_id=client.id if client else None,
            company_name=client_name,
            contact_name=client.contact_name if client else "",
            contact_position=client.contact_position if client else "",
            email=client.email if client else "",
            phone=client.phone if client else "",
            country=client.country if client else "",
            project=parsed_data.get("project", f"Importé depuis {file_extension[1:].upper()}"),
            sector_field=client.sector_field if client else "",
            currency="USD",  # Par défaut pour les imports
            total_amount=total_amount,
            status="Nouveau"
        )
        
        db.add(new_devis)
        db.flush()  # Obtenir l'ID sans commit
        
        # Créer les éléments de devis
        for item_data in parsed_data["items"]:
            devis_item = models.DevisItem(
                devis_id=new_devis.id,
                product_id=None,  # Pas de liaison directe pour les imports
                hardware_id=None,
                source_type="imported",
                brand=item_data["brand"],
                pn=item_data["pn"],
                eq_reference=item_data["eq_reference"],
                qty=item_data["qty"],
                unit="Unit",
                unit_price=item_data["unit_price"],
                total_price=item_data["unit_price"] * item_data["qty"]
            )
            db.add(devis_item)
        
        # Valider toutes les modifications
        db.commit()
        logger.info(f"Devis créé avec succès: {len(parsed_data['items'])} éléments importés")
        
        return {
            "success": True,
            "message": f"Devis créé avec succès. {len(parsed_data['items'])} éléments importés.",
            "devis_id": new_devis.id,
            "devis_number": devis_number
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la création du devis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erreur lors de la création du devis: {str(e)}")

@router.post("/import-to-client/")
async def import_to_client_devis(
    file: UploadFile = File(...), 
    client_id: int = Form(...), 
    db: Session = Depends(get_db)
):
    """Importer un fichier et créer un devis associé à un client spécifique."""
    logger.info(f"Importation vers devis pour client: {client_id}")
    
    # Vérifier que le client existe
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Vérifier le type de fichier
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ('.xlsx', '.xls', '.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Le fichier doit être au format Excel (.xlsx ou .xls) ou PDF (.pdf)"
        )
    
    try:
        # Lire le contenu du fichier
        contents = await file.read()
        parsed_data = process_file(contents, file_extension)
        
        if not parsed_data["items"]:
            raise HTTPException(
                status_code=400, 
                detail="Aucun équipement trouvé dans le fichier."
            )
        
        # Créer le devis avec les informations du client sélectionné
        devis_number = parsed_data["devis_number"]
        total_amount = sum(item["unit_price"] * item["qty"] for item in parsed_data["items"])
        
        new_devis = models.DevisOddnet(
            reference=f"REF-{devis_number}",
            devis_number=devis_number,
            date_creation=datetime.now().date(),
            client_id=client.id,
            company_name=client.company_name,
            contact_name=client.contact_name or "",
            contact_position=client.contact_position or "",
            email=client.email or "",
            phone=client.phone or "",
            country=client.country or "",
            project=parsed_data.get("project", f"Importé depuis {file_extension[1:].upper()}"),
            sector_field=client.sector_field or "",
            currency=client.currency or "USD",
            total_amount=total_amount,
            status="Nouveau"
        )
        
        db.add(new_devis)
        db.flush()
        
        # Créer les éléments de devis
        for item_data in parsed_data["items"]:
            devis_item = models.DevisItem(
                devis_id=new_devis.id,
                product_id=None,
                hardware_id=None,
                source_type="imported",
                brand=item_data["brand"],
                pn=item_data["pn"],
                eq_reference=item_data["eq_reference"],
                qty=item_data["qty"],
                unit="Unit",
                unit_price=item_data["unit_price"],
                total_price=item_data["unit_price"] * item_data["qty"]
            )
            db.add(devis_item)
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Devis créé avec succès pour {client.company_name}. {len(parsed_data['items'])} éléments importés.",
            "devis_id": new_devis.id,
            "devis_number": devis_number
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la création du devis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erreur lors de la création du devis: {str(e)}")

# ===== ENDPOINTS EXISTANTS =====

@router.post("/", response_model=DevisResponse)
def create_devis(devis: DevisCreate, db: Session = Depends(get_db)):
    # Calculer le montant total des articles
    total_amount = sum(item.unit_price * item.qty for item in devis.items)
    
    # Créer le devis
    db_devis = models.DevisOddnet(
        reference=devis.reference,
        devis_number=devis.devis_number,
        client_id=devis.client_id,
        company_name=devis.company_name,
        contact_name=devis.contact_name,
        contact_position=devis.contact_position,
        email=devis.email,
        phone=devis.phone,
        country=devis.country,
        project=devis.project,
        sector_field=devis.sector_field,
        currency=devis.currency,
        total_amount=total_amount,
        eta=devis.eta,
        comment=devis.comment
    )
    
    db.add(db_devis)
    db.flush()
    
    # Créer les articles du devis en batch
    devis_items = []
    for item in devis.items:
        db_item = models.DevisItem(
            devis_id=db_devis.id,
            product_id=item.product_id,
            hardware_id=item.hardware_id,
            source_type=item.source_type,
            brand=item.brand,
            pn=item.pn,
            eq_reference=item.eq_reference,
            qty=item.qty,
            unit=item.unit,
            unit_price=item.unit_price,
            total_price=item.unit_price * item.qty
        )
        devis_items.append(db_item)
    
    db.add_all(devis_items)
    
    # CORRECTION: Créer les informations de shipping si fournies (même si pas encore enabled)
    if devis.shipping:
        # Vérifier si on a des données de shipping significatives
        has_shipping_data = (
            devis.shipping.enabled or 
            devis.shipping.total_weight_kg or 
            devis.shipping.destination_country or
            (devis.shipping.is_multi_leg and devis.shipping.legs)
        )
        
        if has_shipping_data:
            legs_json = None
            if devis.shipping.is_multi_leg and devis.shipping.legs:
                legs_json = json.dumps([leg.dict() for leg in devis.shipping.legs])
            
            db_shipping = models.DevisShipping(
                devis_id=db_devis.id,
                enabled=devis.shipping.enabled,  # Garder la valeur originale
                total_weight_kg=devis.shipping.total_weight_kg,
                dimensions=devis.shipping.dimensions,
                destination_country=devis.shipping.destination_country or devis.country,
                direction=devis.shipping.direction,
                premium_service=devis.shipping.premium_service,
                is_multi_leg=devis.shipping.is_multi_leg,
                legs_data=legs_json,
                # AJOUT: Inclure les coûts de shipping s'ils sont présents
                shipping_cost=getattr(devis.shipping, 'shipping_cost', 0.0),
                shipping_cost_mad=getattr(devis.shipping, 'shipping_cost_mad', 0.0),
                shipping_zone=getattr(devis.shipping, 'shipping_zone', None),
                effective_weight_kg=getattr(devis.shipping, 'effective_weight_kg', None)
            )
            db.add(db_shipping)
    
    db.commit()
    db.refresh(db_devis)
    return db_devis

@router.get("/", response_model=List[DevisResponse])
def read_devis(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Optimisation: charger les relations en une seule requête
    devis = db.query(models.DevisOddnet).options(
        selectinload(models.DevisOddnet.items),
        selectinload(models.DevisOddnet.shipping_info)
    ).offset(skip).limit(limit).all()
    return devis

@router.get("/{devis_id}", response_model=DevisResponse)
def read_devis_by_id(devis_id: int, db: Session = Depends(get_db)):
    # Optimisation: charger toutes les relations nécessaires
    devis = db.query(models.DevisOddnet).options(
        selectinload(models.DevisOddnet.items),
        selectinload(models.DevisOddnet.shipping_info)
    ).filter(models.DevisOddnet.id == devis_id).first()
    
    if devis is None:
        raise HTTPException(status_code=404, detail="Devis not found")
    return devis

@router.put("/{devis_id}", response_model=DevisResponse)
def update_devis(devis_id: int, devis: DevisCreate, db: Session = Depends(get_db)):
    db_devis = db.query(models.DevisOddnet).filter(models.DevisOddnet.id == devis_id).first()
    if db_devis is None:
        raise HTTPException(status_code=404, detail="Devis not found")
    
    # Calculer le nouveau montant total
    total_amount = sum(item.unit_price * item.qty for item in devis.items)
    
    # Mettre à jour les champs du devis
    for key, value in devis.dict(exclude={"items", "shipping"}).items():
        setattr(db_devis, key, value)
    
    db_devis.total_amount = total_amount
    
    # Supprimer les anciens articles en batch
    db.query(models.DevisItem).filter(models.DevisItem.devis_id == devis_id).delete()
    
    # Créer les nouveaux articles en batch
    new_items = []
    for item in devis.items:
        db_item = models.DevisItem(
            devis_id=db_devis.id,
            product_id=item.product_id,
            hardware_id=item.hardware_id,
            source_type=item.source_type,
            brand=item.brand,
            pn=item.pn,
            eq_reference=item.eq_reference,
            qty=item.qty,
            unit=item.unit,
            unit_price=item.unit_price,
            total_price=item.unit_price * item.qty
        )
        new_items.append(db_item)
    
    db.add_all(new_items)
    
    # Gérer les informations de shipping
    existing_shipping = db.query(models.DevisShipping).filter(models.DevisShipping.devis_id == devis_id).first()
    
    if devis.shipping and devis.shipping.enabled:
        legs_json = None
        if devis.shipping.is_multi_leg and devis.shipping.legs:
            legs_json = json.dumps([leg.dict() for leg in devis.shipping.legs])
        
        if existing_shipping:
            # Mettre à jour
            existing_shipping.enabled = True
            existing_shipping.total_weight_kg = devis.shipping.total_weight_kg
            existing_shipping.dimensions = devis.shipping.dimensions
            existing_shipping.destination_country = devis.shipping.destination_country or devis.country
            existing_shipping.direction = devis.shipping.direction
            existing_shipping.premium_service = devis.shipping.premium_service
            existing_shipping.is_multi_leg = devis.shipping.is_multi_leg
            existing_shipping.legs_data = legs_json
        else:
            # Créer nouveau
            db_shipping = models.DevisShipping(
                devis_id=db_devis.id,
                enabled=True,
                total_weight_kg=devis.shipping.total_weight_kg,
                dimensions=devis.shipping.dimensions,
                destination_country=devis.shipping.destination_country or devis.country,
                direction=devis.shipping.direction,
                premium_service=devis.shipping.premium_service,
                is_multi_leg=devis.shipping.is_multi_leg,
                legs_data=legs_json
            )
            db.add(db_shipping)
    else:
        # Désactiver le shipping
        if existing_shipping:
            existing_shipping.enabled = False
    
    db.commit()
    db.refresh(db_devis)
    return db_devis

@router.post("/{devis_id}/calculate-shipping")
def calculate_shipping_for_devis(
    devis_id: int, 
    shipping_request: dict, 
    db: Session = Depends(get_db)
):
    """Calculer les frais de transport pour l'ensemble du devis avec conversion de devise CORRIGÉE."""
    print(f"=== CALCUL SHIPPING POUR DEVIS {devis_id} ===")
    print(f"Requête: {shipping_request}")
    
    # Récupérer le devis
    devis = db.query(models.DevisOddnet).filter(models.DevisOddnet.id == devis_id).first()
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    print(f"Devis trouvé - Devise: {devis.currency}")
    
    # Vérifier que le poids est fourni et le convertir en float
    weight_kg_raw = shipping_request.get("total_weight_kg")
    if not weight_kg_raw:
        raise HTTPException(
            status_code=400, 
            detail="Le poids total doit être fourni."
        )
    
    try:
        weight_kg = float(weight_kg_raw)
        if weight_kg <= 0:
            raise ValueError("Le poids doit être supérieur à 0")
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400, 
            detail="Le poids total doit être un nombre valide supérieur à 0."
        )
    
    try:
        # Utiliser le calculateur DHL
        calculator = DHLPdfCalculator()
        
        # Calculer le poids effectif si les dimensions sont fournies
        effective_weight = weight_kg
        if shipping_request.get("dimensions"):
            dims = calculator.parse_dimensions(shipping_request["dimensions"])
            if dims:
                length, width, height = dims
                effective_weight = calculator.get_effective_weight(weight_kg, length, width, height)
                print(f"Poids effectif avec dimensions: {effective_weight}kg")
        
        # Calculer les frais de transport en MAD (base DHL)
        if shipping_request.get("is_multi_leg") and shipping_request.get("legs"):
            print("=== CALCUL MULTI-ÉTAPES ===")
            # Transport multi-étapes
            legs = shipping_request["legs"]
            
            # Utiliser la fonction multi-étapes du calculateur
            result = calculator.calculate_multi_leg_shipping(
                legs=legs,
                weight_kg=effective_weight,
                dimensions=calculator.parse_dimensions(shipping_request.get("dimensions")) if shipping_request.get("dimensions") else None,
                premium_service=shipping_request.get("premium_service")
            )
            
            total_shipping_cost_mad = result["total_cost"]
            print(f"Coût multi-étapes calculé: {total_shipping_cost_mad} MAD")
            
        else:
            print("=== CALCUL SIMPLE ===")
            # Transport simple
            total_shipping_cost_mad = calculator.calculate_shipping_cost(
                weight_kg=effective_weight,
                country=shipping_request["destination_country"],
                direction=shipping_request.get("direction", "export"),
                premium_service=shipping_request.get("premium_service")
            )
            print(f"Coût simple calculé: {total_shipping_cost_mad} MAD")
        
        # Convertir les frais de transport selon la devise du devis
        shipping_cost_converted = convert_currency(total_shipping_cost_mad, devis.currency)
        print(f"Coût converti en {devis.currency}: {shipping_cost_converted}")
        
        # Déterminer la zone DHL
        zone = calculator.get_zone_for_country(
            shipping_request["destination_country"], 
            shipping_request.get("direction", "export")
        )
        
        # Calculer le montant total avec transport
        total_with_shipping = devis.total_amount + shipping_cost_converted
        
        # Mettre à jour ou créer les informations de shipping
        shipping_info = db.query(models.DevisShipping).filter(models.DevisShipping.devis_id == devis_id).first()
        
        if shipping_info:
            shipping_info.enabled = True
            shipping_info.total_weight_kg = weight_kg
            shipping_info.dimensions = shipping_request.get("dimensions")
            shipping_info.destination_country = shipping_request["destination_country"]
            shipping_info.direction = shipping_request.get("direction", "export")
            shipping_info.premium_service = shipping_request.get("premium_service")
            shipping_info.shipping_cost = shipping_cost_converted  # Coût converti
            shipping_info.shipping_cost_mad = total_shipping_cost_mad  # Coût original en MAD
            shipping_info.shipping_zone = zone if isinstance(zone, int) else None
            shipping_info.effective_weight_kg = effective_weight
            shipping_info.calculated_at = datetime.now()
            shipping_info.is_multi_leg = shipping_request.get("is_multi_leg", False)
            if shipping_request.get("is_multi_leg") and shipping_request.get("legs"):
                shipping_info.legs_data = json.dumps(shipping_request["legs"])
        else:
            shipping_info = models.DevisShipping(
                devis_id=devis_id,
                enabled=True,
                total_weight_kg=weight_kg,
                dimensions=shipping_request.get("dimensions"),
                destination_country=shipping_request["destination_country"],
                direction=shipping_request.get("direction", "export"),
                premium_service=shipping_request.get("premium_service"),
                shipping_cost=shipping_cost_converted,  # Coût converti
                shipping_cost_mad=total_shipping_cost_mad,  # Coût original en MAD
                shipping_zone=zone if isinstance(zone, int) else None,
                effective_weight_kg=effective_weight,
                calculated_at=datetime.now(),
                is_multi_leg=shipping_request.get("is_multi_leg", False),
                legs_data=json.dumps(shipping_request["legs"]) if shipping_request.get("is_multi_leg") and shipping_request.get("legs") else None
            )
            db.add(shipping_info)
        
        db.commit()
        
        response = {
            "total_weight": weight_kg,
            "effective_weight": effective_weight,
            "destination_country": shipping_request["destination_country"],
            "zone": zone,
            "direction": shipping_request.get("direction", "export"),
            "premium_service": shipping_request.get("premium_service"),
            "shipping_cost": shipping_cost_converted,
            "shipping_cost_mad": total_shipping_cost_mad,
            "currency": devis.currency,
            "exchange_rate": EXCHANGE_RATES.get(devis.currency, 1.0),
            "total_amount_with_shipping": total_with_shipping,
            "is_multi_leg": shipping_request.get("is_multi_leg", False)
        }
        
        print(f"=== RÉPONSE FINALE ===")
        print(f"Coût shipping: {shipping_cost_converted} {devis.currency}")
        print(f"Coût original: {total_shipping_cost_mad} MAD")
        
        return response
        
    except Exception as e:
        print(f"ERREUR: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur lors du calcul des frais de transport: {str(e)}")

@router.delete("/{devis_id}")
def delete_devis(devis_id: int, db: Session = Depends(get_db)):
    db_devis = db.query(models.DevisOddnet).filter(models.DevisOddnet.id == devis_id).first()
    if db_devis is None:
        raise HTTPException(status_code=404, detail="Devis not found")
    
    # Supprimer les articles et shipping associés (cascade)
    db.delete(db_devis)
    db.commit()
    return {"message": "Devis deleted successfully"}
