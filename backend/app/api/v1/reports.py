import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import Trip, TripMember, Expense, Settlement, User
from backend.app.schemas.schemas import TripReportResponse, CategorySpending, ParticipantSpending
from backend.app.api.v1.deps import require_trip_membership
from backend.app.calculations.balances import calculate_trip_balances

router = APIRouter(prefix="/reports", tags=["Reports"])

def sanitize_csv_cell(value: str) -> str:
    """
    Prevents CSV Formula Injection (DDE attacks) in Microsoft Excel / Google Sheets.
    Prefixes risky characters (=, +, -, @, \t, \r) with an apostrophe.
    """
    if not value:
        return ""
    str_val = str(value)
    if str_val[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + str_val
    return str_val

@router.get("/trip/{trip_id}", response_model=TripReportResponse)
def get_trip_report(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, _ = membership_data
    
    # 1. Total expenses & category breakdown
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id, Expense.is_void == False).all()
    total_exp = sum(e.amount_paise for e in expenses)
    
    category_totals = {}
    for e in expenses:
        category_totals[e.category] = category_totals.get(e.category, 0) + e.amount_paise
        
    cat_breakdown = []
    for cat, amt in category_totals.items():
        pct = (amt / total_exp * 100) if total_exp > 0 else 0.0
        cat_breakdown.append(CategorySpending(category=cat, amount_paise=amt, percentage=round(pct, 1)))
    cat_breakdown.sort(key=lambda x: -x.amount_paise)
    
    # 2. Confirmed settlements total
    confirmed_st = db.query(Settlement).filter(Settlement.trip_id == trip_id, Settlement.status == "CONFIRMED").all()
    total_settled = sum(s.amount_paise for s in confirmed_st)
    
    # 3. Participant breakdown
    members = db.query(TripMember, User).join(User, User.id == TripMember.user_id).filter(TripMember.trip_id == trip_id).all()
    user_map = {u.id: u for _, u in members}
    member_ids = list(user_map.keys())
    
    exp_dicts = [
        {
            "id": e.id,
            "payer_id": e.payer_id,
            "amount_paise": e.amount_paise,
            "is_void": e.is_void,
            "splits": [{"user_id": s.user_id, "amount_paise": s.amount_paise} for s in e.splits]
        }
        for e in expenses
    ]
    st_dicts = [
        {
            "id": s.id,
            "payer_id": s.payer_id,
            "payee_id": s.payee_id,
            "amount_paise": s.amount_paise,
            "status": s.status
        }
        for s in confirmed_st
    ]
    
    calc = calculate_trip_balances(member_ids, exp_dicts, st_dicts)
    part_breakdown = []
    for uid in member_ids:
        u = user_map.get(uid)
        part_breakdown.append(
            ParticipantSpending(
                user_id=uid,
                user_name=u.full_name if u else "Member",
                amount_spent_paise=calc["total_spent_paise"].get(uid, 0),
                amount_consumed_paise=calc["total_share_paise"].get(uid, 0),
                net_balance_paise=calc["net_balances"].get(uid, 0)
            )
        )
    part_breakdown.sort(key=lambda x: -x.amount_spent_paise)
    
    return TripReportResponse(
        trip_id=trip.id,
        trip_name=trip.name,
        total_expenses_paise=total_exp,
        total_settled_paise=total_settled,
        category_breakdown=cat_breakdown,
        participant_breakdown=part_breakdown
    )

@router.get("/trip/{trip_id}/export/csv")
def export_trip_csv(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, _ = membership_data
    expenses = (
        db.query(Expense)
        .filter(Expense.trip_id == trip_id, Expense.is_void == False)
        .order_by(Expense.date.desc())
        .all()
    )
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Expense ID",
        "Date",
        "Description",
        "Category",
        "Payer Name",
        "Amount (INR)",
        "Split Method",
        "Participants & Shares",
        "Notes"
    ])
    
    for e in expenses:
        payer = db.query(User).filter(User.id == e.payer_id).first()
        splits_detail = []
        for s in e.splits:
            p_user = db.query(User).filter(User.id == s.user_id).first()
            p_name = p_user.full_name if p_user else "Member"
            splits_detail.append(f"{p_name}: ₹{s.amount_paise / 100:.2f}")
            
        writer.writerow([
            sanitize_csv_cell(e.id),
            sanitize_csv_cell(e.date.strftime("%Y-%m-%d %H:%M") if e.date else ""),
            sanitize_csv_cell(e.description),
            sanitize_csv_cell(e.category),
            sanitize_csv_cell(payer.full_name if payer else "Unknown"),
            f"{e.amount_paise / 100:.2f}",
            sanitize_csv_cell(e.split_method),
            sanitize_csv_cell("; ".join(splits_detail)),
            sanitize_csv_cell(e.notes or "")
        ])
        
    output.seek(0)
    filename = f"ONNA_GO_{trip.name.replace(' ', '_')}_expenses.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/trip/{trip_id}/export/pdf")
def export_trip_pdf(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    trip, _ = membership_data
    expenses = (
        db.query(Expense)
        .filter(Expense.trip_id == trip_id, Expense.is_void == False)
        .order_by(Expense.date.desc())
        .all()
    )
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    elements = []
    
    # Title
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        textColor=colors.HexColor('#64748B')
    )
    
    elements.append(Paragraph(f"ONNA-GO Expense Report: {trip.name}", title_style))
    elements.append(Paragraph(f"Destination: {trip.destination or 'N/A'} | Tagline: Ride Together. Vibe Together. Split Together.", subtitle_style))
    elements.append(Spacer(1, 16))
    
    # Summary Table
    total_exp = sum(e.amount_paise for e in expenses)
    summary_data = [
        ["Total Group Spending", f"INR {total_exp / 100:.2f}"],
        ["Total Recorded Expenses", str(len(expenses))],
        ["Currency", trip.currency or "INR"]
    ]
    summary_table = Table(summary_data, colWidths=[200, 300])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1E293B')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 18))
    
    # Expenses Table
    elements.append(Paragraph("Expense Breakdown", styles['Heading2']))
    elements.append(Spacer(1, 8))
    
    table_data = [["Date", "Description", "Category", "Paid By", "Amount"]]
    for e in expenses:
        payer = db.query(User).filter(User.id == e.payer_id).first()
        dt_str = e.date.strftime("%Y-%m-%d") if e.date else ""
        table_data.append([
            dt_str,
            e.description[:30],
            e.category,
            payer.full_name if payer else "Unknown",
            f"INR {e.amount_paise / 100:.2f}"
        ])
        
    exp_table = Table(table_data, colWidths=[70, 180, 80, 110, 100])
    exp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(exp_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"ONNA_GO_{trip.name.replace(' ', '_')}_report.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
