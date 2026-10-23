import csv
import io
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import Trip, TripMember, Expense, Settlement, User
from backend.app.schemas.schemas import TripReportResponse, CategorySpending, ParticipantSpending
from backend.app.api.v1.deps import get_current_user, require_trip_membership
from backend.app.calculations.balances import calculate_trip_balances
from backend.app.calculations.settlements import optimize_settlements

router = APIRouter(prefix="/reports", tags=["Reports"])

def sanitize_csv_cell(value: Any) -> str:
    """
    Prevents CSV Formula Injection (DDE attacks) in Microsoft Excel / Google Sheets.
    Prefixes risky characters (=, +, -, @, \t, \r) with an apostrophe.
    """
    if value is None:
        return ""
    str_val = str(value)
    if str_val and str_val[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + str_val
    return str_val

def sanitize_filename(name: str) -> str:
    """Creates a filesystem-safe filename."""
    cleaned = re.sub(r'[^a-zA-Z0-9_\- ]', '', name).strip().replace(' ', '_')
    return cleaned or "Trip"

# --- Numbered Canvas for Dynamic Page Numbering & Repeating Headers/Footers ---
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors

    class NumberedCanvas(canvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            num_pages = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self.draw_page_decorations(num_pages)
                super().showPage()
            super().save()

        def draw_page_decorations(self, page_count: int):
            self.saveState()
            # Page dimensions: A4 is 595.27 x 841.89 points
            # Left margin 36, Right margin 36 -> Printable width 523.27
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            
            # Bottom Divider
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(36, 40, 559, 40)
            
            # Footer text
            self.drawString(36, 26, "ONNA-GO • Ride Together. Vibe Together. Split Together. • onna-go.onrender.com")
            page_str = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(559, 26, page_str)
            self.restoreState()
except ImportError:
    NumberedCanvas = None
    colors = None


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
    filename = f"ONNA_GO_{sanitize_filename(trip.name)}_expenses.csv"
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
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation engine (reportlab) is not installed on the server."
        )

    trip, current_member = membership_data
    
    # Fetch all data
    expenses = (
        db.query(Expense)
        .filter(Expense.trip_id == trip_id, Expense.is_void == False)
        .order_by(Expense.date.desc())
        .all()
    )
    members = db.query(TripMember, User).join(User, User.id == TripMember.user_id).filter(TripMember.trip_id == trip_id).all()
    user_map = {u.id: u for _, u in members}
    member_ids = list(user_map.keys())
    
    confirmed_st = db.query(Settlement).filter(Settlement.trip_id == trip_id, Settlement.status == "CONFIRMED").all()
    all_settlements = db.query(Settlement).filter(Settlement.trip_id == trip_id).order_by(Settlement.created_at.desc()).all()
    
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
    net_balances = calc["net_balances"]
    total_spent = calc["total_spent_paise"]
    total_share = calc["total_share_paise"]
    total_exp_paise = calc["total_trip_expenses_paise"]
    total_settled_paise = sum(s.amount_paise for s in confirmed_st)
    
    suggestions = optimize_settlements(net_balances)
    
    # Document Setup
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=48
    )
    
    styles = getSampleStyleSheet()
    
    # Typography
    brand_style = ParagraphStyle(
        'DocBrand',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#16834A')
    )
    title_style = ParagraphStyle(
        'DocTripTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A')
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B')
    )
    section_h2 = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6
    )
    cell_style = ParagraphStyle(
        'DocCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )
    cell_bold = ParagraphStyle(
        'DocCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )
    cell_right = ParagraphStyle(
        'DocCellRight',
        parent=cell_style,
        alignment=2 # Right align
    )
    cell_right_bold = ParagraphStyle(
        'DocCellRightBold',
        parent=cell_bold,
        alignment=2
    )
    cell_positive = ParagraphStyle(
        'DocCellPos',
        parent=cell_right_bold,
        textColor=colors.HexColor('#16834A')
    )
    cell_negative = ParagraphStyle(
        'DocCellNeg',
        parent=cell_right_bold,
        textColor=colors.HexColor('#DC2626')
    )
    th_style = ParagraphStyle(
        'DocTH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    th_right = ParagraphStyle(
        'DocTHRight',
        parent=th_style,
        alignment=2
    )

    elements = []
    
    # 1. Header Banner
    elements.append(Paragraph("ONNA-GO", brand_style))
    elements.append(Spacer(1, 2))
    elements.append(Paragraph("Trip Expense &amp; Settlement Statement", title_style))
    
    gen_time_str = datetime.now(timezone.utc).strftime("%d %B %Y, %I:%M %p UTC")
    trip_status_str = "COMPLETED" if (trip.completed_at or trip.is_archived) else "ACTIVE"
    elements.append(Paragraph(f"Generated: {gen_time_str} • Trip Status: <b>{trip_status_str}</b>", meta_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=12))
    
    # 2. Trip Information & Executive Summary Table
    date_range_str = "N/A"
    if trip.start_date:
        start_str = trip.start_date.strftime("%d %b %Y")
        end_str = trip.end_date.strftime("%d %b %Y") if trip.end_date else "Present"
        date_range_str = f"{start_str} – {end_str}"
        
    creator = user_map.get(trip.created_by_id)
    summary_data = [
        [
            Paragraph("<b>Trip Name</b>", cell_bold),
            Paragraph(trip.name, cell_style),
            Paragraph("<b>Total Expenses</b>", cell_bold),
            Paragraph(f"INR {total_exp_paise / 100:,.2f}", cell_right_bold)
        ],
        [
            Paragraph("<b>Destination</b>", cell_bold),
            Paragraph(trip.destination or "Not specified", cell_style),
            Paragraph("<b>Total Settled</b>", cell_bold),
            Paragraph(f"INR {total_settled_paise / 100:,.2f}", cell_right_bold)
        ],
        [
            Paragraph("<b>Travel Dates</b>", cell_bold),
            Paragraph(date_range_str, cell_style),
            Paragraph("<b>Outstanding Debts</b>", cell_bold),
            Paragraph(f"INR {sum(sug['amount_paise'] for sug in suggestions) / 100:,.2f}", cell_right_bold)
        ],
        [
            Paragraph("<b>Trip Organizer</b>", cell_bold),
            Paragraph(creator.full_name if creator else "Admin", cell_style),
            Paragraph("<b>Total Members</b>", cell_bold),
            Paragraph(f"{len(members)} travelers", cell_right)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[100, 160, 130, 133])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 14))

    # 3. Category Spending Breakdown
    elements.append(Paragraph("1. Category-Wise Expense Breakdown", section_h2))
    category_totals = {}
    for e in expenses:
        category_totals[e.category] = category_totals.get(e.category, 0) + e.amount_paise
        
    cat_rows = [
        [Paragraph("Category", th_style), Paragraph("Total Amount (INR)", th_right), Paragraph("% of Trip Spending", th_right)]
    ]
    if category_totals:
        sorted_cats = sorted(category_totals.items(), key=lambda x: -x[1])
        for cat, amt in sorted_cats:
            pct = (amt / total_exp_paise * 100) if total_exp_paise > 0 else 0.0
            cat_rows.append([
                Paragraph(cat, cell_bold),
                Paragraph(f"INR {amt / 100:,.2f}", cell_right),
                Paragraph(f"{pct:.1f}%", cell_right)
            ])
    else:
        cat_rows.append([Paragraph("No expenses recorded", cell_style), Paragraph("INR 0.00", cell_right), Paragraph("0.0%", cell_right)])

    cat_table = Table(cat_rows, colWidths=[200, 160, 163], repeatRows=1)
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(cat_table)
    elements.append(Spacer(1, 14))

    # 4. Member Contributions, Fair Shares & Current Balances
    elements.append(Paragraph("2. Member Contributions &amp; Balances", section_h2))
    member_rows = [
        [
            Paragraph("Member", th_style),
            Paragraph("Total Paid (Out-of-Pocket)", th_right),
            Paragraph("Fair Share (Consumed)", th_right),
            Paragraph("Net Balance", th_right),
            Paragraph("Status", th_style)
        ]
    ]
    for uid in member_ids:
        u = user_map.get(uid)
        paid = total_spent.get(uid, 0)
        share = total_share.get(uid, 0)
        net = net_balances.get(uid, 0)
        
        if net > 0:
            status_desc = "Is owed money"
            net_p = Paragraph(f"+INR {net / 100:,.2f}", cell_positive)
        elif net < 0:
            status_desc = "Owes money"
            net_p = Paragraph(f"-INR {abs(net) / 100:,.2f}", cell_negative)
        else:
            status_desc = "Fully Settled"
            net_p = Paragraph("INR 0.00", cell_right_bold)
            
        member_rows.append([
            Paragraph(u.full_name if u else "Member", cell_bold),
            Paragraph(f"INR {paid / 100:,.2f}", cell_right),
            Paragraph(f"INR {share / 100:,.2f}", cell_right),
            net_p,
            Paragraph(status_desc, cell_style)
        ])

    member_table = Table(member_rows, colWidths=[150, 100, 95, 95, 83], repeatRows=1)
    member_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16834A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(member_table)
    elements.append(Spacer(1, 14))

    # 5. Who Pays Whom (Simplified Outstanding Settlements)
    elements.append(Paragraph("3. Who Pays Whom (Outstanding Debt Simplification)", section_h2))
    sug_rows = [
        [
            Paragraph("Payer (Debtor)", th_style),
            Paragraph("Receiver (Creditor)", th_style),
            Paragraph("Amount Due (INR)", th_right)
        ]
    ]
    if suggestions:
        for sug in suggestions:
            f_user = user_map.get(sug["from_user_id"])
            t_user = user_map.get(sug["to_user_id"])
            sug_rows.append([
                Paragraph(f_user.full_name if f_user else "Member", cell_style),
                Paragraph(t_user.full_name if t_user else "Member", cell_style),
                Paragraph(f"INR {sug['amount_paise'] / 100:,.2f}", cell_right_bold)
            ])
    else:
        sug_rows.append([
            Paragraph("All members are completely settled up! No outstanding balances.", cell_style),
            Paragraph("—", cell_style),
            Paragraph("INR 0.00", cell_right)
        ])
        
    sug_table = Table(sug_rows, colWidths=[200, 200, 123], repeatRows=1)
    sug_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(sug_table)
    elements.append(Spacer(1, 14))

    # 6. Detailed Expense Ledger
    elements.append(Paragraph("4. Detailed Expense Ledger", section_h2))
    exp_rows = [
        [
            Paragraph("Date", th_style),
            Paragraph("Description", th_style),
            Paragraph("Category", th_style),
            Paragraph("Paid By", th_style),
            Paragraph("Amount (INR)", th_right)
        ]
    ]
    if expenses:
        for e in expenses:
            payer = user_map.get(e.payer_id)
            dt_str = e.date.strftime("%d/%m/%Y") if e.date else ""
            exp_rows.append([
                Paragraph(dt_str, cell_style),
                Paragraph(e.description or "Expense", cell_style),
                Paragraph(e.category, cell_style),
                Paragraph(payer.full_name if payer else "Member", cell_style),
                Paragraph(f"INR {e.amount_paise / 100:,.2f}", cell_right)
            ])
    else:
        exp_rows.append([
            Paragraph("—", cell_style),
            Paragraph("No expenses recorded for this trip.", cell_style),
            Paragraph("—", cell_style),
            Paragraph("—", cell_style),
            Paragraph("INR 0.00", cell_right)
        ])

    exp_table = Table(exp_rows, colWidths=[65, 160, 85, 105, 108], repeatRows=1)
    exp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(exp_table)
    elements.append(Spacer(1, 14))

    # 7. Settlement History & Audit Trail
    elements.append(Paragraph("5. Settlement Payment History", section_h2))
    st_rows = [
        [
            Paragraph("Date", th_style),
            Paragraph("Payer", th_style),
            Paragraph("Payee", th_style),
            Paragraph("Method", th_style),
            Paragraph("Status", th_style),
            Paragraph("Amount (INR)", th_right)
        ]
    ]
    if all_settlements:
        for s in all_settlements:
            payer = user_map.get(s.payer_id)
            payee = user_map.get(s.payee_id)
            dt_str = s.created_at.strftime("%d/%m/%Y") if s.created_at else ""
            status_text = s.status.replace('_', ' ')
            st_rows.append([
                Paragraph(dt_str, cell_style),
                Paragraph(payer.full_name if payer else "Member", cell_style),
                Paragraph(payee.full_name if payee else "Member", cell_style),
                Paragraph(s.payment_method, cell_style),
                Paragraph(status_text, cell_bold),
                Paragraph(f"INR {s.amount_paise / 100:,.2f}", cell_right)
            ])
    else:
        st_rows.append([
            Paragraph("—", cell_style),
            Paragraph("No settlements recorded yet.", cell_style),
            Paragraph("—", cell_style),
            Paragraph("—", cell_style),
            Paragraph("—", cell_style),
            Paragraph("INR 0.00", cell_right)
        ])

    st_table = Table(st_rows, colWidths=[65, 100, 100, 75, 85, 98], repeatRows=1)
    st_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(st_table)

    # Build PDF with NumberedCanvas if available
    build_kwargs = {}
    if NumberedCanvas is not None:
        build_kwargs["canvasmaker"] = NumberedCanvas
    doc.build(elements, **build_kwargs)
    buffer.seek(0)
    
    filename = f"ONNA_GO_{sanitize_filename(trip.name)}_Report.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/history/export/pdf")
