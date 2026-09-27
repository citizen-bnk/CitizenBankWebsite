"""PDF Receipt Generator for Share Subscription Payments"""
import io
from datetime import datetime
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch


class ReceiptGenerator:
    """Generate professional payment receipts as PDFs"""
    
    def __init__(self):
        self.pagesize = A4
        self.width, self.height = self.pagesize
        
    def generate_payment_receipt(
        self,
        receipt_number: str,
        subscription_id: str,
        shareholder_name: str,
        payment_amount: Decimal,
        payment_reference: str,
        payment_date: datetime,
        num_shares: int,
        total_subscription: Decimal,
        amount_paid_to_date: Decimal
    ) -> bytes:
        """
        Generate a payment receipt PDF
        
        Args:
            receipt_number: Unique receipt number
            subscription_id: Subscription reference
            shareholder_name: Name of the investor
            payment_amount: Amount paid in this transaction
            payment_reference: Payment reference number
            payment_date: Date of payment
            num_shares: Number of shares subscribed
            total_subscription: Total subscription amount
            amount_paid_to_date: Total amount paid including this payment
            
        Returns:
            PDF as bytes
        """
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=self.pagesize)
        c.setTitle(f"Payment Receipt {receipt_number}")
        
        # Header with border
        c.setStrokeColor(colors.HexColor('#1e40af'))
        c.setLineWidth(2)
        c.rect(40, self.height - 150, self.width - 80, 120, stroke=1, fill=0)
        
        # Company Name
        y_position = self.height - 70
        c.setFont('Helvetica-Bold', 24)
        c.setFillColor(colors.HexColor('#1e40af'))
        c.drawCentredString(self.width/2, y_position, 'CITIZEN BANK')
        
        y_position -= 20
        c.setFont('Helvetica', 10)
        c.setFillColor(colors.black)
        c.drawCentredString(self.width/2, y_position, 'Lesotho')
        
        # Receipt Title
        y_position -= 30
        c.setFont('Helvetica-Bold', 18)
        c.setFillColor(colors.HexColor('#1e40af'))
        c.drawCentredString(self.width/2, y_position, 'PAYMENT RECEIPT')
        
        # Receipt Number
        y_position -= 25
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.gray)
        c.drawCentredString(self.width/2, y_position, f'Receipt No: {receipt_number}')
        
        # Date issued
        y_position -= 40
        c.setFont('Helvetica', 10)
        c.setFillColor(colors.black)
        c.drawString(60, y_position, f'Issue Date: {datetime.now().strftime("%d %B %Y")}')
        c.drawRightString(self.width - 60, y_position, f'Payment Date: {payment_date.strftime("%d %B %Y")}')
        
        # Horizontal line
        y_position -= 15
        c.setStrokeColor(colors.HexColor('#3b82f6'))
        c.setLineWidth(1)
        c.line(60, y_position, self.width - 60, y_position)
        
        # Received From section
        y_position -= 30
        c.setFont('Helvetica-Bold', 12)
        c.drawString(60, y_position, 'Received From:')
        
        y_position -= 20
        c.setFont('Helvetica', 11)
        c.drawString(60, y_position, shareholder_name)
        
        # Payment details box
        y_position -= 40
        box_height = 140
        c.setFillColor(colors.HexColor('#f0f9ff'))
        c.rect(60, y_position - box_height, self.width - 120, box_height, stroke=1, fill=1)
        
        # Payment amount (large and prominent)
        c.setFont('Helvetica-Bold', 11)
        c.setFillColor(colors.black)
        c.drawString(80, y_position - 25, 'Payment Amount:')
        
        c.setFont('Helvetica-Bold', 24)
        c.setFillColor(colors.HexColor('#059669'))
        c.drawString(80, y_position - 55, f'M {payment_amount:,.2f}')
        
        # Payment details
        c.setFont('Helvetica', 10)
        c.setFillColor(colors.black)
        detail_y = y_position - 85
        
        c.drawString(80, detail_y, f'Payment Reference: {payment_reference}')
        detail_y -= 18
        c.drawString(80, detail_y, f'Subscription ID: {subscription_id}')
        detail_y -= 18
        c.drawString(80, detail_y, f'Shares: {num_shares:,} shares')
        
        # Summary section
        y_position = y_position - box_height - 40
        c.setFont('Helvetica-Bold', 11)
        c.drawString(60, y_position, 'Subscription Summary:')
        
        y_position -= 25
        c.setFont('Helvetica', 10)
        
        # Summary table
        c.drawString(80, y_position, 'Total Subscription Amount:')
        c.drawRightString(self.width - 80, y_position, f'M {total_subscription:,.2f}')
        
        y_position -= 20
        c.drawString(80, y_position, 'Amount Paid to Date:')
        c.drawRightString(self.width - 80, y_position, f'M {amount_paid_to_date:,.2f}')
        
        y_position -= 20
        c.setFont('Helvetica-Bold', 10)
        remaining = total_subscription - amount_paid_to_date
        c.drawString(80, y_position, 'Outstanding Balance:')
        c.setFillColor(colors.HexColor('#dc2626') if remaining > 0 else colors.HexColor('#059669'))
        c.drawRightString(self.width - 80, y_position, f'M {remaining:,.2f}')
        
        # Payment status
        y_position -= 30
        c.setFillColor(colors.black)
        c.setFont('Helvetica', 10)
        if remaining <= 0:
            c.drawString(60, y_position, 'Status: FULLY PAID ✓')
        else:
            c.drawString(60, y_position, f'Status: PARTIAL PAYMENT ({(amount_paid_to_date/total_subscription*100):.1f}% completed)')
        
        # Footer notes
        y_position -= 50
        c.setFont('Helvetica-Oblique', 9)
        c.setFillColor(colors.gray)
        c.drawString(60, y_position, 'This is an official payment receipt for share subscription.')
        
        y_position -= 15
        c.drawString(60, y_position, 'Share certificate will be issued upon full payment verification.')
        
        # Footer with contact
        c.setFont('Helvetica', 8)
        c.drawCentredString(self.width/2, 60, 'Citizen Bank - Lesotho')
        c.drawCentredString(self.width/2, 48, 'For inquiries: info@citizenhub.co.za | citizenhub.co.za')
        
        c.drawString(60, 50, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}')
        
        # Finish PDF
        c.showPage()
        c.save()
        
        buffer.seek(0)
        return buffer.getvalue()


def generate_receipt(
    receipt_number: str,
    subscription_id: str,
    shareholder_name: str,
    payment_amount: Decimal,
    payment_reference: str,
    payment_date: datetime,
    num_shares: int,
    total_subscription: Decimal,
    amount_paid_to_date: Decimal
) -> bytes:
    """
    Convenience function to generate a payment receipt
    
    Args:
        receipt_number: Unique receipt number
        subscription_id: Subscription reference
        shareholder_name: Name of the investor
        payment_amount: Amount paid in this transaction
        payment_reference: Payment reference number
        payment_date: Date of payment
        num_shares: Number of shares subscribed
        total_subscription: Total subscription amount
        amount_paid_to_date: Total amount paid including this payment
        
    Returns:
        PDF as bytes
    """
    generator = ReceiptGenerator()
    return generator.generate_payment_receipt(
        receipt_number=receipt_number,
        subscription_id=subscription_id,
        shareholder_name=shareholder_name,
        payment_amount=payment_amount,
        payment_reference=payment_reference,
        payment_date=payment_date,
        num_shares=num_shares,
        total_subscription=total_subscription,
        amount_paid_to_date=amount_paid_to_date
    )
