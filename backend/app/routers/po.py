from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import os
from datetime import datetime
import tempfile
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from ..database import get_db
from .. import models

# Définir le router - IMPORTANT: Garder le même préfixe pour maintenir la compatibilité
router = APIRouter(
    prefix="/purchase-orders",
    tags=["purchase-orders"],
    responses={404: {"description": "Not found"}},
)

# Fonction pour créer le répertoire de téléchargement s'il n'existe pas
def ensure_download_dir():
    download_dir = os.path.join(os.getcwd(), "downloads")
    if not os.path.exists(download_dir):
        os.makedirs(download_dir)
    return download_dir

# Routes pour les bons de commande
@router.get("/")
def get_purchase_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    purchase_orders = db.query(models.PurchaseOrder).offset(skip).limit(limit).all()
    
    # Convertir les objets SQLAlchemy en dictionnaires
    result = []
    for po in purchase_orders:
        supplier_data = None
        if po.supplier:
            supplier_data = {
                "id": po.supplier.id,
                "company": po.supplier.company,
                "country": po.supplier.country
            }
        
        po_dict = {
            "id": po.id,
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "supplier": supplier_data,
            "date_creation": po.date_creation.isoformat() if po.date_creation else None,
            "currency": po.currency,
            "rate": po.rate,
            "total_amount": po.total_amount,
            "status": po.status,
            "eta": po.eta,
            "shipping_cost": po.shipping_cost,
            "discount": po.discount,
            "tva": po.tva
        }
        result.append(po_dict)
    
    return result

@router.post("/")
def create_purchase_order(po_data: Dict[str, Any], db: Session = Depends(get_db)):
    # Vérifier si le fournisseur existe
    supplier = db.query(models.Supplier).filter(models.Supplier.id == po_data["supplier_id"]).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    total_amount = 0.0
    for item in po_data["items"]:
        total_amount += float(item["total_price"])
    
    if "shipping_cost" in po_data and po_data["shipping_cost"]:
        total_amount += float(po_data["shipping_cost"])
    
    # Appliquer la remise
    if "discount" in po_data and po_data["discount"]:
        discount_percentage = float(po_data["discount"])
        total_amount -= total_amount * (discount_percentage / 100)
    
    # Ajouter la TVA
    if "tva" in po_data and po_data["tva"]:
        tva_percentage = float(po_data["tva"])
        total_amount += total_amount * (tva_percentage / 100)
    
    # Créer le bon de commande
    db_po = models.PurchaseOrder(
        po_number=po_data["po_number"],
        supplier_id=int(po_data["supplier_id"]),
        date_creation=datetime.strptime(po_data["date_creation"], "%Y-%m-%d").date() if isinstance(po_data["date_creation"], str) else po_data["date_creation"],
        currency=po_data["currency"],
        rate=float(po_data["rate"]),
        eta=po_data.get("eta"),
        shipping_cost=float(po_data.get("shipping_cost", 0)),
        discount=float(po_data.get("discount", 0)),
        tva=float(po_data.get("tva", 0)),
        status=po_data.get("status", "Draft"),
        total_amount=total_amount
    )
    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    
    for item_data in po_data["items"]:

        product = db.query(models.Product).filter(models.Product.id == item_data["product_id"]).first()
        if not product:
            db.delete(db_po)
            db.commit()
            raise HTTPException(status_code=404, detail=f"Produit {item_data['product_id']} non trouvé")
        
        db_item = models.POItem(
            po_id=db_po.id,
            product_id=int(item_data["product_id"]),
            qty=int(item_data["qty"]),
            unit_cost=float(item_data["unit_cost"]),
            unit_price=float(item_data.get("unit_price", item_data["unit_cost"])),
            total_price=float(item_data["total_price"])
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_po)
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_po.id,
        "po_number": db_po.po_number,
        "supplier_id": db_po.supplier_id,
        "date_creation": db_po.date_creation.isoformat() if db_po.date_creation else None,
        "currency": db_po.currency,
        "rate": db_po.rate,
        "total_amount": db_po.total_amount,
        "status": db_po.status,
        "eta": db_po.eta,
        "shipping_cost": db_po.shipping_cost,
        "discount": db_po.discount,
        "tva": db_po.tva,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "qty": item.qty,
                "unit_cost": item.unit_cost,
                "unit_price": item.unit_price,
                "total_price": item.total_price
            }
            for item in db_po.items
        ]
    }
    
    return result

