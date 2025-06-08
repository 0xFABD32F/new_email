from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import io
import re
import os
import tempfile
import logging
from .. import models
from ..database import get_db

# Configuration du logging optimisée
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hardware", tags=["hardware"], responses={404: {"description": "Not found"}})

# Configuration des dépendances
REQUIRED_PACKAGES = {
    "openpyxl": "pip install openpyxl",
    "PyPDF2": "pip install PyPDF2", 
    "tabula": "pip install tabula-py"
}

# Vérification des dépendances au démarrage
def check_dependencies():
    """Vérifier que toutes les dépendances sont installées."""
    missing_packages = []
    for package, install_cmd in REQUIRED_PACKAGES.items():
        try:
            __import__(package)
            logger.info(f"✓ {package} installé")
        except ImportError:
            logger.error(f"✗ {package} manquant - {install_cmd}")
            missing_packages.append(package)
    
    # Vérifier Java pour tabula-py
    try:
        import subprocess
        subprocess.check_output(['java', '-version'], stderr=subprocess.STDOUT)
        logger.info("✓ Java installé")
    except:
        logger.error("✗ Java manquant - requis pour tabula-py")
        missing_packages.append("java")
    
    return missing_packages

# Vérification au démarrage
missing_deps = check_dependencies()
if missing_deps:
    logger.warning(f"Dépendances manquantes: {missing_deps}")

# Constantes pour l'analyse
DEFAULT_VALUES = {
    "brand": "Cisco",
    "supplier": "SOUTHCOMP POLARIS SA", 
    "currency": "USD",
    "rate": 10.5,
    "margin": 20
}

COLUMN_PATTERNS = {
    "item_number": ["item", "line", "no", "number", "#"],
    "pn": ["part number", "pn", "reference", "ref", "product code", "code"],
    "description": ["description", "desc", "product", "item", "designation"],
    "qty": ["quantity", "qty", "qté", "quantité", "amount"],
    "unit_cost": ["price", "cost", "unit price", "unit cost", "prix"]
}

def find_or_create_product_hardware(pn: str, brand: str, description: str, supplier_id: int, db: Session) -> Dict[str, Any]:
    """Chercher ou créer un produit/hardware par part number."""
    result = {"product_id": None, "hardware_id": None, "created_new": False}
    
    # Recherche produit existant
    existing_product = db.query(models.Product).filter(
        models.Product.pn == pn, models.Product.brand == brand
    ).first()
    
    if existing_product:
        result["product_id"] = existing_product.id
        logger.info(f"Produit trouvé: {pn} (ID: {existing_product.id})")
        return result
    
    # Recherche hardware existant
    existing_hardware = db.query(models.HardwareIT).filter(
        models.HardwareIT.pn == pn, models.HardwareIT.brand == brand
    ).first()
    
    if existing_hardware:
        result["hardware_id"] = existing_hardware.id
        logger.info(f"Hardware trouvé: {pn} (ID: {existing_hardware.id})")
        return result
    
    # Création nouveau hardware si aucun trouvé
    logger.info(f"Création hardware: {pn}")
    unit_cost_mad = 0.0 * DEFAULT_VALUES["rate"]
    unit_price = unit_cost_mad * (1 + DEFAULT_VALUES["margin"] / 100)
    
    new_hardware = models.HardwareIT(
        brand=brand,
        supplier_id=supplier_id,
        country="",
        devis_number="",
        customer_id=None,
        project_reference="",
        pn=pn,
        eq_reference=description,
        qty=1,
        unit_cost=0.0,
        currency=DEFAULT_VALUES["currency"],
        shipping_discount=0.0,
        rate=DEFAULT_VALUES["rate"],
        unit_cost_mad=unit_cost_mad,
        p_margin=DEFAULT_VALUES["margin"],
        unit_price=unit_price,
        total_cost=unit_cost_mad,
        total_price=unit_price,
        status="ongoing"
    )
    
    db.add(new_hardware)
    db.flush()
    
    result["hardware_id"] = new_hardware.id
    result["created_new"] = True
    logger.info(f"Hardware créé: {pn} (ID: {new_hardware.id})")
    
    return result

