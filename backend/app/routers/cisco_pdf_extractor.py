from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import re
import io
import PyPDF2
import logging
from ..database import get_db
from .. import models

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/cisco",
    tags=["cisco"],
    responses={404: {"description": "Not found"}},
)

def extract_cisco_quote_data(pdf_content) -> Dict[str, Any]:
    """
    Fonction spécialisée pour extraire les données d'un devis Cisco au format PDF SAPO45.
    Optimisée pour le format spécifique des devis Cisco.
    """
    try:
        # Créer un lecteur PDF à partir du contenu binaire
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        
        # Extraire le texte de toutes les pages
        text = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += page.extract_text() + "\n\n"
        
        # Initialiser les données à extraire
        quote_data = {
            "quote_id": None,
            "deal_id": None,
            "deal_name": None,
            "client_name": None,
            "contact_name": None,
            "contact_email": None,
            "items": []
        }
        
        # Extraire les informations de base du devis
        quote_id_match = re.search(r'Quote ID\s*:\s*(\d+)', text)
        if quote_id_match:
            quote_data["quote_id"] = quote_id_match.group(1)
            logger.info(f"Quote ID trouvé: {quote_data['quote_id']}")
        
        # Extraire Deal ID
        deal_id_match = re.search(r'Deal ID\s*:\s*(\d+)', text)
        if deal_id_match:
            quote_data["deal_id"] = deal_id_match.group(1)
            logger.info(f"Deal ID trouvé: {quote_data['deal_id']}")
        
        # Extraire Deal Name
        deal_name_match = re.search(r'Quote Name\s*:\s*([^\n]+)', text)
        if deal_name_match:
            quote_data["deal_name"] = deal_name_match.group(1).strip()
            logger.info(f"Deal Name trouvé: {quote_data['deal_name']}")
        
        # Extraire le nom du client
        client_match = re.search(r'End Customer\s*:\s*\n([A-Z\s]+)', text)
        if client_match:
            quote_data["client_name"] = client_match.group(1).strip()
            logger.info(f"Client trouvé: {quote_data['client_name']}")
        
        # Extraire le contact
        contact_match = re.search(r'Contact Details:\s*\n([^\n]+)', text)
        if contact_match:
            quote_data["contact_name"] = contact_match.group(1).strip()
            logger.info(f"Contact trouvé: {quote_data['contact_name']}")
        
        # Extraire l'email
        email_match = re.search(r'Email:\s*([^\n]+@[^\n]+)', text)
        if email_match:
            quote_data["contact_email"] = email_match.group(1).strip()
            logger.info(f"Email trouvé: {quote_data['contact_email']}")
        
        # Extraire les éléments du devis - Approche optimisée pour SAPO45
        # Format typique: "#01 C9300X-24Y-A Catalyst 9300X 24x25G Fiber Ports, modular uplink Switch 2 $ 16,526.00 33,052.00"
        item_pattern = r'#(\d+)\s+([A-Z0-9\-/]+)\s+([^\n]+?)\s+(\d+)\s+\$\s+([0-9,.]+)\s+([0-9,.]+)'
        item_matches = re.finditer(item_pattern, text)
        
        for match in item_matches:
            ref_num, pn, description, qty_str, unit_price_str, total_price_str = match.groups()
            
            # Nettoyer et convertir les valeurs
            pn = pn.strip()
            description = description.strip()
            qty = int(qty_str)
            
            # Convertir les prix en nombres flottants
            unit_price = float(unit_price_str.replace(',', ''))
            total_price = float(total_price_str.replace(',', ''))
            
            # Ajouter l'élément à la liste
            item = {
                "reference": f"#{ref_num}",
                "brand": "Cisco",
                "pn": pn,
                "eq_reference": description,
                "qty": qty,
                "unit_cost": unit_price,
                "total_cost": total_price,
                "currency": "USD"
            }
            quote_data["items"].append(item)
            logger.info(f"Élément trouvé: {pn} - {qty} x {unit_price}")
        
        # Si aucun élément n'a été trouvé, essayer une approche alternative
        if not quote_data["items"]:
            logger.info("Utilisation d'une approche alternative pour extraire les éléments")
            
            # Rechercher les lignes contenant des références et des prix
            lines = text.split('\n')
            current_ref = None
            current_pn = None
            current_desc = None
            
            for i, line in enumerate(lines):
                # Chercher les lignes qui commencent par "#xx"
                ref_match = re.match(r'^#(\d+)', line)
                if ref_match:
                    # Nouvelle référence trouvée, traiter la ligne
                    parts = line.split()
                    if len(parts) >= 3:
                        current_ref = parts[0]
                        current_pn = parts[1]
                        
                        # Extraire la description (peut être sur plusieurs lignes)
                        desc_start_idx = line.find(current_pn) + len(current_pn)
                        remaining = line[desc_start_idx:].strip()
                        
                        # Chercher la quantité et le prix à la fin
                        qty_price_match = re.search(r'(\d+)\s+\$\s+([0-9,.]+)\s+([0-9,.]+)$', remaining)
                        if qty_price_match:
                            qty = int(qty_price_match.group(1))
                            unit_price = float(qty_price_match.group(2).replace(',', ''))
                            total_price = float(qty_price_match.group(3).replace(',', ''))
                            
                            # Extraire la description (tout ce qui est entre le PN et la quantité)
                            desc_end_idx = remaining.rfind(qty_price_match.group(0))
                            description = remaining[:desc_end_idx].strip()
                            
                            item = {
                                "reference": current_ref,
                                "brand": "Cisco",
                                "pn": current_pn,
                                "eq_reference": description,
                                "qty": qty,
                                "unit_cost": unit_price,
                                "total_cost": total_price,
                                "currency": "USD"
                            }
                            quote_data["items"].append(item)
                            logger.info(f"Élément trouvé (alt): {current_pn} - {qty} x {unit_price}")
        
        # Extraire les totaux
        subtotal_match = re.search(r'SubTotal - EXW\s*:\s*\$\s*([0-9,.]+)', text)
        if subtotal_match:
            quote_data["subtotal"] = float(subtotal_match.group(1).replace(',', ''))
            logger.info(f"Sous-total trouvé: {quote_data['subtotal']}")
        
        handling_match = re.search(r'Handling Cost[^\$]+\$\s*([0-9,.]+)', text)
        if handling_match:
            quote_data["handling_cost"] = float(handling_match.group(1).replace(',', ''))
            logger.info(f"Frais de manutention trouvés: {quote_data['handling_cost']}")
        
        total_match = re.search(r'Total DDP[^:]+:\s*\$\s*([0-9,.]+)', text)
        if total_match:
            quote_data["total"] = float(total_match.group(1).replace(',', ''))
            logger.info(f"Total trouvé: {quote_data['total']}")
        
        # Extraire le pays de destination
        country_match = re.search(r'Total DDP-([A-Z]+):', text)
        if country_match:
            quote_data["destination_country"] = country_match.group(1)
            logger.info(f"Pays de destination trouvé: {quote_data['destination_country']}")
        
        return quote_data
        
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction des données du PDF Cisco: {str(e)}", exc_info=True)
        raise ValueError(f"Erreur lors de l'extraction des données: {str(e)}")