@router.get("/{po_id}")
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if db_po is None:
        raise HTTPException(status_code=404, detail="Bon de commande non trouvé")
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_po.id,
        "po_number": db_po.po_number,
        "supplier_id": db_po.supplier_id,
        "date_creation": db_po.date_creation.isoformat() if db_po.date_creation else None,
        "currency": db_po.currency,
        "rate": db_po.rate,
        "total_amount": db_po.total_amount,
        "status": db_po.status,
        "eta": db_po.eta,
        "shipping_cost": db_po.shipping_cost,
        "discount": db_po.discount,
        "tva": db_po.tva,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "qty": item.qty,
                "unit_cost": item.unit_cost,
                "unit_price": item.unit_price,
                "total_price": item.total_price
            }
            for item in db_po.items
        ]
    }
    
    return result

@router.put("/{po_id}")
def update_purchase_order(po_id: int, po_data: Dict[str, Any], db: Session = Depends(get_db)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if db_po is None:
        raise HTTPException(status_code=404, detail="Bon de commande non trouvé")
    
    # Vérifier si le fournisseur existe
    supplier = db.query(models.Supplier).filter(models.Supplier.id == po_data["supplier_id"]).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Mettre à jour les informations de base
    for key, value in po_data.items():
        if key != "items":
            if key in ["supplier_id"]:
                setattr(db_po, key, int(value))
            elif key in ["rate", "shipping_cost", "discount", "tva"]:
                setattr(db_po, key, float(value))
            elif key == "date_creation" and isinstance(value, str):
                setattr(db_po, key, datetime.strptime(value, "%Y-%m-%d").date())
            else:
                setattr(db_po, key, value)
    
    # Supprimer les anciens articles
    db.query(models.POItem).filter(models.POItem.po_id == po_id).delete()
    
    # Calculer le montant total
    total_amount = 0.0
    for item in po_data["items"]:
        total_amount += float(item["total_price"])
    
    # Ajouter les frais de livraison
    if "shipping_cost" in po_data and po_data["shipping_cost"]:
        total_amount += float(po_data["shipping_cost"])
    
    # Appliquer la remise
    if "discount" in po_data and po_data["discount"]:
        discount_percentage = float(po_data["discount"])
        total_amount -= total_amount * (discount_percentage / 100)
    
    # Ajouter la TVA
    if "tva" in po_data and po_data["tva"]:
        tva_percentage = float(po_data["tva"])
        total_amount += total_amount * (tva_percentage / 100)
    
    db_po.total_amount = total_amount
    
    # Ajouter les nouveaux articles
    for item_data in po_data["items"]:
        # Vérifier si le produit existe
        product = db.query(models.Product).filter(models.Product.id == item_data["product_id"]).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {item_data['product_id']} non trouvé")
        
        db_item = models.POItem(
            po_id=db_po.id,
            product_id=int(item_data["product_id"]),
            qty=int(item_data["qty"]),
            unit_cost=float(item_data["unit_cost"]),
            unit_price=float(item_data.get("unit_price", item_data["unit_cost"])),
            total_price=float(item_data["total_price"])
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_po)
    
    # Convertir l'objet SQLAlchemy en dictionnaire
    result = {
        "id": db_po.id,
        "po_number": db_po.po_number,
        "supplier_id": db_po.supplier_id,
        "date_creation": db_po.date_creation.isoformat() if db_po.date_creation else None,
        "currency": db_po.currency,
        "rate": db_po.rate,
        "total_amount": db_po.total_amount,
        "status": db_po.status,
        "eta": db_po.eta,
        "shipping_cost": db_po.shipping_cost,
        "discount": db_po.discount,
        "tva": db_po.tva,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "qty": item.qty,
                "unit_cost": item.unit_cost,
                "unit_price": item.unit_price,
                "total_price": item.total_price
            }
            for item in db_po.items
        ]
    }
    
    return result

