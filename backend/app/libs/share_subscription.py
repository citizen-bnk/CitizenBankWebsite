"""Share subscription and certificate generation utilities."""
import secrets
import qrcode
import io
from datetime import datetime
from decimal import Decimal


async def generate_certificate_number(conn) -> str:
    """
    Generate sequential certificate number in format: CB-SHARE-2025-00001
    
    Returns:
        str: Sequential certificate number
    """
    # Get current year
    year = datetime.now().year
    
    # Get last certificate number for this year
    last_cert = await conn.fetchrow(
        """
        SELECT certificate_number FROM share_certificates
        WHERE certificate_number LIKE $1
        ORDER BY certificate_number DESC
        LIMIT 1
        """,
        f"CB-SHARE-{year}-%"
    )
    
    if last_cert and last_cert['certificate_number']:
        # Extract sequence number and increment
        last_num = int(last_cert['certificate_number'].split('-')[-1])
        next_num = last_num + 1
    else:
        # First certificate of the year
        next_num = 1
    
    return f"CB-SHARE-{year}-{next_num:05d}"


def generate_verification_code() -> str:
    """
    Generate secure random verification code for certificate access.
    
    Returns:
        str: Random alphanumeric verification code (16 chars)
    """
    return secrets.token_urlsafe(12)[:16]


