from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, datetime, timedelta
from typing import Dict, List, Any
from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Statistiques du dashboard - CORRIGÉ avec les vrais noms de modèles
    et ajout des opportunités par étape
    """
    try:
        # Compter SEULEMENT les leads actifs (non convertis)
        leads_count = db.query(models.Lead).filter(
            models.Lead.status.notin_([
                "Converti", 
                "CONVERTI",
                "converti"
            ])
        ).count()
        
        # Compter SEULEMENT les opportunités actives (non converties en projets)
        opportunities_count = db.query(models.Opportunity).filter(
            models.Opportunity.current_step.notin_([
                "Converti en projet", 
                "CONVERTI EN PROJET",
                "converti en projet"
            ])
        ).count()
        
        # Compter les devis (modèle = DevisOddnet)
        devis_count = db.query(models.DevisOddnet).count()
        
        # Compter les projets
        projects_count = db.query(models.Project).count()
        
        # Compter les bons de commande (modèle = PurchaseOrder)
        purchase_orders_count = db.query(models.PurchaseOrder).count()
        
        # Compter les clients
        clients_count = db.query(models.Client).count()
        
        # AJOUT: Opportunités par étape (seulement les opportunités actives)
        opportunities_by_stage = db.query(
            models.Opportunity.current_step,
            func.count(models.Opportunity.id).label('count')
        ).filter(
            models.Opportunity.current_step.notin_([
                "Converti en projet", 
                "CONVERTI EN PROJET",
                "converti en projet"
            ])
        ).group_by(models.Opportunity.current_step).all()
        
        # Convertir en format pour le graphique
        stage_labels = []
        stage_counts = []
        for stage, count in opportunities_by_stage:
            stage_labels.append(stage or "Non défini")
            stage_counts.append(count)
        
        return {
            "stats": {
                "leads": leads_count,
                "opportunities": opportunities_count,
                "devis": devis_count,
                "projects": projects_count,
                "purchase_orders": purchase_orders_count,
                "clients": clients_count
            },
            "opportunities_by_stage": {
                "labels": stage_labels,
                "counts": stage_counts
            }
        }
        
    except Exception as e:
        print(f"Erreur dans get_dashboard_stats: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques: {str(e)}")

# Route séparée pour obtenir uniquement les opportunités par étape
@router.get("/opportunities-by-stage")
def get_opportunities_by_stage(db: Session = Depends(get_db)):
    """
    Récupérer les opportunités par étape pour le graphique
    """
    try:
        # Opportunités par étape (seulement les opportunités actives)
        opportunities_by_stage = db.query(
            models.Opportunity.current_step,
            func.count(models.Opportunity.id).label('count')
        ).filter(
            models.Opportunity.current_step.notin_([
                "Converti en projet", 
                "CONVERTI EN PROJET",
                "converti en projet"
            ])
        ).group_by(models.Opportunity.current_step).all()
        
        # Convertir en format pour le graphique
        stage_labels = []
        stage_counts = []
        for stage, count in opportunities_by_stage:
            stage_labels.append(stage or "Non défini")
            stage_counts.append(count)
        
        return {
            "labels": stage_labels,
            "counts": stage_counts
        }
        
    except Exception as e:
        print(f"Erreur dans get_opportunities_by_stage: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des opportunités par étape: {str(e)}")

# Garder les autres routes inchangées
@router.get("/stats/all")
def get_all_dashboard_stats(db: Session = Depends(get_db)):
    """
    Statistiques complètes incluant les éléments convertis
    """
    try:
        # Compter TOUS les leads
        all_leads_count = db.query(models.Lead).count()
        active_leads_count = db.query(models.Lead).filter(
            models.Lead.status.notin_(["Converti", "CONVERTI", "converti"])
        ).count()
        converted_leads_count = db.query(models.Lead).filter(
            models.Lead.status.in_(["Converti", "CONVERTI", "converti"])
        ).count()
        
        # Compter TOUTES les opportunités
        all_opportunities_count = db.query(models.Opportunity).count()
        active_opportunities_count = db.query(models.Opportunity).filter(
            models.Opportunity.current_step.notin_([
                "Converti en projet", "CONVERTI EN PROJET", "converti en projet"
            ])
        ).count()
        converted_opportunities_count = db.query(models.Opportunity).filter(
            models.Opportunity.current_step.in_([
                "Converti en projet", "CONVERTI EN PROJET", "converti en projet"
            ])
        ).count()
        
        return {
            "stats": {
                "leads": {
                    "total": all_leads_count,
                    "active": active_leads_count,
                    "converted": converted_leads_count
                },
                "opportunities": {
                    "total": all_opportunities_count,
                    "active": active_opportunities_count,
                    "converted": converted_opportunities_count
                },
                "devis": db.query(models.DevisOddnet).count(),
                "projects": db.query(models.Project).count(),
                "purchase_orders": db.query(models.PurchaseOrder).count(),
                "clients": db.query(models.Client).count()
            }
        }
        
    except Exception as e:
        print(f"Erreur dans get_all_dashboard_stats: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques complètes: {str(e)}")

@router.get("/stats/detailed")
def get_detailed_dashboard_stats(db: Session = Depends(get_db)):
    """
    Statistiques détaillées avec informations supplémentaires
    """
    try:
        # Statistiques des leads
        leads_stats = {
            "total": db.query(models.Lead).count(),
            "active": db.query(models.Lead).filter(
                models.Lead.status.notin_(["Converti", "CONVERTI", "converti"])
            ).count(),
            "converted": db.query(models.Lead).filter(
                models.Lead.status.in_(["Converti", "CONVERTI", "converti"])
            ).count()
        }
        
        # Statistiques des opportunités
        opportunities_stats = {
            "total": db.query(models.Opportunity).count(),
            "active": db.query(models.Opportunity).filter(
                models.Opportunity.current_step.notin_([
                    "Converti en projet", "CONVERTI EN PROJET", "converti en projet"
                ])
            ).count(),
            "converted": db.query(models.Opportunity).filter(
                models.Opportunity.current_step.in_([
                    "Converti en projet", "CONVERTI EN PROJET", "converti en projet"
                ])
            ).count()
        }
        
        # Statistiques des devis par statut
        devis_stats = {
            "total": db.query(models.DevisOddnet).count(),
            "nouveau": db.query(models.DevisOddnet).filter(
                models.DevisOddnet.status == "Nouveau"
            ).count(),
            "en_cours": db.query(models.DevisOddnet).filter(
                models.DevisOddnet.status == "En cours"
            ).count()
        }
        
        # Statistiques des projets par statut
        projects_stats = {
            "total": db.query(models.Project).count(),
            "en_cours": db.query(models.Project).filter(
                models.Project.status == "En cours"
            ).count(),
            "termine": db.query(models.Project).filter(
                models.Project.status == "Terminé"
            ).count()
        }
        
        return {
            "leads": leads_stats,
            "opportunities": opportunities_stats,
            "devis": devis_stats,
            "projects": projects_stats,
            "purchase_orders": db.query(models.PurchaseOrder).count(),
            "clients": db.query(models.Client).count(),
            "products": db.query(models.Product).count(),
            "suppliers": db.query(models.Supplier).count(),
            "hardware_items": db.query(models.HardwareIT).count()
        }
        
    except Exception as e:
        print(f"Erreur dans get_detailed_dashboard_stats: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques détaillées: {str(e)}")

@router.get("/opportunities-timeline")
def get_opportunities_timeline(db: Session = Depends(get_db)):
    """Récupérer les opportunités avec leur timeline pour le graphique de suivi"""
    
    # Récupérer toutes les opportunités actives (pas encore converties en projet)
    opportunities = db.query(models.Opportunity).filter(
        models.Opportunity.current_step.notin_([
            "Converti en projet", 
            "CONVERTI EN PROJET",
            "converti en projet"
        ])
    ).all()
    
    timeline_data = []
    today = date.today()
    
    for opp in opportunities:
        if opp.current_step_date:
            # Calculer le nombre de jours depuis la création de l'opportunité
            days_since_creation = (today - opp.current_step_date).days
            
            # Déterminer la couleur selon l'âge
            if days_since_creation <= 15:
                color = "#10b981"  # Vert
                status = "normal"
            elif days_since_creation <= 51:
                color = "#f59e0b"  # Orange/Jaune
                status = "warning"
            else:
                color = "#ef4444"  # Rouge
                status = "critical"
            
            timeline_data.append({
                "id": opp.id,
                "company_name": opp.company_name,
                "project": opp.project or "Projet non défini",
                "current_step": opp.current_step,
                "current_step_date": opp.current_step_date.isoformat(),
                "days_since_creation": days_since_creation,
                "montant_devis": opp.montant_devis,
                "color": color,
                "status": status,
                "devis_number": opp.devis_number
            })
    
    # Trier par nombre de jours (les plus anciens en premier)
    timeline_data.sort(key=lambda x: x["days_since_creation"], reverse=True)
    
    return {
        "opportunities": timeline_data,
        "total_count": len(timeline_data),
        "critical_count": len([opp for opp in timeline_data if opp["status"] == "critical"]),
        "warning_count": len([opp for opp in timeline_data if opp["status"] == "warning"]),
        "normal_count": len([opp for opp in timeline_data if opp["status"] == "normal"])
    }

@router.get("/revenue-by-month")
def get_revenue_by_month(db: Session = Depends(get_db)):
    """Récupérer les revenus par mois basés sur les projets et devis"""
    
    # Revenus des projets par mois
    current_year = datetime.now().year
    monthly_revenue = []
    
    for month in range(1, 13):
        # Revenus des projets créés ce mois
        projects_revenue = db.query(func.sum(models.Project.montant_po)).filter(
            and_(
                func.extract('year', models.Project.start_date) == current_year,
                func.extract('month', models.Project.start_date) == month
            )
        ).scalar() or 0
        
        # Revenus des devis créés ce mois
        devis_revenue = db.query(func.sum(models.DevisOddnet.total_amount)).filter(
            and_(
                func.extract('year', models.DevisOddnet.date_creation) == current_year,
                func.extract('month', models.DevisOddnet.date_creation) == month
            )
        ).scalar() or 0
        
        monthly_revenue.append(float(projects_revenue + devis_revenue))
    
    return {
        "labels": ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
        "revenue": monthly_revenue
    }

@router.get("/clients-by-sector")
def get_clients_by_sector(db: Session = Depends(get_db)):
    """Récupérer la répartition des clients par secteur d'activité"""
    
    clients_by_sector = db.query(
        models.Client.sector_field,
        func.count(models.Client.id).label('count')
    ).group_by(models.Client.sector_field).all()
    
    labels = []
    counts = []
    
    for sector, count in clients_by_sector:
        labels.append(sector or "Non défini")
        counts.append(count)
    
    return {
        "labels": labels,
        "counts": counts
    }