def export_history_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation engine (reportlab) is not installed on the server."
        )

    # Fetch all trips user belongs to
    memberships = db.query(TripMember).filter(TripMember.user_id == current_user.id).all()
    trip_ids = [m.trip_id for m in memberships]
    
    trips = (
        db.query(Trip)
        .filter(Trip.id.in_(trip_ids))
        .order_by(Trip.created_at.desc())
        .all()
    )
    
    # Calculate travel stats
    total_personal_paid_paise = 0
    total_trips_count = len(trips)
    completed_count = sum(1 for t in trips if t.completed_at or t.is_archived)
    active_count = total_trips_count - completed_count
    
    trip_rows_data = []
    for t in trips:
        expenses_t = db.query(Expense).filter(Expense.trip_id == t.id, Expense.is_void == False).all()
        confirmed_st_t = db.query(Settlement).filter(Settlement.trip_id == t.id, Settlement.status == "CONFIRMED").all()
        all_m = [m.user_id for m in db.query(TripMember).filter(TripMember.trip_id == t.id).all()]
        
        exp_dicts = [
            {"id": e.id, "payer_id": e.payer_id, "amount_paise": e.amount_paise, "is_void": e.is_void, "splits": [{"user_id": s.user_id, "amount_paise": s.amount_paise} for s in e.splits]}
            for e in expenses_t
        ]
        st_dicts = [
            {"id": s.id, "payer_id": s.payer_id, "payee_id": s.payee_id, "amount_paise": s.amount_paise, "status": s.status}
            for s in confirmed_st_t
        ]
        
        calc_t = calculate_trip_balances(all_m, exp_dicts, st_dicts)
        user_spent = calc_t["total_spent_paise"].get(current_user.id, 0)
        user_bal = calc_t["net_balances"].get(current_user.id, 0)
        total_personal_paid_paise += user_spent
        
        status_str = "COMPLETED" if (t.completed_at or t.is_archived) else "ACTIVE"
        trip_rows_data.append({
            "name": t.name,
            "destination": t.destination or "—",
            "status": status_str,
            "total_expenses": calc_t["total_trip_expenses_paise"],
            "user_paid": user_spent,
            "user_balance": user_bal
        })
        
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=48
    )
    styles = getSampleStyleSheet()
    
    brand_style = ParagraphStyle('DocBrand', fontName='Helvetica-Bold', fontSize=24, leading=28, textColor=colors.HexColor('#16834A'))
    title_style = ParagraphStyle('DocTripTitle', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=colors.HexColor('#0F172A'))
    meta_style = ParagraphStyle('DocMeta', fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor('#64748B'))
    cell_style = ParagraphStyle('DocCell', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#1E293B'))
    cell_bold = ParagraphStyle('DocCellBold', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#1E293B'))
    cell_right = ParagraphStyle('DocCellRight', fontName='Helvetica', fontSize=8.5, leading=11, alignment=2)
    cell_right_bold = ParagraphStyle('DocCellRightBold', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=2)
    th_style = ParagraphStyle('DocTH', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.white)
    th_right = ParagraphStyle('DocTHRight', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.white, alignment=2)

    elements = []
    elements.append(Paragraph("ONNA-GO", brand_style))
    elements.append(Spacer(1, 2))
    elements.append(Paragraph(f"Travel &amp; Expense History: {current_user.full_name}", title_style))
    gen_time_str = datetime.now(timezone.utc).strftime("%d %B %Y, %I:%M %p UTC")
    elements.append(Paragraph(f"Generated: {gen_time_str} • Email: {current_user.email}", meta_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=12))

    # Stats Summary Table
    stats_data = [
        [
            Paragraph("<b>Total Trips</b>", cell_bold),
            Paragraph(f"{total_trips_count} ({active_count} active, {completed_count} completed)", cell_style),
            Paragraph("<b>Total Paid by You</b>", cell_bold),
            Paragraph(f"INR {total_personal_paid_paise / 100:,.2f}", cell_right_bold)
        ]
    ]
    stats_table = Table(stats_data, colWidths=[100, 160, 130, 133])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 16))

    # All Trips Ledger Table
    trip_table_rows = [
        [
            Paragraph("Trip Name", th_style),
            Paragraph("Destination", th_style),
            Paragraph("Status", th_style),
            Paragraph("Trip Total (INR)", th_right),
            Paragraph("You Paid (INR)", th_right),
            Paragraph("Net Balance", th_right)
        ]
    ]
    if trip_rows_data:
        for tr in trip_rows_data:
            net = tr["user_balance"]
            net_text = f"+INR {net/100:,.2f}" if net > 0 else (f"-INR {abs(net)/100:,.2f}" if net < 0 else "INR 0.00")
            trip_table_rows.append([
                Paragraph(tr["name"], cell_bold),
                Paragraph(tr["destination"], cell_style),
                Paragraph(tr["status"], cell_style),
                Paragraph(f"INR {tr['total_expenses'] / 100:,.2f}", cell_right),
                Paragraph(f"INR {tr['user_paid'] / 100:,.2f}", cell_right),
                Paragraph(net_text, cell_right_bold)
            ])
    else:
        trip_table_rows.append([
            Paragraph("No trips recorded yet.", cell_style),
            Paragraph("—", cell_style),
            Paragraph("—", cell_style),
            Paragraph("INR 0.00", cell_right),
            Paragraph("INR 0.00", cell_right),
            Paragraph("INR 0.00", cell_right)
        ])

    trips_table = Table(trip_table_rows, colWidths=[120, 100, 65, 80, 80, 78], repeatRows=1)
    trips_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16834A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(trips_table)

    build_kwargs = {}
    if NumberedCanvas is not None:
        build_kwargs["canvasmaker"] = NumberedCanvas
    doc.build(elements, **build_kwargs)
    buffer.seek(0)
    
    filename = "ONNA_GO_Trip_History.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/history/export/csv")