def extract_devis_info(df: pd.DataFrame) -> Dict[str, Any]:
    """Extraire les informations du devis depuis le DataFrame."""
    devis_info = {
        "devis_number": None,
        "client": None,
        "date_creation": datetime.now().date(),
        "total_amount": 0.0,
    }
    
    # Recherche dans les 30 premières lignes
    for i in range(min(30, len(df))):
        row = df.iloc[i]
        for col in df.columns:
            cell_value = str(row.get(col, "")).lower()
            
            # Recherche ID devis
            if any(keyword in cell_value for keyword in ["quote", "devis", "quotation", "id", "ref"]):
                numbers = re.findall(r'\d+', cell_value)
                if numbers:
                    devis_info["devis_number"] = numbers[0]
                    logger.info(f"ID devis: {devis_info['devis_number']}")
            
            # Recherche client
            if any(keyword in cell_value for keyword in ["customer", "client", "end user", "end-user"]):
                for j in range(i+1, min(i+5, len(df))):
                    next_row = df.iloc[j]
                    client_cell = next_row.get(col, "")
                    if client_cell and not pd.isna(client_cell) and len(str(client_cell).strip()) > 2:
                        devis_info["client"] = str(client_cell).strip()
                        logger.info(f"Client: {devis_info['client']}")
                        break
    
    # Valeurs par défaut si non trouvées
    if not devis_info["devis_number"]:
        devis_info["devis_number"] = f"AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    if not devis_info["client"]:
        devis_info["client"] = "Client non spécifié"
    
    return devis_info

def find_column_mapping(df: pd.DataFrame) -> Dict[str, str]:
    """Identifier les colonnes pertinentes dans le DataFrame."""
    column_mapping = {}
    
    # Recherche dans les en-têtes
    for i in range(min(20, len(df))):
        row = df.iloc[i]
        matches = 0
        temp_mapping = {}
        
        for key, keywords in COLUMN_PATTERNS.items():
            for col_name in df.columns:
                cell_value = str(row.get(col_name, "")).lower()
                if any(keyword in cell_value for keyword in keywords):
                    temp_mapping[key] = col_name
                    matches += 1
                    break
        
        if matches >= 3:
            column_mapping = temp_mapping
            logger.info(f"En-têtes trouvés ligne {i+1}: {matches} colonnes")
            break
    
    # Recherche directe dans les noms de colonnes si pas trouvé
    if not column_mapping:
        for key, keywords in COLUMN_PATTERNS.items():
            for col_name in df.columns:
                if any(keyword in str(col_name).lower() for keyword in keywords):
                    column_mapping[key] = col_name
                    break
        logger.info(f"Colonnes directes: {column_mapping}")
    
    return column_mapping