def generate_qr_code_svg(certificate_url: str, return_data_uri: bool = False) -> str:
    """
    Generate QR code as base64 PNG data for certificate access URL.
    
    Args:
        certificate_url: Full URL to certificate viewing page
        return_data_uri: If True, return full data URI. If False, return just base64 string.
    
    Returns:
        str: Base64 PNG data (or full data URI if return_data_uri=True)
    """
    # Create QR code instance
    qr = qrcode.QRCode(
        version=1,  # Controls size (1 = smallest)
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    
    qr.add_data(certificate_url)
    qr.make(fit=True)
    
    # Generate PNG image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 encoded PNG
    import base64
    png_buffer = io.BytesIO()
    img.save(png_buffer, format='PNG')
    png_buffer.seek(0)
    img_base64 = base64.b64encode(png_buffer.read()).decode()
    
    # Return based on preference
    if return_data_uri:
        return f"data:image/png;base64,{img_base64}"
    else:
        return img_base64


def generate_certificate_html(
    certificate_number: str,
    shareholder_name: str,
    id_number: str,
    num_shares: int,
    share_class: str,
    issue_date: datetime,
    qr_code_data: str = None,
    generation_timestamp: datetime = None,
    payment_status: str = 'paid',
    purchase_currency: str = 'LSL',
    purchase_exchange_rate: float = None,
    amount_in_purchase_currency: float = None,
    total_amount_lsl: float = None,
    # New parameters for versioning system
    version: int = None,
    verification_code: str = None,
    share_value: float = None,
    currency_symbol: str = 'M',
    company_secretary_name: str = None,
    company_secretary_signature: str = None,
    chairman_name: str = None,
    chairman_signature: str = None,
    watermark: str = None  # None, 'UNPAID', or custom watermark text
) -> str:
    """
    Generate certificate HTML based on the provided SVG design.
    
    Args:
        certificate_number: Sequential certificate number
        shareholder_name: Full name of shareholder
        id_number: ID number of shareholder
        num_shares: Number of shares
        share_class: Class of shares (A, B, C)
        issue_date: Date certificate was issued
        qr_code_data: Base64 encoded QR code image data (optional for preview)
        generation_timestamp: Current timestamp when certificate is viewed (defaults to now)
        payment_status: 'paid' or 'unpaid' to show watermark (deprecated - use watermark param)
        purchase_currency: Currency used for purchase (e.g., 'USD', 'EUR')
        purchase_exchange_rate: Exchange rate used at purchase time
        amount_in_purchase_currency: Amount paid in purchase currency
        total_amount_lsl: Total amount in LSL
        version: Certificate version number (for reissuance tracking)
        verification_code: Security verification code
        share_value: Total value of shares (num_shares × price_per_share)
        currency_symbol: Currency symbol to display (default 'M' for Maloti)
        company_secretary_name: Name of Company Secretary for signature
        company_secretary_signature: Base64 signature image data for Company Secretary
        chairman_name: Name of Chairman for signature
        chairman_signature: Base64 signature image data for Chairman
        watermark: Watermark text to display (None for no watermark, 'UNPAID', etc.)
    
    Returns:
        str: Complete HTML document for certificate
    """
    
    # Set defaults
    if generation_timestamp is None:
        generation_timestamp = datetime.now()
    
    # Format dates
    issue_date_str = issue_date.strftime("%d %B %Y")
    gen_timestamp_str = generation_timestamp.strftime("%d %B %Y, %H:%M CAT")
    
    # Determine watermark (backwards compatibility)
    if watermark is None and payment_status != 'paid':
        watermark = 'UNPAID'
    
    # Build version info HTML
    version_info_html = ""
    if version is not None:
        version_info_html = f"<p>Version: {version}</p>"
    
    # Build verification code HTML
    verification_code_html = ""
    if verification_code:
        verification_code_html = f"<p>Verification: {verification_code}</p>"
    
    # Build share value HTML
    share_value_html = ""
    if share_value is not None:
        share_value_html = f"<p>Total Value: {currency_symbol} {share_value:,.2f}</p>"
    
    # Build currency information HTML
    currency_info_html = ""
    if purchase_currency and purchase_currency != 'LSL' and purchase_exchange_rate and amount_in_purchase_currency:
        currency_info_html = f"""
                <div class="currency-info">
                    <p><strong>Payment Information:</strong></p>
                    <p>Amount Paid: {purchase_currency} {amount_in_purchase_currency:,.2f}</p>
                    <p>LSL Equivalent: M {total_amount_lsl:,.2f} LSL</p>
                    <p>Exchange Rate: 1 {purchase_currency} = {1/purchase_exchange_rate:.4f} LSL</p>
                    <p>Date of Purchase: {issue_date_str}</p>
                </div>
        """
    
    # Build unpaid watermark and banner
    unpaid_watermark_html = ""
    unpaid_banner_html = ""
    unpaid_footer_html = ""
    
    if watermark == 'UNPAID':
        unpaid_watermark_html = """
                <!-- UNPAID WATERMARK -->
                <div class="unpaid-watermark">UNPAID</div>
        """
        unpaid_banner_html = """
                <!-- UNPAID BANNER -->
                <div class="unpaid-banner">
                    ⚠️ PAYMENT REQUIRED - This certificate will be issued upon receipt of payment
                </div>
        """
        unpaid_footer_html = """
                <div class="unpaid-footer">
                    Complete your payment to activate this certificate and secure your shares.
                </div>
        """
    
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Share Certificate - {certificate_number}</title>
    <style>
        @page {{
            size: A4;
            margin: 0;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }}
        
        .certificate-container {{
            width: 850px;
            height: 600px;
            margin: 0 auto;
            background: white;
            position: relative;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }}
        
        .gradient-border {{
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #FB0066 0%, #A600FF 50%, #FB6B00 100%);
            padding: 10px;
        }}
        
        .certificate-inner {{
            width: 100%;
            height: 100%;
            background: white;
            position: relative;
            overflow: hidden;
        }}
        
        /* Background C logo */
        .background-c {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.15;
            width: 400px;
            height: 400px;
        }}
        
        /* Timestamp disclaimer - top right */
        .timestamp-disclaimer {{
            position: absolute;
            top: 20px;
            right: 20px;
            text-align: right;
            font-size: 11px;
            color: #666;
            max-width: 250px;
        }}
        
        .timestamp-disclaimer strong {{
            color: #A600FF;
            display: block;
            margin-bottom: 3px;
        }}
        
        /* Header */
        .certificate-header {{
            text-align: center;
            padding-top: 60px;
            position: relative;
            z-index: 10;
        }}
        
        .certificate-title {{
            font-family: serif;
            font-size: 48px;
            font-weight: bold;
            color: #2F004F;
            margin-bottom: 10px;
        }}
        
        .bank-name {{
            font-size: 20px;
            color: #333;
            margin-bottom: 5px;
        }}
        
        .tagline {{
            font-size: 14px;
            color: #555;
        }}
        
        /* Holder details section */
        .holder-section {{
            margin: 40px 100px;
            position: relative;
            z-index: 10;
            border: 1px solid #ccc;
            padding: 20px;
            background: rgba(255,255,255,0.9);
        }}
        
        .holder-section p {{
            margin: 15px 0;
            font-size: 16px;
            color: #555;
        }}
        
        .holder-section .value {{
            display: inline-block;
            background: #f0f0f0;
            padding: 5px 10px;
            border: 0.5px solid #ddd;
            color: #333;
            min-width: 300px;
        }}
        
        /* Certificate info */
        .certificate-info {{
            margin: 30px 100px;
            display: flex;
            justify-content: space-between;
            position: relative;
            z-index: 10;
        }}
        
        .certificate-info div {{
            font-size: 14px;
            color: #555;
        }}
        
        /* Signature section */
        .signature-section {{
            position: absolute;
            bottom: 50px;
            right: 100px;
            text-align: center;
            z-index: 10;
        }}
        
        .signature-line {{
            width: 250px;
            border-top: 1px solid #333;
            margin-bottom: 10px;
        }}
        
        .signature-section p {{
            font-size: 12px;
            color: #333;
            margin: 3px 0;
        }}
        
        /* Logo section */
        .logo-section {{
            position: absolute;
            bottom: 50px;
            left: 100px;
            z-index: 10;
        }}
        
        .logo-section .logo-text {{
            font-size: 18px;
            font-weight: bold;
            color: #2F004F;
        }}
        
        .logo-section .logo-tagline {{
            font-size: 10px;
            color: #555;
        }}
        
        /* QR Code - bottom right */
        .qr-code-section {{
            position: absolute;
            bottom: 150px;
            right: 100px;
            text-align: center;
            z-index: 10;
        }}
        
        .qr-code-section img {{
            width: 120px;
            height: 120px;
            border: 2px solid #ddd;
            padding: 5px;
            background: white;
        }}
        
        .qr-code-section p {{
            font-size: 9px;
            color: #666;
            margin-top: 5px;
            max-width: 120px;
        }}
        
        /* UNPAID WATERMARK STYLES */
        .unpaid-watermark {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            font-weight: bold;
            color: rgba(255, 0, 0, 0.15);
            z-index: 5;
            pointer-events: none;
            user-select: none;
            letter-spacing: 20px;
        }}
        
        .unpaid-banner {{
            position: absolute;
            top: 45px;
            left: 0;
            right: 0;
            background: #dc2626;
            color: white;
            text-align: center;
            padding: 8px 20px;
            font-size: 13px;
            font-weight: bold;
            z-index: 15;
            box-shadow: 0 2px 10px rgba(220, 38, 38, 0.3);
        }}
        
        .unpaid-footer {{
            position: absolute;
            bottom: 20px;
            left: 100px;
            right: 100px;
            text-align: center;
            font-size: 12px;
            color: #dc2626;
            font-weight: bold;
            z-index: 15;
            background: rgba(254, 226, 226, 0.9);
            padding: 8px;
            border: 1px solid #dc2626;
            border-radius: 4px;
        }}
        
        .currency-info {{
            position: absolute;
            top: 380px;
            left: 100px;
            background: rgba(240, 240, 255, 0.95);
            padding: 15px;
            border: 1px solid #ccc;
            border-radius: 4px;
            z-index: 10;
            max-width: 350px;
        }}
        
        .currency-info p {{
            margin: 5px 0;
            font-size: 12px;
            color: #333;
        }}
        
        .currency-info strong {{
            color: #2F004F;
        }}
        
        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            
            .certificate-container {{
                box-shadow: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="gradient-border">
            <div class="certificate-inner">
{unpaid_watermark_html}
{unpaid_banner_html}
                <!-- Background C logo -->
                <svg class="background-c" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#FB0066;stop-opacity:0.2" />
                            <stop offset="50%" style="stop-color:#A600FF;stop-opacity:0.2" />
                            <stop offset="100%" style="stop-color:#FB6B00;stop-opacity:0.2" />
                        </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="80" fill="url(#bgGradient)" />
                    <circle cx="100" cy="100" r="50" fill="none" stroke="url(#bgGradient)" stroke-width="20" />
                </svg>
                
                <!-- Timestamp Disclaimer -->
                <div class="timestamp-disclaimer">
                    <strong>Certificate Generated:</strong>
                    {gen_timestamp_str}<br>
                    <em>Information accurate as at time of generation</em>
                </div>
                
                <!-- Header -->
                <div class="certificate-header">
                    <div class="certificate-title">SHARES CERTIFICATE</div>
                    <div class="bank-name">CITIZEN BANK</div>
                    <div class="tagline">as long as you're a citizen</div>
                </div>
                
                <!-- Holder Details -->
                <div class="holder-section">
                    <p>THIS CERTIFIES THAT</p>
                    <p>
                        INVESTOR NAME: <span class="value">{shareholder_name}</span>
                    </p>
                    <p>IS THE REGISTERED HOLDER OF</p>
                    <p>
                        NUMBER: <span class="value">{num_shares:,}</span> FULLY PAID ORDINARY SHARES
                    </p>
                </div>
                
                <!-- Certificate Info -->
                <div class="certificate-info">
                    <div>
                        <p>Certificate No: {certificate_number}</p>
                        <p>Share Class: {share_class}</p>
                        {version_info_html}
                    </div>
                    <div>
                        <p>Issue Date: {issue_date_str}</p>
                        <p>ID Number: {id_number}</p>
                        {share_value_html}
                        {verification_code_html}
                    </div>
                </div>
                
                <!-- QR Code -->
                {'<div class="qr-code-section">' if qr_code_data else ''}
                    {f'<img src="{qr_code_data}" alt="Certificate QR Code">' if qr_code_data else ''}
                    {f'<p>Scan to view or share certificate</p>' if qr_code_data else ''}
                {'</div>' if qr_code_data else ''}
                
                <!-- Signatures -->
                <div class="signature-section">
                    {f'<img src="{company_secretary_signature}" alt="Signature" style="max-width: 200px; height: 60px; margin-bottom: 5px;">' if company_secretary_signature else '<div class="signature-line"></div>'}
                    <p>{'Authorized Signature' if not company_secretary_name else company_secretary_name}</p>
                    <p>COMPANY SECRETARY</p>
                </div>
                
                <!-- Chairman Signature -->
                <div class="chairman-section" style="position: absolute; bottom: 50px; left: 400px; text-align: center; z-index: 10;">
                    {f'<img src="{chairman_signature}" alt="Signature" style="max-width: 200px; height: 60px; margin-bottom: 5px;">' if chairman_signature else '<div style="width: 250px; border-top: 1px solid #333; margin-bottom: 10px;"></div>'}
                    <p style="font-size: 12px; color: #333; margin: 3px 0;">{'Authorized Signature' if not chairman_name else chairman_name}</p>
                    <p style="font-size: 12px; color: #333; margin: 3px 0;">CHAIRMAN</p>
                </div>
                
                <!-- Logo -->
                <div class="logo-section">
                    <div class="logo-text">Citizen Bank</div>
                    <div class="logo-tagline">as long as you're a citizen</div>
                </div>
                
{currency_info_html}
{unpaid_footer_html}
            </div>
        </div>
    </div>
</body>
</html>
    """
    
    return html
