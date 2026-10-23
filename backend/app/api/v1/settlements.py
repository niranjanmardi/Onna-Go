import json
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import Settlement, SettlementEvent, TripMember, User, Notification, AuditLog
from backend.app.schemas.schemas import SettlementCreate, SettlementStatusUpdate, SettlementResponse
from backend.app.api.v1.deps import get_current_user, require_trip_membership

router = APIRouter(prefix="/settlements", tags=["Settlements"])

def build_settlement_response(s: Settlement, db: Session) -> SettlementResponse:
    payer = db.query(User).filter(User.id == s.payer_id).first()
    payee = db.query(User).filter(User.id == s.payee_id).first()
    return SettlementResponse(
        id=s.id,
        trip_id=s.trip_id,
        payer_id=s.payer_id,
        payer_name=payer.full_name if payer else "Member",
        payer_upi_id=payer.upi_id if payer else None,
        payee_id=s.payee_id,
        payee_name=payee.full_name if payee else "Member",
        payee_upi_id=payee.upi_id if payee else None,
        amount_paise=s.amount_paise,
        status=s.status,
        payment_method=s.payment_method,
        reference_id=s.reference_id,
        notes=s.notes,
        created_by_id=s.created_by_id,
        confirmed_at=s.confirmed_at,
        created_at=s.created_at,
        updated_at=s.updated_at
    )

@router.post("/", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def create_settlement(
    st_in: SettlementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify trip membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == st_in.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this trip.")
        
    if st_in.payer_id == st_in.payee_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payer and Payee cannot be the same person.")
        
    # Check both users exist in trip
    payer_member = db.query(TripMember).filter(TripMember.trip_id == st_in.trip_id, TripMember.user_id == st_in.payer_id).first()
    payee_member = db.query(TripMember).filter(TripMember.trip_id == st_in.trip_id, TripMember.user_id == st_in.payee_id).first()
    if not payer_member or not payee_member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Both payer and payee must be trip members.")

    # Duplicate check: prevent duplicate pending settlement records
    existing_pending = db.query(Settlement).filter(
        Settlement.trip_id == st_in.trip_id,
        Settlement.payer_id == st_in.payer_id,
        Settlement.payee_id == st_in.payee_id,
        Settlement.amount_paise == st_in.amount_paise,
        Settlement.status.in_(["INITIATED", "PENDING_CONFIRMATION"])
    ).first()
    if existing_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A payment of this amount between these members is already awaiting confirmation. Duplicate submission prevented."
        )
        
    initial_status = st_in.status.upper() if st_in.status else "PENDING_CONFIRMATION"
    if initial_status not in ["INITIATED", "PENDING_CONFIRMATION"]:
        initial_status = "PENDING_CONFIRMATION"

    settlement = Settlement(
        trip_id=st_in.trip_id,
        payer_id=st_in.payer_id,
        payee_id=st_in.payee_id,
        amount_paise=st_in.amount_paise,
        status=initial_status,
        payment_method=st_in.payment_method,
        reference_id=st_in.reference_id,
        notes=st_in.notes,
        created_by_id=current_user.id
    )
    db.add(settlement)
    db.flush()
    
    # Record event
    event = SettlementEvent(
        settlement_id=settlement.id,
        actor_id=current_user.id,
        from_status="NONE",
        to_status=initial_status,
        reason=f"Settlement marked as {initial_status} by {current_user.full_name}"
    )
    db.add(event)
    
    # Notify payee to verify and confirm receipt
    payer_user = db.query(User).filter(User.id == st_in.payer_id).first()
    notif = Notification(
        user_id=st_in.payee_id,
        title="Payment initiated for confirmation",
        message=f"{payer_user.full_name if payer_user else 'Member'} reported initiating a payment of ₹{st_in.amount_paise / 100:.2f}. Please verify in your bank/UPI app and confirm receipt.",
        type="SETTLEMENT",
        link_url=f"/trips/{st_in.trip_id}"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(settlement)
    return build_settlement_response(settlement, db)

@router.get("/trip/{trip_id}", response_model=List[SettlementResponse])
def list_trip_settlements(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    settlements = (
        db.query(Settlement)
        .filter(Settlement.trip_id == trip_id)
        .order_by(Settlement.created_at.desc())
        .all()
    )
    return [build_settlement_response(s, db) for s in settlements]

@router.put("/{settlement_id}/status", response_model=SettlementResponse)
def update_settlement_status(
    settlement_id: str,
    status_update: SettlementStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settlement = db.query(Settlement).filter(Settlement.id == settlement_id).first()
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settlement not found.")
        
    member = db.query(TripMember).filter(
        TripMember.trip_id == settlement.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
        
    target_status = status_update.status.upper()
    valid_statuses = ["PENDING_CONFIRMATION", "INITIATED", "CONFIRMED", "DISPUTED", "CANCELLED"]
    if target_status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {target_status}")
        
    # Permission rules:
    # To CONFIRM: Payee (who receives money) or Trip OWNER/ADMIN
    if target_status == "CONFIRMED":
        if current_user.id != settlement.payee_id and member.role not in ["OWNER", "ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the payee (recipient) or trip owner/admin can confirm settlement receipt."
            )
        settlement.confirmed_at = datetime.now(timezone.utc)
        
    # To CANCEL: Creator or Payer
    elif target_status == "CANCELLED":
        if current_user.id not in [settlement.created_by_id, settlement.payer_id] and member.role not in ["OWNER", "ADMIN"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this settlement.")
            
    # To DISPUTE: Either party
    elif target_status == "DISPUTED":
        if current_user.id not in [settlement.payer_id, settlement.payee_id] and member.role not in ["OWNER", "ADMIN"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to dispute.")
            
    old_status = settlement.status
    settlement.status = target_status
    
    event = SettlementEvent(
        settlement_id=settlement.id,
        actor_id=current_user.id,
        from_status=old_status,
        to_status=target_status,
        reason=status_update.reason or f"Status changed to {target_status}"
    )
    db.add(event)
    
    # Audit log
    audit = AuditLog(
        trip_id=settlement.trip_id,
        user_id=current_user.id,
        action=f"SETTLEMENT_{target_status}",
        entity_type="SETTLEMENT",
        entity_id=settlement.id,
        details_json=json.dumps({"old_status": old_status, "new_status": target_status, "reason": status_update.reason})
    )
    db.add(audit)
    
    # Notification
    other_party_id = settlement.payer_id if current_user.id == settlement.payee_id else settlement.payee_id
    notif = Notification(
        user_id=other_party_id,
        title=f"Settlement marked as {target_status.replace('_', ' ').title()}",
        message=f"A payment of ₹{settlement.amount_paise / 100:.2f} is now {target_status}.",
        type="SETTLEMENT",
        link_url=f"/trips/{settlement.trip_id}"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(settlement)
    return build_settlement_response(settlement, db)