def export_history_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(TripMember).filter(TripMember.user_id == current_user.id).all()
    trip_ids = [m.trip_id for m in memberships]
    
    trips = (
        db.query(Trip)
        .filter(Trip.id.in_(trip_ids))
        .order_by(Trip.created_at.desc())
        .all()
    )
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Trip ID",
        "Trip Name",
        "Destination",
        "Status",
        "Start Date",
        "End Date",
        "Total Group Expenses (INR)",
        "Your Contribution (INR)",
        "Your Balance (INR)"
    ])
    
    for t in trips:
        expenses_t = db.query(Expense).filter(Expense.trip_id == t.id, Expense.is_void == False).all()
        confirmed_st_t = db.query(Settlement).filter(Settlement.trip_id == t.id, Settlement.status == "CONFIRMED").all()
        all_m = [m.user_id for m in db.query(TripMember).filter(TripMember.trip_id == t.id).all()]
        
        exp_dicts = [
            {"id": e.id, "payer_id": e.payer_id, "amount_paise": e.amount_paise, "is_void": e.is_void, "splits": [{"user_id": s.user_id, "amount_paise": s.amount_paise} for s in e.splits]}
            for e in expenses_t
        ]
        st_dicts = [
            {"id": s.id, "payer_id": s.payer_id, "payee_id": s.payee_id, "amount_paise": s.amount_paise, "status": s.status}
            for s in confirmed_st_t
        ]
        
        calc_t = calculate_trip_balances(all_m, exp_dicts, st_dicts)
        user_spent = calc_t["total_spent_paise"].get(current_user.id, 0)
        user_bal = calc_t["net_balances"].get(current_user.id, 0)
        status_str = "COMPLETED" if (t.completed_at or t.is_archived) else "ACTIVE"
        
        writer.writerow([
            sanitize_csv_cell(t.id),
            sanitize_csv_cell(t.name),
            sanitize_csv_cell(t.destination or ""),
            sanitize_csv_cell(status_str),
            sanitize_csv_cell(t.start_date.strftime("%Y-%m-%d") if t.start_date else ""),
            sanitize_csv_cell(t.end_date.strftime("%Y-%m-%d") if t.end_date else ""),
            f"{calc_t['total_trip_expenses_paise'] / 100:.2f}",
            f"{user_spent / 100:.2f}",
            f"{user_bal / 100:.2f}"
        ])
        
    output.seek(0)
    filename = "ONNA_GO_Trip_History.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