@router.post("/extract-quote")
async def extract_cisco_quote(file: UploadFile = File(...)):
    """
    Endpoint pour extraire les données d'un devis Cisco au format PDF.
    Retourne les données structurées pour créer un devis ODDnet.
    """
    try:
        # Vérifier le type de fichier
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Le fichier doit être au format PDF")
        
        # Lire le contenu du fichier
        contents = await file.read()
        
        # Extraire les données du PDF
        quote_data = extract_cisco_quote_data(contents)
        
        return {
            "success": True,
            "data": quote_data
        }
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction du devis Cisco: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'extraction: {str(e)}")

@router.post("/create-devis")
async def create_devis_from_cisco(file: UploadFile = File(...), client_id: int = None, db: Session = Depends(get_db)):
    """
    Endpoint pour créer un devis ODDnet à partir d'un devis Cisco PDF.
    """
    try:
        # Vérifier le type de fichier
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Le fichier doit être au format PDF")
        
        # Lire le contenu du fichier
        contents = await file.read()
        
        # Extraire les données du PDF
        quote_data = extract_cisco_quote_data(contents)
        
        # Vérifier si des éléments ont été trouvés
        if not quote_data["items"]:
            raise HTTPException(
                status_code=400, 
                detail="Aucun équipement trouvé dans le fichier. Vérifiez que le format du fichier est correct."
            )
        
        # Trouver le client dans la base de données si client_id est fourni
        client = None
        if client_id:
            client = db.query(models.Client).filter(models.Client.id == client_id).first()
            if not client:
                raise HTTPException(status_code=404, detail="Client non trouvé")
        else:
            # Essayer de trouver le client par son nom
            if quote_data["client_name"]:
                client = db.query(models.Client).filter(
                    models.Client.company_name.ilike(f"%{quote_data['client_name']}%")
                ).first()
        
        # Créer le devis
        new_devis = models.DevisOddnet(
            reference=f"CISCO-{quote_data['deal_id'] or quote_data['quote_id']}",
            devis_number=quote_data["quote_id"] or f"CISCO-{quote_data['deal_id']}",
            date_creation=datetime.now().date(),
            client_id=client.id if client else None,
            company_name=client.company_name if client else quote_data["client_name"] or "Client non spécifié",
            contact_name=client.contact_name if client else quote_data["contact_name"] or "",
            contact_position=client.contact_position if client else "",
            email=client.email if client else quote_data["contact_email"] or "",
            phone=client.phone if client else "",
            country=client.country if client else quote_data.get("destination_country", ""),
            project=quote_data["deal_name"] or f"Devis Cisco {quote_data['quote_id']}",
            sector_field=client.sector_field if client else "",
            currency="USD",
            total_amount=quote_data.get("total", sum(item["total_cost"] for item in quote_data["items"])),
            status="Nouveau",
            # Nouveaux champs pour traçabilité
            source_quote_id=quote_data["quote_id"],
            source_deal_id=quote_data["deal_id"],
            source_type="cisco"
        )
        
        db.add(new_devis)
        db.flush()  # Obtenir l'ID sans commit
        
        # Trouver ou créer le fournisseur Cisco
        supplier = db.query(models.Supplier).filter(models.Supplier.company == "CISCO").first()
        
        if not supplier:
            # Créer un nouveau fournisseur
            supplier = models.Supplier(
                company="CISCO",
                contact_name="",
                phone="",
                email="",
                address="",
                country="",
                currency="USD"
            )
            db.add(supplier)
            db.flush()
        
        # Créer les éléments de devis
        for item_data in quote_data["items"]:
            # Calculer les valeurs dérivées
            unit_cost = float(item_data["unit_cost"])
            rate = 10.5  # Taux de change par défaut
            unit_cost_mad = unit_cost * rate
            p_margin = 20  # Pourcentage de marge par défaut
            unit_price = unit_cost_mad * (1 + p_margin / 100)
            qty = int(item_data["qty"])
            total_price = unit_price * qty
            
            # Créer l'élément de devis
            devis_item = models.DevisItem(
                devis_id=new_devis.id,
                source_type="cisco_pdf",
                source_line_number=item_data["reference"],
                brand=item_data["brand"],
                pn=item_data["pn"],
                eq_reference=item_data["eq_reference"],
                qty=qty,
                unit_price=unit_price,
                total_price=total_price,
                weight_kg=0.0  # À définir ultérieurement
            )
            
            db.add(devis_item)
        
        # Valider toutes les modifications
        db.commit()
        db.refresh(new_devis)
        
        return {
            "success": True,
            "message": f"Devis créé avec succès à partir du devis Cisco {quote_data['quote_id']}",
            "devis_id": new_devis.id,
            "devis_number": new_devis.devis_number
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la création du devis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erreur lors de la création du devis: {str(e)}")