def extract_items_from_dataframe(df: pd.DataFrame, column_mapping: Dict[str, str], start_row: int = 0) -> List[Dict[str, Any]]:
    """Extraire les items depuis le DataFrame avec le mapping des colonnes."""
    items = []
    
    for i in range(start_row, len(df)):
        row = df.iloc[i]
        
        # Vérifier si la ligne contient des données
        if not any(not pd.isna(row.get(col, "")) for col in column_mapping.values()):
            continue
        
        # Extraire les données
        item_data = {}
        
        # Part Number
        if "pn" in column_mapping:
            pn_value = row.get(column_mapping["pn"], "")
            item_data["pn"] = str(pn_value).strip() if not pd.isna(pn_value) else ""
        
        # Description
        if "description" in column_mapping:
            desc_value = row.get(column_mapping["description"], "")
            item_data["description"] = str(desc_value).strip() if not pd.isna(desc_value) else ""
        
        # Quantité
        if "qty" in column_mapping:
            qty_value = row.get(column_mapping["qty"], 0)
            try:
                item_data["qty"] = int(float(qty_value)) if not pd.isna(qty_value) else 0
            except (ValueError, TypeError):
                item_data["qty"] = 0
        
        # Prix unitaire
        if "unit_cost" in column_mapping:
            cost_value = row.get(column_mapping["unit_cost"], 0)
            try:
                item_data["unit_cost"] = float(cost_value) if not pd.isna(cost_value) else 0
            except (ValueError, TypeError):
                item_data["unit_cost"] = 0
        
        # Ajouter l'item si valide
        if item_data.get("pn") and item_data.get("qty", 0) > 0:
            item = {
                "brand": DEFAULT_VALUES["brand"],
                "supplier": DEFAULT_VALUES["supplier"],
                "pn": item_data["pn"],
                "eq_reference": item_data.get("description") or item_data["pn"],
                "qty": item_data["qty"],
                "unit_cost": item_data.get("unit_cost", 0),
                "currency": DEFAULT_VALUES["currency"]
            }
            items.append(item)
            logger.debug(f"Item extrait: {item['pn']}")
    
    return items

