"""PDF Welcome Letter Generator for New Shareholders"""
import io
from datetime import datetime
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch


class WelcomeLetterGenerator:
    """Generate professional welcome letters for new shareholders"""
    
    def __init__(self):
        self.pagesize = A4
        self.width, self.height = self.pagesize
        
    def generate_welcome_letter(
        self,
        shareholder_name: str,
        num_shares: int,
        certificate_number: str,
        subscription_id: str,
        investment_amount: Decimal
    ) -> bytes:
        """
        Generate a welcome letter PDF for new shareholders
        
        Args:
            shareholder_name: Name of the new shareholder
            num_shares: Number of shares owned
            certificate_number: Certificate number issued
            subscription_id: Original subscription reference
            investment_amount: Total investment amount
            
        Returns:
            PDF as bytes
        """
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=self.pagesize)
        c.setTitle(f"Welcome Letter - {shareholder_name}")
        
        # Letterhead
        y_position = self.height - 80
        c.setFont('Helvetica-Bold', 20)
        c.setFillColor(colors.HexColor('#1e40af'))
        c.drawString(60, y_position, 'CITIZEN BANK')
        
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.gray)
        y_position -= 15
        c.drawString(60, y_position, 'Lesotho')
        
        # Date
        y_position -= 40
        c.setFont('Helvetica', 10)
        c.setFillColor(colors.black)
        c.drawString(60, y_position, datetime.now().strftime("%d %B %Y"))
        
        # Recipient
        y_position -= 40
        c.setFont('Helvetica-Bold', 11)
        c.drawString(60, y_position, shareholder_name)
        
        y_position -= 15
        c.setFont('Helvetica', 10)
        c.drawString(60, y_position, f'Shareholder ID: {subscription_id}')
        
        # Subject line
        y_position -= 40
        c.setFont('Helvetica-Bold', 12)
        c.drawString(60, y_position, 'Re: Welcome to Citizen Bank Shareholders')
        
        # Horizontal line
        y_position -= 10
        c.setStrokeColor(colors.HexColor('#3b82f6'))
        c.setLineWidth(0.5)
        c.line(60, y_position, self.width - 60, y_position)
        
        # Letter body
        y_position -= 30
        c.setFont('Helvetica', 11)
        c.setFillColor(colors.black)
        
        # Greeting
        c.drawString(60, y_position, f'Dear {shareholder_name},')
        
        y_position -= 25
        # Paragraph 1
        text_lines = [
            "On behalf of the Board of Directors and the entire team at Citizen Bank, I am delighted to",
            "welcome you as a valued shareholder. Your investment represents more than just financial",
            "commitment—it demonstrates your belief in our vision to build a stronger, more inclusive banking",
            "sector in Lesotho."
        ]
        
        for line in text_lines:
            c.drawString(60, y_position, line)
            y_position -= 15
        
        # Investment summary box
        y_position -= 20
        box_height = 100
        c.setFillColor(colors.HexColor('#f0f9ff'))
        c.setStrokeColor(colors.HexColor('#3b82f6'))
        c.rect(60, y_position - box_height, self.width - 120, box_height, stroke=1, fill=1)
        
        c.setFont('Helvetica-Bold', 11)
        c.setFillColor(colors.HexColor('#1e40af'))
        c.drawString(80, y_position - 25, 'Your Investment Summary')
        
        c.setFont('Helvetica', 10)
        c.setFillColor(colors.black)
        summary_y = y_position - 50
        
        c.drawString(80, summary_y, 'Number of Shares:')
        c.setFont('Helvetica-Bold', 10)
        c.drawRightString(self.width - 80, summary_y, f'{num_shares:,} shares')
        
        summary_y -= 20
        c.setFont('Helvetica', 10)
        c.drawString(80, summary_y, 'Investment Amount:')
        c.setFont('Helvetica-Bold', 10)
        c.drawRightString(self.width - 80, summary_y, f'M {investment_amount:,.2f}')
        
        summary_y -= 20
        c.setFont('Helvetica', 10)
        c.drawString(80, summary_y, 'Certificate Number:')
        c.setFont('Helvetica-Bold', 10)
        c.drawRightString(self.width - 80, summary_y, certificate_number)
        
        # Continue letter
        y_position = y_position - box_height - 30
        c.setFont('Helvetica', 11)
        c.setFillColor(colors.black)
        
        text_lines = [
            "As a shareholder, you are now part of an exciting journey to transform banking in Lesotho. You will",
            "enjoy several benefits including:"
        ]
        
        for line in text_lines:
            c.drawString(60, y_position, line)
            y_position -= 15
        
        # Benefits list
        y_position -= 10
        benefits = [
            "Dividend payments based on the bank's profitability",
            "Voting rights at Annual General Meetings",
            "Access to exclusive shareholder communications and reports",
            "Priority consideration for banking products and services"
        ]
        
        for benefit in benefits:
            c.drawString(80, y_position, f'• {benefit}')
            y_position -= 15
        
        # Next steps
        y_position -= 20
        c.setFont('Helvetica-Bold', 11)
        c.drawString(60, y_position, 'What Happens Next:')
        
        y_position -= 20
        c.setFont('Helvetica', 11)
        next_steps = [
            "Your share certificate has been issued and is attached to this welcome package",
            "You will receive updates on our progress towards obtaining our banking license",
            "Watch for invitations to shareholder meetings and important announcements",
            "Access your shareholder portal at citizenhub.co.za for updates and documents"
        ]
        
        for step in next_steps:
            c.drawString(80, y_position, f'{next_steps.index(step) + 1}. {step}')
            y_position -= 15
        
        # Closing
        y_position -= 25
        closing_lines = [
            "Thank you for your trust and investment in Citizen Bank. Together, we will build a financial",
            "institution that serves the people of Lesotho with integrity, innovation, and excellence."
        ]
        
        for line in closing_lines:
            c.drawString(60, y_position, line)
            y_position -= 15
        
        y_position -= 15
        c.drawString(60, y_position, 'Warm regards,')
        
        # Signature space
        y_position -= 50
        c.setFont('Helvetica-Bold', 11)
        c.drawString(60, y_position, '_______________________')
        
        y_position -= 20
        c.setFont('Helvetica-Bold', 10)
        c.drawString(60, y_position, 'Board of Directors')
        c.setFont('Helvetica', 9)
        y_position -= 12
        c.drawString(60, y_position, 'Citizen Bank, Lesotho')
        
        # Footer
        c.setFont('Helvetica', 8)
        c.setFillColor(colors.gray)
        c.drawCentredString(self.width/2, 60, 'Citizen Bank - Building Financial Futures in Lesotho')
        c.drawCentredString(self.width/2, 48, 'info@citizenhub.co.za | citizenhub.co.za')
        
        # Finish PDF
        c.showPage()
        c.save()
        
        buffer.seek(0)
        return buffer.getvalue()


def generate_welcome_letter(
    shareholder_name: str,
    num_shares: int,
    certificate_number: str,
    subscription_id: str,
    investment_amount: Decimal
) -> bytes:
    """
    Convenience function to generate a welcome letter
    
    Args:
        shareholder_name: Name of the new shareholder
        num_shares: Number of shares owned
        certificate_number: Certificate number issued
        subscription_id: Original subscription reference
        investment_amount: Total investment amount
        
    Returns:
        PDF as bytes
    """
    generator = WelcomeLetterGenerator()
    return generator.generate_welcome_letter(
        shareholder_name=shareholder_name,
        num_shares=num_shares,
        certificate_number=certificate_number,
        subscription_id=subscription_id,
        investment_amount=investment_amount
    )