@router.delete("/{po_id}")
def delete_purchase_order(po_id: int, db: Session = Depends(get_db)):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if db_po is None:
        raise HTTPException(status_code=404, detail="Bon de commande non trouvé")
    
    # Convertir l'objet SQLAlchemy en dictionnaire avant suppression
    result = {
        "id": db_po.id,
        "po_number": db_po.po_number,
        "supplier_id": db_po.supplier_id,
        "date_creation": db_po.date_creation.isoformat() if db_po.date_creation else None,
        "currency": db_po.currency,
        "rate": db_po.rate,
        "total_amount": db_po.total_amount,
        "status": db_po.status
    }
    
    db.delete(db_po)
    db.commit()
    return result

@router.get("/{po_id}/generate-pdf")
def generate_po_pdf(po_id: int, db: Session = Depends(get_db)):
    """Génère un fichier PDF pour un bon de commande qui correspond exactement au format Excel"""
    # Récupérer les données du bon de commande
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Bon de commande non trouvé")
    
    supplier = db.query(models.Supplier).filter(models.Supplier.id == po.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Récupérer les articles du bon de commande
    po_items = []
    for item in po.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            po_items.append({
                "reference": product.pn,
                "description": product.eq_reference,
                "qty": item.qty,
                "unit": "PCS",
                "unit_price": item.unit_cost,
                "total_price": item.total_price
            })
    

    download_dir = ensure_download_dir()
    
    # Générer un nom de fichier unique
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"PO_{po.po_number}_{timestamp}.pdf"
    filepath = os.path.join(download_dir, filename)
    
    # Créer le document PDF
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=15,
        leftMargin=15,
        topMargin=15,
        bottomMargin=15
    )
    
    # Styles
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='Center',
        alignment=TA_CENTER,
        fontSize=14,
        fontName='Helvetica-Bold',
        textColor=colors.red
    ))
    styles.add(ParagraphStyle(
        name='Right',
        alignment=TA_RIGHT,
        fontSize=10,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='Left',
        alignment=TA_LEFT,
        fontSize=10,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='TableHeader',
        alignment=TA_CENTER,
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.white
    ))
    
    # Contenu du document
    elements = []
    
    # Tableau pour la mise en page de l'en-tête
    header_data = [
        [

            Image(os.path.join(os.getcwd(), "static", "logo_oodnet.webp"), width=200, height=70),
            Paragraph("Purchase Order", styles['Center'])
        ]
    ]
    
    header_table = Table(header_data, colWidths=[300, 240])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    

    po_info_data = [
        [
            # Colonne gauche - Informations PO
            Table([
                ["PO No:", po.po_number],
                ["Date:", po.date_creation.strftime("%d/%m/%Y")],
            ], colWidths=[80, 180]),
            
            # Colonne droite - Informations fournisseur
            Table([
                [Paragraph(f"<b>{supplier.company.upper()}</b>", styles['Center'])],
                [
                    Table([
                        ["Supplier Quotation N°:", supplier.rib or "N/A"],
                        ["Contact", supplier.contact_name or "N/A"],
                        ["Phone", supplier.phone or "N/A"],
                        ["Email", supplier.email or "N/A"],
                        ["Adresse", supplier.address or "N/A"],
                    ], colWidths=[150, 150])
                ]
            ], colWidths=[300])
        ]
    ]
    
    po_info_table = Table(po_info_data, colWidths=[260, 300])
    po_info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    elements.append(po_info_table)
    elements.append(Spacer(1, 15))

    #livraison
    delivery_data = [
        ["Incoterms : DAP"],
        [f"Delivery : {po.eta or '8 weeks'}"],
        ["Delivery Address: Technopark, Casablanca"]
    ]
    
    for i, row in enumerate(delivery_data):
        delivery_table = Table([[Paragraph(row[0], styles['Center'])]], colWidths=[540])
        delivery_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.navy),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(delivery_table)
        elements.append(Spacer(1, 5))
    
    elements.append(Spacer(1, 10))
    
    # Notes spéciales
    notes_header = Table([["PO Special Notes and Instructions"]], colWidths=[540])
    notes_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.navy),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(notes_header)
    
    notes_content = Table([["Payment shall be 30 days upon receipt of the items above."]], colWidths=[540])
    notes_content.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(notes_content)
    elements.append(Spacer(1, 15))
    
    # En-tête du tableau des articles
    items_header_data = [["#", "Reference", "Description", "Column1", "Quantity", "Unit", "Unit price", "Total Price"]]
    
    items_header = Table(items_header_data, colWidths=[30, 100, 120, 100, 50, 40, 50, 50])
    items_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.navy),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(items_header)
    
    # Catégorie des produits
    category_data = [["FOURNITURE PRODUITS CORNING-CDM"]]
    category_table = Table(category_data, colWidths=[540])
    category_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    elements.append(category_table)
    
    # Tableau des articles
    items_data = []
    for i, item in enumerate(po_items, 1):
        items_data.append([
            i,
            item["reference"],
            item["description"],
            "",  # Column1 (vide dans l'exemple)
            item["qty"],
            item["unit"],
            f"{item['unit_price']} {po.currency}",
            f"{item['total_price']} {po.currency}"
        ])
    
    if items_data:
        items_table = Table(items_data, colWidths=[30, 100, 120, 100, 50, 40, 50, 50])
        items_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (4, 0), (7, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(items_table)
    
    # Calculer le sous-total
    subtotal = sum(item["total_price"] for item in po_items)
    
    # Ajouter les frais de livraison, remise et TVA
    shipping_cost = po.shipping_cost or 0
    discount_percentage = po.discount or 0
    discount_amount = subtotal * (discount_percentage / 100)
    subtotal_after_discount = subtotal - discount_amount + shipping_cost
    tva_percentage = po.tva or 20  # Par défaut 20% comme dans l'exemple
    tva_amount = subtotal_after_discount * (tva_percentage / 100)
    total = subtotal_after_discount + tva_amount
    
    # Tableau des totaux
    totals_data = [
        ["TOTAL", f"############"],
        ["Discount", f"{po.currency} {discount_amount:.2f}"],
        ["Shipping & Handling", f"{po.currency} {shipping_cost:.2f}"],
        ["TOTAL - VAT EXCL", f"############"],
        [f"VAT - {tva_percentage}%", f"{po.currency} {tva_amount:.2f}"],
        ["TOTAL - VAT INCL", f"############"]
    ]
    
    # Créer un tableau pour les totaux aligné à droite
    totals_table = Table(totals_data, colWidths=[150, 150])
    totals_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.navy),
        ('BACKGROUND', (0, 3), (0, 3), colors.navy),
        ('BACKGROUND', (0, 5), (0, 5), colors.navy),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
        ('TEXTCOLOR', (0, 3), (0, 3), colors.white),
        ('TEXTCOLOR', (0, 5), (0, 5), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))
    
    # Ajouter un espace avant les totaux
    elements.append(Spacer(1, 20))
    
    # Créer un tableau pour aligner les totaux à droite
    align_table = Table([[None, totals_table]], colWidths=[240, 300])
    align_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    
    elements.append(align_table)
    
    # Générer le PDF
    doc.build(elements)
    
    # Retourner le fichier PDF
    return FileResponse(
        path=filepath,
        filename=f"PO_{po.po_number}.pdf",
        media_type="application/pdf"
    )

# Garder la route Excel pour la compatibilité, mais rediriger vers PDF
@router.get("/{po_id}/generate-excel")
def generate_po_excel(po_id: int, db: Session = Depends(get_db)):
    """Redirige vers la génération de PDF pour compatibilité"""
    return generate_po_pdf(po_id, db)