def parse_excel_generic(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyser un fichier Excel générique."""
    logger.info(f"Analyse DataFrame: {df.shape}")
    
    devis_info = extract_devis_info(df)
    column_mapping = find_column_mapping(df)
    
    items = []
    if column_mapping:
        # Déterminer ligne de début des données
        start_row = 0
        for i in range(min(20, len(df))):
            row = df.iloc[i]
            if any(not pd.isna(row.get(col, "")) for col in column_mapping.values()):
                start_row = i
                break
        
        items = extract_items_from_dataframe(df, column_mapping, start_row)
    
    # Méthode de fallback si aucun item trouvé
    if not items:
        logger.info("Fallback: recherche simple")
        items = extract_items_simple_method(df)
    
    logger.info(f"Items extraits: {len(items)}")
    return {
        "devis_number": devis_info["devis_number"],
        "client": devis_info["client"],
        "items": items
    }

def extract_items_simple_method(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Méthode simple d'extraction en cas d'échec de la méthode principale."""
    items = []
    
    for i in range(len(df)):
        row = df.iloc[i]
        pn = description = None
        qty = 0
        
        for col in df.columns:
            cell_value = row.get(col, "")
            if pd.isna(cell_value):
                continue
            
            cell_str = str(cell_value).strip()
            
            # Part number (format: lettres + chiffres, min 5 caractères)
            if not pn and re.match(r'^[A-Za-z0-9\-]+$', cell_str) and len(cell_str) >= 5:
                pn = cell_str
            
            # Description (texte long)
            elif not description and len(cell_str) > 10:
                description = cell_str
            
            # Quantité (nombre entier)
            elif not qty and re.match(r'^\d+$', cell_str):
                try:
                    qty = int(cell_str)
                except ValueError:
                    pass
        
        if pn and qty > 0:
            item = {
                "brand": DEFAULT_VALUES["brand"],
                "supplier": DEFAULT_VALUES["supplier"],
                "pn": pn,
                "eq_reference": description or pn,
                "qty": qty,
                "unit_cost": 0,
                "currency": DEFAULT_VALUES["currency"]
            }
            items.append(item)
    
    return items

def extract_pdf_tables(pdf_content: bytes) -> List[pd.DataFrame]:
    """Extraire les tableaux d'un PDF avec plusieurs méthodes."""
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
        temp_file.write(pdf_content)
        temp_path = temp_file.name
    
    try:
        import tabula
        logger.info("Extraction tableaux PDF")
        
        # Méthodes d'extraction par ordre de priorité
        extraction_methods = [
            {"pages": 'all', "multiple_tables": True},
            {"pages": 'all', "multiple_tables": True, "lattice": True},
            {"pages": 'all', "multiple_tables": True, "stream": True},
            {"pages": 'all', "multiple_tables": True, "guess": False, "area": [0, 0, 100, 100]}
        ]
        
        for i, method in enumerate(extraction_methods):
            try:
                tables = tabula.read_pdf(temp_path, **method)
                if tables and not all(table.empty for table in tables):
                    logger.info(f"Méthode {i+1} réussie: {len(tables)} tableaux")
                    return [table for table in tables if not table.empty]
            except Exception as e:
                logger.debug(f"Méthode {i+1} échouée: {e}")
                continue
        
        logger.warning("Aucune méthode d'extraction n'a fonctionné")
        return []
        
    except Exception as e:
        logger.error(f"Erreur extraction PDF: {e}")
        return []
    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

def extract_pdf_text(pdf_content: bytes) -> str:
    """Extraire le texte d'un PDF."""
    try:
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n\n"
        
        logger.info(f"Texte PDF extrait: {len(text)} caractères")
        return text
    except Exception as e:
        logger.error(f"Erreur extraction texte PDF: {e}")
        return ""

def parse_cisco_quote_pdf(text: str) -> Dict[str, Any]:
    """Parser spécialisé pour les devis Cisco."""
    items = []
    devis_info = {
        "devis_number": None,
        "client": None,
        "project": None,
        "date_creation": datetime.now().date(),
        "total_amount": 0.0,
    }
    
    # Extraction informations devis
    patterns = {
        "devis_number": r'Quote ID\s*:\s*(\d+)',
        "client": r'End Customer\s*:\s*\n([A-Z\s]+)',
        "project": r'Quote Name\s*:\s*([^\n]+)'
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            devis_info[key] = match.group(1).strip()
            logger.info(f"{key} trouvé: {devis_info[key]}")
    
    # Extraction éléments matériels - Pattern principal
    item_pattern = r'(\d+\.\d+)\s+([A-Z0-9\-/]+)\s+SOUTHCOM(?:[^0-9]+)([0-9,.]+)?\s+(\d+)\s+([0-9,.]+)?'
    
    for match in re.finditer(item_pattern, text):
        item_number, pn, unit_price_str, qty_str, extended_price_str = match.groups()
        
        pn = pn.strip()
        qty = int(qty_str) if qty_str else 1
        
        unit_price = 0.0
        if unit_price_str:
            try:
                unit_price = float(unit_price_str.replace(',', ''))
            except ValueError:
                unit_price = 0.0
        
        # Recherche description
        description_pattern = f"{re.escape(pn)}[^A-Z0-9\n]*\n([^\n]+)"
        description_match = re.search(description_pattern, text)
        description = description_match.group(1).strip() if description_match else pn
        
        if unit_price > 0 and qty > 0:
            item = {
                "brand": DEFAULT_VALUES["brand"],
                "supplier": DEFAULT_VALUES["supplier"],
                "pn": pn,
                "eq_reference": description,
                "qty": qty,
                "unit_cost": unit_price,
                "currency": DEFAULT_VALUES["currency"]
            }
            items.append(item)
            logger.debug(f"Item Cisco: {pn}")
    
    # Méthodes de fallback si aucun item trouvé
    if not items:
        logger.info("Fallback: recherche alternative")
        items = extract_cisco_items_fallback(text)
    
    return {
        "devis_number": devis_info["devis_number"] or f"CISCO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "client": devis_info["client"] or "Client non spécifié",
        "project": devis_info["project"],
        "items": items
    }

def extract_cisco_items_fallback(text: str) -> List[Dict[str, Any]]:
    """Méthodes de fallback pour extraction Cisco."""
    items = []
    
    # Pattern pour numéros de pièce Cisco
    pn_pattern = r'([A-Z0-9][\w\-/]{4,}(?:-[A-Z0-9]{1,5})?(?:=)?)'
    
    for match in re.finditer(pn_pattern, text):
        pn = match.group(1)
        
        if not re.match(r'^[A-Z][A-Z0-9\-]+$', pn):
            continue
        
        # Contexte autour du part number
        context = text[max(0, match.start() - 100):min(len(text), match.end() + 200)]
        
        # Extraction quantité et prix
        qty_match = re.search(r'(\d+)\s+(?:[0-9,.]+)', context)
        qty = int(qty_match.group(1)) if qty_match else 1
        
        price_match = re.search(r'([0-9,.]+)\s+\d+\s+[0-9,.]+', context)
        unit_price = 0.0
        if price_match:
            try:
                unit_price = float(price_match.group(1).replace(',', ''))
            except ValueError:
                unit_price = 0.0
        
        # Description
        desc_match = re.search(f"{re.escape(pn)}[^A-Z0-9\n]*\n([^\n]+)", context)
        description = desc_match.group(1).strip() if desc_match else pn
        
        if unit_price > 0 and qty > 0:
            item = {
                "brand": DEFAULT_VALUES["brand"],
                "supplier": DEFAULT_VALUES["supplier"],
                "pn": pn,
                "eq_reference": description,
                "qty": qty,
                "unit_cost": unit_price,
                "currency": DEFAULT_VALUES["currency"]
            }
            
            # Éviter doublons
            if not any(existing["pn"] == pn for existing in items):
                items.append(item)
    
    return items

def parse_pdf_content(pdf_content: bytes) -> Dict[str, Any]:
    """Analyser le contenu d'un PDF."""
    devis_info = {
        "devis_number": f"PDF-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "client": "Client non spécifié",
        "date_creation": datetime.now().date(),
        "total_amount": 0.0,
    }
    
    text = extract_pdf_text(pdf_content)
    
    # Détection devis Cisco
    if "Price Quotation" in text and "Cisco" in text:
        logger.info("Devis Cisco détecté")
        cisco_result = parse_cisco_quote_pdf(text)
        if cisco_result["items"]:
            return cisco_result
    
    # Extraction tableaux
    tables = extract_pdf_tables(pdf_content)
    items = []
    
    if tables:
        logger.info(f"Analyse {len(tables)} tableaux")
        for table in tables:
            if not table.empty:
                result = parse_excel_generic(table)
                items.extend(result["items"])
                
                # Mise à jour infos devis si trouvées
                if result["devis_number"] != "Client non spécifié":
                    devis_info["devis_number"] = result["devis_number"]
                if result["client"] != "Client non spécifié":
                    devis_info["client"] = result["client"]
    
    # Fallback: extraction depuis texte
    if not items:
        logger.info("Fallback: extraction texte")
        items = extract_items_from_text(text, devis_info)
    
    return {
        "devis_number": devis_info["devis_number"],
        "client": devis_info["client"],
        "items": items
    }

def extract_items_from_text(text: str, devis_info: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extraire items depuis le texte brut."""
    items = []
    
    # Recherche informations devis
    devis_matches = re.findall(r'(?:devis|quote|quotation|ref)[^\d]*(\d+)', text, re.IGNORECASE)
    if devis_matches:
        devis_info["devis_number"] = devis_matches[0]
    
    client_matches = re.findall(r'(?:client|customer|end.?user)[^\n]*?([A-Za-z][\w\s]{2,})', text, re.IGNORECASE)
    if client_matches:
        devis_info["client"] = client_matches[0].strip()
    
    # Recherche items dans les lignes
    lines = text.split('\n')
    for line in lines:
        pn_match = re.search(r'([A-Z0-9][\w\-]{4,})', line)
        qty_match = re.search(r'\b(\d+)\b', line)
        
        if pn_match and qty_match:
            pn = pn_match.group(1)
            qty = int(qty_match.group(1))
            
            desc_match = re.search(r'([A-Za-z][A-Za-z\s]{10,})', line)
            description = desc_match.group(1) if desc_match else pn
            
            price_match = re.search(r'(\d+(?:\.\d+)?)', line)
            unit_cost = float(price_match.group(1)) if price_match else 0
            
            item = {
                "brand": DEFAULT_VALUES["brand"],
                "supplier": DEFAULT_VALUES["supplier"],
                "pn": pn,
                "eq_reference": description,
                "qty": qty,
                "unit_cost": unit_cost,
                "currency": DEFAULT_VALUES["currency"]
            }
            items.append(item)
    
    return items

def process_file(file_content: bytes, file_extension: str) -> Dict[str, Any]:
    """Traiter le fichier selon son extension."""
    if file_extension in ('.xlsx', '.xls'):
        df = pd.read_excel(io.BytesIO(file_content))
        return parse_excel_generic(df)
    elif file_extension == '.pdf':
        return parse_pdf_content(file_content)
    else:
        raise ValueError(f"Format non supporté: {file_extension}")

# Routes API optimisées
@router.post("/preview-file/")
async def preview_file_import(file: UploadFile = File(...)):
    """Prévisualiser l'importation d'un fichier."""
    logger.info(f"Prévisualisation: {file.filename}")
    
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ('.xlsx', '.xls', '.pdf'):
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    try:
        contents = await file.read()
        parsed_data = process_file(contents, file_extension)
        logger.info(f"Prévisualisation réussie: {len(parsed_data['items'])} items")
        return parsed_data
    except Exception as e:
        logger.error(f"Erreur prévisualisation: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")

@router.post("/import-file/")
async def import_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Importer un fichier vers hardware."""
    logger.info(f"Import hardware: {file.filename}")
    
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ('.xlsx', '.xls', '.pdf'):
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    try:
        contents = await file.read()
        parsed_data = process_file(contents, file_extension)
        
        if not parsed_data["items"]:
            raise HTTPException(status_code=400, detail="Aucun équipement trouvé")
        
        # Création devis
        devis_number = parsed_data["devis_number"]
        client_name = parsed_data["client"]
        
        client = None
        if client_name != "Client non spécifié":
            client = db.query(models.Client).filter(
                models.Client.company_name == client_name
            ).first()
        
        new_devis = models.DevisOddnet(
            reference=f"REF-{devis_number}",
            devis_number=devis_number,
            date_creation=datetime.now().date(),
            client_id=client.id if client else None,
            company_name=client_name,
            contact_name="",
            contact_position="",
            email="",
            phone="",
            country="",
            project=parsed_data.get("project", f"Import {file_extension[1:].upper()}"),
            sector_field="",
            currency=DEFAULT_VALUES["currency"],
            total_amount=sum(item["unit_cost"] * item["qty"] for item in parsed_data["items"]),
            status="Nouveau"
        )
        
        db.add(new_devis)
        db.flush()
        
        # Fournisseur
        supplier_name = parsed_data["items"][0]["supplier"]
        supplier = db.query(models.Supplier).filter(
            models.Supplier.company == supplier_name
        ).first()
        
        if not supplier:
            supplier = models.Supplier(
                company=supplier_name,
                contact_name="",
                phone="",
                email="",
                address="",
                country="",
                currency=DEFAULT_VALUES["currency"]
            )
            db.add(supplier)
            db.flush()
        
        # Création hardware items
        for item_data in parsed_data["items"]:
            unit_cost = float(item_data["unit_cost"])
            unit_cost_mad = unit_cost * DEFAULT_VALUES["rate"]
            unit_price = unit_cost_mad * (1 + DEFAULT_VALUES["margin"] / 100)
            qty = int(item_data["qty"])
            
            hardware_item = models.HardwareIT(
                brand=item_data["brand"],
                supplier_id=supplier.id,
                country="",
                devis_number=devis_number,
                customer_id=client.id if client else None,
                project_reference=f"REF-{devis_number}",
                pn=item_data["pn"],
                eq_reference=item_data["eq_reference"],
                qty=qty,
                unit_cost=unit_cost,
                currency=item_data["currency"],
                shipping_discount=0.0,
                rate=DEFAULT_VALUES["rate"],
                unit_cost_mad=unit_cost_mad,
                p_margin=DEFAULT_VALUES["margin"],
                unit_price=unit_price,
                total_cost=unit_cost_mad * qty,
                total_price=unit_price * qty,
                status="ongoing"
            )
            
            db.add(hardware_item)
            
            devis_item = models.DevisItem(
                devis_id=new_devis.id,
                brand=item_data["brand"],
                pn=item_data["pn"],
                eq_reference=item_data["eq_reference"],
                qty=qty,
                unit_price=unit_price,
                total_price=unit_price * qty
            )
            
            db.add(devis_item)
        
        db.commit()
        logger.info(f"Import réussi: {len(parsed_data['items'])} items")
        
        return {
            "success": True,
            "message": f"Import réussi: {len(parsed_data['items'])} équipements",
            "devis_id": new_devis.id,
            "devis_number": devis_number
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur import: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")

@router.post("/import-to-devis/")
async def import_to_devis(file: UploadFile = File(...), client_id: int = Form(...), db: Session = Depends(get_db)):
    """Importer vers devis avec client spécifique."""
    logger.info(f"Import vers devis: {file.filename}, client: {client_id}")
    
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ('.xlsx', '.xls', '.pdf'):
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    try:
        contents = await file.read()
        parsed_data = process_file(contents, file_extension)
        
        if not parsed_data["items"]:
            raise HTTPException(status_code=400, detail="Aucun équipement trouvé")
        
        devis_number = parsed_data["devis_number"]
        
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
            project=parsed_data.get("project", f"Import {file_extension[1:].upper()}"),
            sector_field=client.sector_field or "",
            currency=DEFAULT_VALUES["currency"],
            total_amount=0.0,
            status="Nouveau"
        )
        
        db.add(new_devis)
        db.flush()
        
        # Fournisseur
        supplier_name = parsed_data["items"][0]["supplier"]
        supplier = db.query(models.Supplier).filter(
            models.Supplier.company == supplier_name
        ).first()
        
        if not supplier:
            supplier = models.Supplier(
                company=supplier_name,
                contact_name="",
                phone="",
                email="",
                address="",
                country="",
                currency=DEFAULT_VALUES["currency"]
            )
            db.add(supplier)
            db.flush()
        
        total_amount = 0.0
        
        # Création items devis avec auto-association
        for item_data in parsed_data["items"]:
            unit_cost = float(item_data["unit_cost"])
            unit_cost_mad = unit_cost * DEFAULT_VALUES["rate"]
            unit_price = unit_cost_mad * (1 + DEFAULT_VALUES["margin"] / 100)
            qty = int(item_data["qty"])
            total_price = unit_price * qty
            
            # Auto-association produit/hardware
            product_hardware_info = find_or_create_product_hardware(
                pn=item_data["pn"],
                brand=item_data["brand"],
                description=item_data["eq_reference"],
                supplier_id=supplier.id,
                db=db
            )
            
            devis_item = models.DevisItem(
                devis_id=new_devis.id,
                product_id=product_hardware_info["product_id"],
                hardware_id=product_hardware_info["hardware_id"],
                source_type="imported",
                brand=item_data["brand"],
                pn=item_data["pn"],
                eq_reference=item_data["eq_reference"],
                qty=qty,
                unit="Unit",
                unit_price=unit_price,
                total_price=total_price
            )
            
            db.add(devis_item)
            total_amount += total_price
        
        new_devis.total_amount = total_amount
        db.commit()
        
        logger.info(f"Devis créé: {len(parsed_data['items'])} items avec auto-association")
        
        return {
            "success": True,
            "message": f"Devis créé: {len(parsed_data['items'])} items avec part numbers automatiques",
            "devis_id": new_devis.id,
            "devis_number": devis_number
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur création devis: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur: {str(e)}")

# Routes de compatibilité
@router.post("/preview-excel/")
async def preview_excel_import(file: UploadFile = File(...)):
    """Compatibilité: prévisualisation Excel."""
    return await preview_file_import(file)

@router.post("/import-excel/")
async def import_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Compatibilité: import Excel."""
    return await import_file(file, db)
