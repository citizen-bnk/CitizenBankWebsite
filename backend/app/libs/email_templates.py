from typing import Optional, List, Dict
from datetime import datetime
import databutton as db
import os

# Citizen Bank Brand Colors
BRAND_PURPLE = "#2F004F"
BRAND_PINK = "#FB0066"
BRAND_GRADIENT = "linear-gradient(to right, #FB0066, #A600FF, #FB6B00)"

# Logo URL (static asset)
LOGO_URL = "https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/logo.png"


def get_base_url() -> str:
    """Get the base frontend URL based on current environment"""
    from app.libs.url_helpers import get_frontend_base_url
    return get_frontend_base_url()


def create_icon_item(icon_url: str, label: str) -> str:
    """Create an icon item for the icon section."""
    return f"""
    <div class="icon-item">
        <img src="{icon_url}" alt="{label} Icon">
        <p>{label}</p>
    </div>
    """


def create_cta_button(text: str, url: str) -> str:
    """Create a call-to-action button."""
    return f'<a href="{url}" class="cta-button">{text}</a>'


def build_email_template(
    hero_title: str,
    greeting: str,
    main_content: str,
    cta_section: Optional[Dict[str, str]] = None,
    icon_items: Optional[List[Dict[str, str]]] = None,
    footer_extra: Optional[str] = None
) -> str:
    """
    Build a standardized Citizen Bank email template.
    
    Args:
        hero_title: Large title in the hero section (e.g., "Unlock Your Future")
        greeting: Personalized greeting (e.g., "Hi John,<br>Exclusive Offers Await You")
        main_content: Main HTML content of the email
        cta_section: Optional dict with 'title', 'button_text', 'button_url', 'image_url'
        icon_items: Optional list of dicts with 'icon_url' and 'label'
        footer_extra: Optional extra footer text
    
    Returns:
        Complete HTML email string
    """
    
    # Build icon section if provided
    icon_section_html = ""
    if icon_items:
        icons_html = "".join([create_icon_item(item['icon_url'], item['label']) for item in icon_items])
        icon_section_html = f"""
        <div class="icon-section">
            {icons_html}
        </div>
        """
    
    # Build CTA section if provided
    cta_section_html = ""
    if cta_section:
        cta_button = create_cta_button(cta_section.get('button_text', 'Learn More'), cta_section.get('button_url', '#'))
        cta_image = ""
        if cta_section.get('image_url'):
            cta_image = f'<div class="image-group"><img src="{cta_section["image_url"]}" alt="{cta_section.get("image_alt", "")}" style="max-width: 250px;"></div>'
        
        cta_section_html = f"""
        <div class="cta-section">
            <h3>{cta_section.get('title', '')}</h3>
            {cta_button}
            {cta_image}
        </div>
        """
    
    # Footer content
    current_year = datetime.now().year
    footer_content = f"""
    <p>&copy; {current_year} Citizen Bank. All Rights Reserved.</p>
    <p>123 Financial Ave, Maseru, Lesotho | <a href="{get_base_url()}/contact">Contact Us</a></p>
    """
    if footer_extra:
        footer_content += f"<p>{footer_extra}</p>"
    
    # Build complete email
    return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Citizen Bank</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background-color: {BRAND_PURPLE};
            padding: 20px;
            color: #ffffff;
            text-align: center;
        }}
        .header .logo {{
            max-width: 180px;
            margin-bottom: 10px;
        }}
        .header p {{
            margin: 0;
            font-size: 14px;
        }}
        .hero {{
            background: {BRAND_GRADIENT};
            padding: 40px 20px;
            text-align: center;
            color: #ffffff;
        }}
        .hero h1 {{
            margin: 0;
            font-size: 32px;
            font-weight: bold;
        }}
        .content {{
            padding: 30px 20px;
            color: #333333;
            text-align: center;
        }}
        .content h2 {{
            font-size: 24px;
            margin-top: 0;
            color: {BRAND_PURPLE};
        }}
        .content p {{
            font-size: 16px;
            line-height: 1.6;
        }}
        .content table {{
            width: 100%;
            margin: 20px 0;
            text-align: left;
        }}
        .content table td {{
            padding: 8px;
            border-bottom: 1px solid #eeeeee;
        }}
        .content table td:first-child {{
            font-weight: bold;
            color: {BRAND_PURPLE};
        }}
        .icon-section {{
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            padding: 20px 0;
            border-bottom: 1px solid #eeeeee;
        }}
        .icon-item {{
            text-align: center;
            margin: 0 15px 20px;
        }}
        .icon-item img {{
            width: 60px;
            height: 60px;
            margin-bottom: 10px;
        }}
        .icon-item p {{
            margin: 0;
            font-size: 14px;
            color: #555555;
        }}
        .cta-section {{
            padding: 30px 20px;
            text-align: center;
            background-color: #f9f9f9;
        }}
        .cta-section h3 {{
            font-size: 20px;
            color: {BRAND_PURPLE};
            margin-bottom: 15px;
        }}
        .cta-button {{
            display: inline-block;
            background-color: {BRAND_PINK};
            color: #ffffff;
            padding: 12px 25px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
        }}
        .image-group {{
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 20px;
            flex-wrap: wrap;
        }}
        .image-group img {{
            max-width: 100%;
            height: auto;
            border-radius: 5px;
            margin: 5px;
        }}
        .qr-code {{
            margin: 20px auto;
            padding: 20px;
            background: white;
            border: 2px solid {BRAND_PURPLE};
            border-radius: 8px;
            display: inline-block;
        }}
        .qr-code img {{
            display: block;
            max-width: 250px;
            height: auto;
        }}
        .footer {{
            background-color: {BRAND_PURPLE};
            color: #ffffff;
            padding: 20px;
            text-align: center;
            font-size: 12px;
        }}
        .footer a {{
            color: #ffffff;
            text-decoration: none;
        }}
        @media only screen and (max-width: 480px) {{
            .hero h1 {{
                font-size: 26px;
            }}
            .content h2 {{
                font-size: 20px;
            }}
            .icon-section {{
                flex-direction: column;
            }}
            .icon-item {{
                margin-bottom: 20px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{LOGO_URL}" alt="Citizen Bank Logo" class="logo">
            <p><a href="{get_base_url()}" style="color: white; text-decoration: none;">View in browser</a></p>
        </div>
        <div class="hero">
            <h1>{hero_title}</h1>
        </div>
        <div class="content">
            <h2>{greeting}</h2>
            {icon_section_html}
            {main_content}
            {cta_section_html}
        </div>
        <div class="footer">
            {footer_content}
        </div>
    </div>
</body>
</html>
    """


def create_share_certificate_email(
    recipient_name: str,
    certificate_number: str,
    shares: int,
    total_amount: float,
    qr_code_base64: str,
    certificate_url: str
) -> str:
    """Create share certificate email with QR code."""
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">Your share certificate is ready!</p>
    <p>Congratulations on becoming a shareholder of Citizen Bank. Your investment helps strengthen our community and supports local development.</p>
    
    <table style="margin: 20px auto; max-width: 400px;">
        <tr>
            <td>Certificate Number:</td>
            <td>{certificate_number}</td>
        </tr>
        <tr>
            <td>Number of Shares:</td>
            <td>{shares:,}</td>
        </tr>
        <tr>
            <td>Total Investment:</td>
            <td>M {total_amount:,.2f}</td>
        </tr>
    </table>
    
    <p style="font-size: 18px; font-weight: bold; margin-top: 30px;">📱 Scan Your QR Code</p>
    <p>Use your phone's camera to scan this QR code and view your share certificate:</p>
    
    <div class="qr-code">
        <img src="data:image/png;base64,{qr_code_base64}" alt="Certificate QR Code">
    </div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #666;">
        <strong>How to use:</strong><br>
        • Scan the QR code to view your certificate<br>
        • Share your certificate by sharing this QR code<br>
        • Save this email - it contains your certificate access
    </p>
    """
    
    cta_section = {
        'title': 'Or click below to view your certificate online:',
        'button_text': 'View My Certificate',
        'button_url': certificate_url
    }
    
    return build_email_template(
        hero_title="Congratulations!",
        greeting="Your Share Certificate is Ready",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra='<a href="' + get_base_url() + '/support">Need help?</a>'
    )


def create_payment_receipt_email(
    recipient_name: str,
    receipt_number: str,
    payment_amount: float,
    payment_method: str,
    payment_date: str,
    subscription_details: str
) -> str:
    """Create payment receipt email."""
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p>Thank you for your payment. We have successfully received your contribution.</p>
    
    <table style="margin: 20px auto; max-width: 400px;">
        <tr>
            <td>Receipt Number:</td>
            <td>{receipt_number}</td>
        </tr>
        <tr>
            <td>Amount Paid:</td>
            <td>M {payment_amount:,.2f}</td>
        </tr>
        <tr>
            <td>Payment Method:</td>
            <td>{payment_method}</td>
        </tr>
        <tr>
            <td>Payment Date:</td>
            <td>{payment_date}</td>
        </tr>
        <tr>
            <td>Subscription:</td>
            <td>{subscription_details}</td>
        </tr>
    </table>
    
    <p style="margin-top: 20px;">Your payment has been recorded in our system. If you have completed your subscription, your share certificate will be generated and sent to you shortly.</p>
    """
    
    cta_section = {
        'title': 'Questions about your payment?',
        'button_text': 'Contact Support',
        'button_url': f'{get_base_url()}/support'
    }
    
    return build_email_template(
        hero_title="Payment Received",
        greeting="Thank You!",
        main_content=main_content,
        cta_section=cta_section
    )


async def get_bank_account_for_currency(currency: str) -> Optional[Dict]:
    """Get the default bank account for a currency from database."""
    from app.env import Mode, mode
    
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD" if mode == Mode.PROD else "DATABASE_URL_ADMIN_DEV")
    
    try:
        import asyncpg
        conn = await asyncpg.connect(db_url)
        
        try:
            # Try to get default account for this currency
            row = await conn.fetchrow("""
                SELECT account_name, bank_name, account_number, branch_code, 
                       branch_name, swift_code
                FROM bank_accounts
                WHERE currency = $1 AND is_active = true AND is_default = true
                LIMIT 1
            """, currency)
            
            # If no default, get any active account for this currency
            if not row:
                row = await conn.fetchrow("""
                    SELECT account_name, bank_name, account_number, branch_code, 
                           branch_name, swift_code
                    FROM bank_accounts
                    WHERE currency = $1 AND is_active = true
                    ORDER BY id
                    LIMIT 1
                """, currency)
            
            if row:
                return dict(row)
            return None
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error fetching bank account: {e}")
        return None


async def get_crypto_wallet_for_currency(currency: str) -> Optional[Dict]:
    """Get the crypto wallet details for a specific currency from database."""
    from app.env import Mode, mode
    
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD" if mode == Mode.PROD else "DATABASE_URL_ADMIN_DEV")
    
    try:
        import asyncpg
        conn = await asyncpg.connect(db_url)
        
        try:
            row = await conn.fetchrow("""
                SELECT crypto_type, wallet_address, network_info
                FROM crypto_wallets
                WHERE crypto_type = $1 AND is_active = true
                LIMIT 1
            """, currency.upper())
            
            if row:
                return dict(row)
            return None
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error fetching crypto wallet: {e}")
        return None


async def create_payment_instructions_email(
    recipient_name: str,
    subscription_id: str,
    num_shares: int,
    total_amount: float,
    currency: str,
    payment_method: str,
    installment_plan: Optional[str] = None,
    monthly_payment: Optional[float] = None
) -> str:
    """Create payment instructions email with bank/crypto details based on currency."""
    
    # Format currency symbol and amount
    if currency == 'LSL':
        currency_symbol = 'M'
        amount_display = f"M {total_amount:,.2f}"
    elif currency == 'ZAR':
        currency_symbol = 'R'
        amount_display = f"R {total_amount:,.2f}"
    elif currency in ['BTC', 'ETH', 'USDT']:
        currency_symbol = currency
        amount_display = f"{total_amount:.8f} {currency}"
    else:
        currency_symbol = currency
        amount_display = f"{total_amount:,.2f} {currency}"
    
    # Payment schedule info for installments
    installment_info = ""
    if payment_method == 'installment' and installment_plan and monthly_payment:
        months = int(installment_plan.split('-')[0])
        monthly_display = f"M {monthly_payment:,.2f}" if currency == 'LSL' else f"R {monthly_payment:,.2f}" if currency == 'ZAR' else f"{monthly_payment:.8f} {currency}"
        installment_info = f"""
        <div style="margin: 20px auto; padding: 20px; background-color: #f0f9ff; border-left: 4px solid {BRAND_PINK}; border-radius: 4px; max-width: 500px;">
            <p style="margin: 0; font-weight: bold; color: {BRAND_PURPLE};">📅 Installment Plan</p>
            <p style="margin: 10px 0 0 0; color: #555;">
                <strong>{months} monthly payments</strong> of {monthly_display}<br>
                First payment due within 30 days of subscription
            </p>
        </div>
        """
    
    # Bank details for LSL/ZAR - fetch from database
    bank_details = ""
    if currency in ['LSL', 'ZAR']:
        # Fetch bank account from database
        bank_account = await get_bank_account_for_currency(currency)
        
        if bank_account:
            bank_name = bank_account['bank_name']
            account_name = bank_account['account_name']
            account_number = bank_account['account_number']
            branch_code = bank_account['branch_code']
            swift_code = bank_account.get('swift_code', '')
            
            swift_row = ""
            if swift_code:
                swift_row = f"""
                <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 12px 0; font-weight: bold; color: #555;">Swift Code:</td>
                    <td style="padding: 12px 0; color: #333; font-family: monospace;">{swift_code}</td>
                </tr>
                """
            
            bank_details = f"""
            <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 8px; max-width: 500px; border: 2px solid {BRAND_PURPLE};">
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: {BRAND_PURPLE}; text-align: center;">🏦 Bank Transfer Details</p>
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px 0; font-weight: bold; color: #555;">Bank Name:</td>
                        <td style="padding: 12px 0; color: #333;">{bank_name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px 0; font-weight: bold; color: #555;">Account Name:</td>
                        <td style="padding: 12px 0; color: #333;">{account_name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px 0; font-weight: bold; color: #555;">Account Number:</td>
                        <td style="padding: 12px 0; color: #333; font-family: monospace; font-size: 16px; font-weight: bold;">{account_number}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                        <td style="padding: 12px 0; font-weight: bold; color: #555;">Branch Code:</td>
                        <td style="padding: 12px 0; color: #333; font-family: monospace;">{branch_code}</td>
                    </tr>
                    {swift_row}
                    <tr>
                        <td style="padding: 12px 0; font-weight: bold; color: #555;">Reference:</td>
                        <td style="padding: 12px 0; color: {BRAND_PINK}; font-family: monospace; font-size: 16px; font-weight: bold;">{subscription_id}</td>
                    </tr>
                </table>
                <p style="margin: 15px 0 0 0; padding: 12px; background-color: #fff3cd; border-radius: 4px; font-size: 13px; color: #856404;">
                    ⚠️ <strong>Important:</strong> Please use your subscription ID <strong>{subscription_id}</strong> as the payment reference so we can match your payment.
                </p>
            </div>
            """
        else:
            # Fallback if no bank account configured
            bank_details = f"""
            <div style="margin: 30px auto; padding: 25px; background-color: #fff3cd; border-radius: 8px; max-width: 500px; border: 2px solid #ffc107;">
                <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Bank details not configured</p>
                <p style="margin: 10px 0 0 0; color: #856404;">Please contact our support team for payment instructions.</p>
            </div>
            """
    
    # Crypto wallet details
    crypto_details = ""
    if currency in ['BTC', 'ETH', 'USDT']:
        # Fetch crypto wallet from database
        crypto_wallet = await get_crypto_wallet_for_currency(currency)
        
        if crypto_wallet:
            wallet_address = crypto_wallet['wallet_address']
            network = crypto_wallet['network_info']
            
            crypto_details = f"""
            <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; max-width: 500px; border: 2px solid {BRAND_PINK};">
                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #ffffff; text-align: center;">₿ Cryptocurrency Payment Details</p>
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <tr style="border-bottom: 1px solid #2c3e50;">
                        <td style="padding: 12px 0; font-weight: bold; color: #bbb;">Currency:</td>
                        <td style="padding: 12px 0; color: #fff; font-weight: bold;">{currency}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #2c3e50;">
                        <td style="padding: 12px 0; font-weight: bold; color: #bbb;">Network:</td>
                        <td style="padding: 12px 0; color: #fff;">{network}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; font-weight: bold; color: #bbb; vertical-align: top;">Wallet Address:</td>
                        <td style="padding: 12px 0; color: {BRAND_PINK}; font-family: monospace; font-size: 12px; word-break: break-all; font-weight: bold;">{wallet_address}</td>
                    </tr>
                </table>
                <p style="margin: 15px 0 0 0; padding: 12px; background-color: #2c3e50; border-radius: 4px; font-size: 13px; color: #ffc107;">
                    ⚠️ <strong>Important:</strong> Send <strong>exactly {amount_display}</strong> to the wallet address above. After sending, email us at <a href="mailto:subscriptions@citizenbank.co.za" style="color: {BRAND_PINK};">subscriptions@citizenbank.co.za</a> with your transaction hash and subscription ID <strong>{subscription_id}</strong>.
                </p>
            </div>
            """
        else:
            # Fallback if no crypto wallet configured
            crypto_details = f"""
            <div style="margin: 30px auto; padding: 25px; background-color: #fff3cd; border-radius: 8px; max-width: 500px; border: 2px solid #ffc107;">
                <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ {currency} wallet not configured</p>
                <p style="margin: 10px 0 0 0; color: #856404;">Please contact our support team for crypto payment instructions.</p>
            </div>
            """
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">🎉 Your Share Subscription is Confirmed!</p>
    <p style="font-size: 16px; line-height: 1.8;">Thank you for subscribing to Citizen Bank shares. Your application has been successfully submitted.</p>
    
    <div style="margin: 25px auto; padding: 20px; background-color: #f5f5f5; border-radius: 8px; max-width: 500px;">
        <p style="margin: 0 0 10px 0; font-size: 16px; color: {BRAND_PURPLE}; font-weight: bold;">📋 Subscription Summary</p>
        <table style="width: 100%; text-align: left;">
            <tr>
                <td style="padding: 8px 0; color: #555;">Subscription ID:</td>
                <td style="padding: 8px 0; font-weight: bold; color: {BRAND_PINK}; font-family: monospace;">{subscription_id}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #555;">Number of Shares:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">{num_shares:,}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #555;">Total Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: {BRAND_PURPLE}; font-size: 18px;">{amount_display}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #555;">Payment Method:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">{payment_method.title()}</td>
            </tr>
        </table>
    </div>
    
    {installment_info}
    
    <p style="margin-top: 25px; font-size: 14px; color: #666;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    """
    
    cta_section = {
        'title': 'Need Help?',
        'button_text': 'Contact Support',
        'button_url': f'{get_base_url()}/support'
    }
    
    return build_email_template(
        hero_title="Welcome to Citizen Bank!",
        greeting="Thank You for Your Subscription",
        main_content=main_content,
        cta_section=cta_section
    )


async def create_payment_reminder_email(
    recipient_name: str,
    subscription_id: str,
    balance: float,
    deadline: str
) -> str:
    """Create payment reminder email for overdue subscriptions."""
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">⏰ Payment Reminder</p>
    <p style="font-size: 16px; line-height: 1.8;">This is a friendly reminder that you have an outstanding balance for your share subscription.</p>
    
    <div style="margin: 25px auto; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0 0 10px 0; font-size: 16px; color: #856404; font-weight: bold;">📋 Payment Details</p>
        <table style="width: 100%; text-align: left;">
            <tr>
                <td style="padding: 8px 0; color: #555;">Subscription ID:</td>
                <td style="padding: 8px 0; font-weight: bold; color: {BRAND_PINK}; font-family: monospace;">{subscription_id}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #555;">Outstanding Balance:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #d32f2f; font-size: 18px;">LSL {balance:,.2f}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #555;">Payment Deadline:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">{deadline}</td>
            </tr>
        </table>
    </div>
    
    <p style="font-size: 15px; color: #666; line-height: 1.8;">Please complete your payment as soon as possible to secure your share allocation. If you've already made the payment, please disregard this reminder.</p>
    
    <div style="margin: 30px auto; padding: 20px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0; font-weight: bold; color: #1565c0;">💡 Need Assistance?</p>
        <p style="margin: 10px 0 0 0; color: #555;">If you're experiencing difficulties with payment or have questions about your subscription, please contact our support team.</p>
    </div>
    
    <p style="margin-top: 25px; font-size: 14px; color: #666;">Thank you for your attention to this matter.</p>
    """
    
    cta_section = {
        'title': 'Complete Your Payment',
        'button_text': 'View Subscription',
        'button_url': f'{get_base_url()}/my-subscriptions'
    }
    
    return build_email_template(
        hero_title="Payment Reminder",
        greeting="Action Required",
        main_content=main_content,
        cta_section=cta_section
    )


def create_board_invitation_email(
    recipient_name: str,
    role: str,
    position: str,
    invitation_url: str,
    invited_by_name: Optional[str] = None,
    invited_by_email: Optional[str] = None,
    message: Optional[str] = None
) -> str:
    """Create board member invitation email with branded design and HappyCitizen images from landing page."""
    
    # Determine who sent the invitation
    if invited_by_name:
        invited_by_text = f"<strong>{invited_by_name}</strong>"
    elif invited_by_email:
        invited_by_text = f"<strong>{invited_by_email}</strong>"
    else:
        invited_by_text = "the Citizen Bank leadership team"
    
    # Personal message section
    personal_message_html = ""
    if message:
        personal_message_html = f"""
        <div style="margin: 25px auto; padding: 20px; background-color: #f0f9ff; border-left: 4px solid {BRAND_PINK}; border-radius: 4px; max-width: 500px;">
            <p style="margin: 0; font-style: italic; color: #333; text-align: left;">💬 <strong>Personal Message:</strong></p>
            <p style="margin: 10px 0 0 0; color: #555; text-align: left;">{message}</p>
        </div>
        """
    
    # HappyCitizen images from landing page carousel - same images rotating on the hero section
    happy_citizens_html = """
    <div style="margin: 30px 0; text-align: center;">
        <img src="https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%201.png" 
             alt="Citizen Bank Team" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <img src="https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%203.png" 
             alt="Citizen Bank Community" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </div>
    <div style="margin: 10px 0 30px 0; text-align: center;">
        <img src="https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%204.png" 
             alt="Citizen Bank Success" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <img src="https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%207.png" 
             alt="Citizen Bank Growth" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </div>
    """
    
    role_display = "Board Member" if role == "board_member" else "Investor"
    position_display = f" as <strong>{position}</strong>" if position else ""
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">🎉 You've Been Invited to Join Our Board!</p>
    <p style="font-size: 16px; line-height: 1.8;">{invited_by_text} has invited you to join the Citizen Bank Board of Directors{position_display} with the role of <strong>{role_display}</strong>.</p>
    
    {personal_message_html}
    
    {happy_citizens_html}
    
    <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 12px; max-width: 550px; border: 2px solid {BRAND_PURPLE}; box-shadow: 0 4px 12px rgba(109, 82, 162, 0.15);">
        <p style="margin: 0 0 15px 0; font-size: 18px; color: {BRAND_PURPLE}; font-weight: bold;">✨ As a Board Member, You Will:</p>
        <ul style="text-align: left; margin: 10px 0; padding-left: 20px; color: #333; line-height: 1.8;">
            <li style="margin-bottom: 10px;">🎯 Shape strategic direction and governance policies</li>
            <li style="margin-bottom: 10px;">🤝 Guide management in serving our community</li>
            <li style="margin-bottom: 10px;">📊 Oversee financial performance and risk management</li>
            <li style="margin-bottom: 10px;">💼 Contribute expertise to strengthen our institution</li>
            <li style="margin-bottom: 10px;">🌍 Help build a stronger financial future for Lesotho</li>
        </ul>
    </div>
    
    <p style="margin-top: 25px; font-size: 15px; color: #666; line-height: 1.7;">Your leadership and expertise will be invaluable as we work together to revolutionize banking in Southern Africa and serve our growing community of members.</p>
    
    <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107;"><strong>⏱️ Next Steps:</strong><br>
    Click the button below to accept your invitation and complete your board member profile. This invitation is valid for <strong>7 days</strong>.</p>
    """
    
    cta_section = {
        'title': 'Ready to Lead with Us?',
        'button_text': '✓ Accept Board Invitation',
        'button_url': invitation_url
    }
    
    return build_email_template(
        hero_title="Join Our Board of Directors",
        greeting="You're Invited to Serve on Our Board",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra='Questions? <a href="' + get_base_url() + '/contact" style="color: white; text-decoration: underline;">Contact our team</a> • This invitation was sent by ' + invited_by_text
    )


def create_verification_code_email(
    recipient_name: str,
    verification_code: str,
    expires_in_minutes: int = 2
) -> str:
    """Create verification code email."""
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p>Here is your verification code to complete your invitation acceptance:</p>
    
    <div style="margin: 30px auto; padding: 20px; background: {BRAND_GRADIENT}; border-radius: 8px; max-width: 300px;">
        <p style="font-size: 36px; font-weight: bold; color: white; margin: 0; letter-spacing: 8px;">{verification_code}</p>
    </div>
    
    <p style="color: #666;">This code will expire in <strong>{expires_in_minutes} minutes</strong>.</p>
    <p style="color: #666;">If you did not request this code, please ignore this email.</p>
    """
    
    return build_email_template(
        hero_title="Verification Code",
        greeting="Your Security Code",
        main_content=main_content
    )


def create_admin_invitation_email(
    recipient_name: str,
    admin_email: str
) -> str:
    """Create admin invitation email."""
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">Administrator Access Granted</p>
    <p>You have been granted administrator access to the Citizen Bank platform.</p>
    
    <p style="margin-top: 20px;">As an administrator, you will have access to:</p>
    <ul style="text-align: left; display: inline-block; margin: 20px auto;">
        <li>User management and permissions</li>
        <li>Board member administration</li>
        <li>Share subscription oversight</li>
        <li>Document management</li>
        <li>System configuration</li>
    </ul>
    
    <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107;"><strong>⚠️ Important:</strong><br>
    Please log in using your email address: <strong>{admin_email}</strong></p>
    """
    
    cta_section = {
        'title': 'Access your admin dashboard',
        'button_text': 'Go to Admin Dashboard',
        'button_url': f'{get_base_url()}/admin-dashboard'
    }
    
    return build_email_template(
        hero_title="Welcome, Administrator",
        greeting="You're All Set!",
        main_content=main_content,
        cta_section=cta_section
    )


def create_board_engagement_email(
    recipient_name: str,
    ai_greeting: str,
    feature_highlight: Dict,
    company_update: str,
    calendar_context: Dict
) -> str:
    """Create AI-generated board member engagement email with feature highlight.
    
    Args:
        recipient_name: Board member's name
        ai_greeting: AI-generated personalized greeting
        feature_highlight: Dict with:
            - name: Feature name
            - description: Brief description  
            - detailed_explanation: Full explanation
            - feature_image_url: Image URL (optional)
            - cta_text: Button text
            - cta_url: Button URL
        company_update: AI-generated company progress update
        calendar_context: Dict with calendar event info
        
    Returns:
        Complete HTML email string
    """
    
    # Extract feature details
    feature_name = feature_highlight.get('name', 'Platform Feature')
    feature_desc = feature_highlight.get('description', '')
    feature_details = feature_highlight.get('detailed_explanation', feature_desc)
    feature_image = feature_highlight.get('feature_image_url', '')
    cta_text = feature_highlight.get('cta_text', 'Explore Feature')
    cta_url = feature_highlight.get('cta_url', f'{get_base_url()}/board-portal')
    
    # Ensure URLs are absolute
    if cta_url and not cta_url.startswith('http'):
        cta_url = f"{get_base_url()}{cta_url}"
    
    if feature_image and not feature_image.startswith('http'):
        feature_image = f"{get_base_url()}{feature_image}"
    
    # Calendar event badge
    calendar_badge = ""
    if calendar_context.get('has_event'):
        event_name = calendar_context.get('event_name', '')
        calendar_badge = f"""
        <div style="margin: 20px auto; padding: 12px 20px; background-color: #fef3c7; border-radius: 6px; max-width: 400px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">🎉 {event_name}</p>
        </div>
        """
    
    # Feature image section
    feature_image_html = ""
    if feature_image:
        feature_image_html = f"""
        <div class="image-group" style="margin: 20px auto;">
            <img src="{feature_image}" alt="{feature_name}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        </div>
        """
    
    main_content = f"""
    <div style="text-align: left;">
        <p style="font-size: 16px; line-height: 1.8; color: #333; white-space: pre-line;">{ai_greeting}</p>
    </div>
    
    {calendar_badge}
    
    <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;">
    
    <!-- Feature Highlight Section -->
    <div style="margin: 30px auto;">
        <p style="font-size: 20px; font-weight: bold; color: {BRAND_PURPLE}; margin-bottom: 15px;">✨ Feature Spotlight</p>
        
        <div style="background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 8px; padding: 25px; border: 2px solid #e9d5ff;">
            <h3 style="color: {BRAND_PURPLE}; margin-top: 0;">{feature_name}</h3>
            <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 10px 0;">{feature_desc}</p>
            
            {feature_image_html}
            
            <p style="color: #555; font-size: 15px; line-height: 1.7; margin: 15px 0;">{feature_details}</p>
            
            <div style="text-align: center; margin-top: 25px;">
                <a href="{cta_url}" class="cta-button" style="display: inline-block; background-color: {BRAND_PINK}; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">{cta_text}</a>
            </div>
        </div>
    </div>
    
    <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;">
    
    <!-- Company Update Section -->
    <div style="margin: 30px auto;">
        <p style="font-size: 20px; font-weight: bold; color: {BRAND_PURPLE}; margin-bottom: 15px;">🏢 Company Progress Update</p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 20px;">
            <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0;">{company_update}</p>
        </div>
    </div>
    
    <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;">
    
    <div style="text-align: left;">
        <p style="color: #6b7280; font-size: 15px; line-height: 1.7;">
            Thank you for your continued commitment to Citizen Digital LTD. Your investment 
            and support helps us build a stronger financial future for our community.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
            Best regards,<br>
            <strong style="color: {BRAND_PURPLE};">The Citizen Digital Team</strong>
        </p>
    </div>
    """
    
    return build_email_template(
        hero_title="Your Citizen Digital Update",
        greeting=f"Hello {recipient_name}",
        main_content=main_content,
        footer_extra=f'<a href="{get_base_url()}/notification-preferences" style="color: white;">Manage Email Preferences</a>'
    )


def create_investor_invitation_email(
    recipient_name: str,
    share_class: str,
    minimum_investment: float,
    subscription_link: str,
    special_terms: Optional[str] = None,
    contact_person: str = "Investor Relations Team",
    contact_email: str = "invest@citizenhub.co.za",
    contact_phone: str = "+266 2231 2345"
) -> str:
    """
    Create professional investor invitation email with HappyCitizen images.
    Encourages investors to read investor memo, access data room, and subscribe to updates.
    
    Args:
        recipient_name: Name of the potential investor
        share_class: Share class being offered (e.g., 'Class A', 'Class B')
        minimum_investment: Minimum investment amount
        subscription_link: Link to share subscription page (with tracking params)
        special_terms: Optional special terms or benefits
        contact_person: Name of contact person
        contact_email: Contact email
        contact_phone: Contact phone number
    
    Returns:
        Complete HTML email string
    """
    
    # Build special terms section if provided
    special_terms_html = ""
    if special_terms:
        special_terms_html = f"""
        <div style="background: linear-gradient(135deg, #f0f0ff 0%, #fff5f9 100%); padding: 25px; border-radius: 12px; margin: 25px auto; border-left: 4px solid {BRAND_PINK}; max-width: 550px; box-shadow: 0 4px 12px rgba(109, 82, 162, 0.15);">
            <h3 style="margin-top: 0; font-size: 20px; color: {BRAND_PURPLE}; font-weight: bold;">🎁 Exclusive Benefits for You</h3>
            <p style="margin: 0; color: #333; line-height: 1.7; font-size: 15px;">{special_terms}</p>
        </div>
        """
    
    # Data room link (base URL without token)
    base_url = subscription_link.split('?')[0].replace('/share-subscription', '')
    data_room_url = f"{base_url}/data-room"
    investor_memo_url = f"{base_url}/media"  # Media page has investor materials
    
    # Primary CTA button (above photos)
    primary_cta_button = f"""
    <div style="text-align: center; margin: 30px auto;">
        <a href="{subscription_link}" 
           style="display: inline-block; background: linear-gradient(135deg, {BRAND_PURPLE} 0%, #4a0070 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; 
                  font-weight: bold; font-size: 17px; box-shadow: 0 4px 12px rgba(109, 82, 162, 0.4);
                  transition: transform 0.2s;">
            💼 Start Your Investment Journey
        </a>
    </div>
    """
    
    # HappyCitizen images from landing page - showing success and community
    happy_investors_html = """
    <div style="margin: 30px 0; text-align: center;">
        <img src="https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%207.png" 
             alt="Investor Success" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <img src="https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892/HappyCitizen%20a.png" 
             alt="Growing Together" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </div>
    """
    
    main_content = f"""
    <p style="font-size: 16px;">Dear {recipient_name},</p>
    
    <p style="font-size: 16px; line-height: 1.8;">
        We are excited to invite you to participate in an <strong>exclusive investment opportunity</strong> with 
        <strong>Citizen Digital Bank</strong>, Lesotho's pioneering digital banking institution.
    </p>
    
    {primary_cta_button}
    
    {happy_investors_html}
    
    <div style="background: linear-gradient(135deg, {BRAND_PURPLE} 0%, #4a0070 100%); 
                padding: 30px; border-radius: 12px; color: white; margin: 30px auto; max-width: 550px; box-shadow: 0 6px 20px rgba(109, 82, 162, 0.3);">
        <h3 style="margin-top: 0; font-size: 22px; color: white; font-weight: bold;">🏦 Why Invest in Citizen Digital Bank?</h3>
        <ul style="list-style: none; padding: 0; margin: 15px 0; line-height: 2;">
            <li style="padding: 8px 0; font-size: 15px;">✓ First fully digital bank in Lesotho</li>
            <li style="padding: 8px 0; font-size: 15px;">✓ Licensed and regulated by Central Bank of Lesotho</li>
            <li style="padding: 8px 0; font-size: 15px;">✓ Experienced leadership and strong governance</li>
            <li style="padding: 8px 0; font-size: 15px;">✓ Cutting-edge digital banking technology</li>
            <li style="padding: 8px 0; font-size: 15px;">✓ Rapidly growing customer base across Southern Africa</li>
            <li style="padding: 8px 0; font-size: 15px;">✓ Positioned for regional expansion</li>
        </ul>
    </div>
    
    <h3 style="color: {BRAND_PURPLE}; font-size: 22px; margin-top: 35px;">📈 Your Investment Opportunity</h3>
    
    <table style="margin: 20px auto; width: 100%; max-width: 550px; background-color: #f9f9f9; 
                  border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr>
            <td style="padding: 15px; font-weight: bold; color: {BRAND_PURPLE}; border-bottom: 2px solid #e0e0e0; font-size: 15px;">Share Class Offered:</td>
            <td style="padding: 15px; border-bottom: 2px solid #e0e0e0; font-size: 15px;"><strong>{share_class}</strong></td>
        </tr>
        <tr>
            <td style="padding: 15px; font-weight: bold; color: {BRAND_PURPLE}; border-bottom: 2px solid #e0e0e0; font-size: 15px;">Minimum Investment:</td>
            <td style="padding: 15px; border-bottom: 2px solid #e0e0e0; font-size: 15px;"><strong>M {minimum_investment:,.2f}</strong></td>
        </tr>
        <tr>
            <td style="padding: 15px; font-weight: bold; color: {BRAND_PURPLE}; font-size: 15px;">Payment Methods:</td>
            <td style="padding: 15px; font-size: 15px;">Bank Transfer • Mobile Money • Cryptocurrency</td>
        </tr>
    </table>
    
    {special_terms_html}
    
    <div style="margin: 35px auto; padding: 25px; background: linear-gradient(to right, #f8f9fa, #ffffff); border-radius: 12px; max-width: 550px; border: 2px solid {BRAND_PURPLE};">
        <h3 style="color: {BRAND_PURPLE}; margin-top: 0; font-size: 20px; font-weight: bold;">📋 Your Next Steps</h3>
        
        <div style="margin: 20px 0;">
            <div style="padding: 20px; margin: 15px 0; background-color: white; border-left: 4px solid {BRAND_PINK}; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <strong style="color: {BRAND_PURPLE}; font-size: 16px;">📄 1. Review Investment Materials</strong>
                <p style="margin: 8px 0 12px 0; color: #555; font-size: 14px; line-height: 1.6;">
                    Read our comprehensive <strong>Investor Memo</strong> with detailed financials, growth projections, and market analysis.
                </p>
                <a href="{investor_memo_url}" 
                   style="display: inline-block; background: linear-gradient(135deg, {BRAND_PURPLE} 0%, #4a0070 100%); 
                          color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; 
                          font-weight: bold; font-size: 14px; box-shadow: 0 3px 8px rgba(109, 82, 162, 0.3);">
                    📄 View Investor Materials
                </a>
            </div>
            
            <div style="padding: 20px; margin: 15px 0; background-color: white; border-left: 4px solid {BRAND_PINK}; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <strong style="color: {BRAND_PURPLE}; font-size: 16px;">🗄️ 2. Access Our Data Room</strong>
                <p style="margin: 8px 0 12px 0; color: #555; font-size: 14px; line-height: 1.6;">
                    Request access to our secure <strong>Investor Data Room</strong> containing due diligence documents, financial statements, and regulatory filings.
                </p>
                <a href="{data_room_url}" 
                   style="display: inline-block; background: linear-gradient(135deg, {BRAND_PURPLE} 0%, #4a0070 100%); 
                          color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; 
                          font-weight: bold; font-size: 14px; box-shadow: 0 3px 8px rgba(109, 82, 162, 0.3);">
                    🗄️ Request Data Room Access
                </a>
            </div>
            
            <div style="padding: 20px; margin: 15px 0; background-color: white; border-left: 4px solid {BRAND_PINK}; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <strong style="color: {BRAND_PURPLE}; font-size: 16px;">💼 3. Subscribe to Shares</strong>
                <p style="margin: 8px 0 12px 0; color: #555; font-size: 14px; line-height: 1.6;">
                    Ready to invest? Complete your <strong>share subscription</strong> online and secure your position as a shareholder.
                </p>
                <a href="{subscription_link}" 
                   style="display: inline-block; background: linear-gradient(135deg, {BRAND_PINK} 0%, #d63384 100%); 
                          color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; 
                          font-weight: bold; font-size: 14px; box-shadow: 0 3px 8px rgba(214, 51, 132, 0.3);">
                    💼 Subscribe Now
                </a>
            </div>
            
            <div style="padding: 20px; margin: 15px 0; background-color: white; border-left: 4px solid {BRAND_PINK}; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <strong style="color: {BRAND_PURPLE}; font-size: 16px;">📊 4. Subscribe to Updates</strong>
                <p style="margin: 8px 0 0 0; color: #555; font-size: 14px; line-height: 1.6;">
                    Stay informed with regular updates on our <strong>financial performance</strong>, quarterly reports, and <strong>media announcements</strong>.
                </p>
            </div>
        </div>
    </div>
    
    <div style="margin: 30px auto; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; max-width: 550px;">
        <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.7;"><strong>⏱️ Limited Opportunity:</strong><br>
        Share subscriptions are limited and offered on a first-come, first-served basis. We encourage you to review our materials and complete your subscription soon.</p>
    </div>
    
    <div style="margin: 35px auto; padding: 25px; background-color: #f0f9ff; border-radius: 12px; max-width: 550px; border: 2px solid #0ea5e9;">
        <h4 style="color: #0369a1; margin-top: 0; font-size: 18px; font-weight: bold;">💡 Need More Information?</h4>
        <p style="margin: 10px 0; font-size: 15px;"><strong>Contact:</strong> {contact_person}</p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Email:</strong> <a href="mailto:{contact_email}" style="color: {BRAND_PURPLE};">{contact_email}</a></p>
        <p style="margin: 8px 0; font-size: 15px;"><strong>Phone:</strong> {contact_phone}</p>
        <p style="margin-top: 15px; font-size: 14px; color: #333;">Our investor relations team is ready to answer any questions and guide you through the subscription process.</p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px; line-height: 1.7;">
        Thank you for considering this investment opportunity. We look forward to welcoming you as a valued shareholder of Citizen Digital Bank.
    </p>

    <p style="font-size: 13px; color: #999; margin-top: 30px; line-height: 1.6; font-style: italic;">
        This is a confidential investment opportunity. Please do not forward this email. 
        Investment in securities involves risk. Past performance does not guarantee future results. 
        Please read all offering documents carefully before investing.
    </p>
    """
    
    cta_section = {
        'title': 'Ready to Get Started?',
        'button_text': '💼 View Investment Details & Subscribe',
        'button_url': subscription_link
    }
    
    return build_email_template(
        hero_title="Exclusive Investment Opportunity",
        greeting="You're Invited to Invest in Citizen Digital Bank",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra=f'<a href="{get_base_url()}/data-room" style="color: white; text-decoration: underline;">Access Data Room</a> • <a href="{get_base_url()}/media" style="color: white; text-decoration: underline;">View Media Updates</a> • <a href="{get_base_url()}/privacy-policy" style="color: white; text-decoration: underline;">Privacy Policy</a> • <a href="{get_base_url()}/disclosures" style="color: white; text-decoration: underline;">Investment Disclosures</a>'
    )

def create_admin_subscription_new_user_email(
    recipient_name: str,
    subscription_id: str,
    share_class: str,
    num_shares: int,
    total_amount: float,
    currency: str,
    admin_name: str,
    login_url: str,
    subscription_url: str
) -> str:
    """
    Create email for new users who received shares from admin.
    Includes invitation info and subscription details.
    
    Args:
        recipient_name: Name of the new investor
        subscription_id: Subscription ID created by admin
        share_class: Share class allocated (A, B, or C)
        num_shares: Number of shares allocated
        total_amount: Total investment amount
        currency: Currency (LSL, ZAR, etc.)
        admin_name: Name of admin who created subscription
        login_url: URL to login/complete profile
        subscription_url: URL to view subscription details
    
    Returns:
        Complete HTML email string
    """
    
    # Format currency display
    if currency == 'LSL':
        amount_display = f"M {total_amount:,.2f}"
    elif currency == 'ZAR':
        amount_display = f"R {total_amount:,.2f}"
    else:
        amount_display = f"{total_amount:,.2f} {currency}"
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">🎉 Welcome to Citizen Bank - Shares Allocated!</p>
    <p style="font-size: 16px; line-height: 1.8;">
        Great news! {admin_name} has subscribed for shares on your behalf. 
        Your investment in Citizen Bank has been successfully set up.
    </p>
    
    <div style="margin: 25px auto; padding: 20px; background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 8px; max-width: 500px; border: 2px solid {BRAND_PURPLE};">
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: {BRAND_PURPLE}; text-align: center;">📊 Your Share Allocation</p>
        <table style="width: 100%; text-align: left;">
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Subscription ID:</td>
                <td style="padding: 10px 0; font-weight: bold; color: {BRAND_PINK}; font-family: monospace;">{subscription_id}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Share Class:</td>
                <td style="padding: 10px 0; font-weight: bold; color: #333;">Class {share_class}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Number of Shares:</td>
                <td style="padding: 10px 0; font-weight: bold; color: #333; font-size: 18px;">{num_shares:,}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Total Investment:</td>
                <td style="padding: 10px 0; font-weight: bold; color: {BRAND_PURPLE}; font-size: 20px;">{amount_display}</td>
            </tr>
        </table>
    </div>
    
    <div style="margin: 30px auto; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0; font-weight: bold; color: #856404;">🔑 Complete Your Profile</p>
        <p style="margin: 0; color: #856404; line-height: 1.7;">
            Your account has been created. Please click the button below to set up your login credentials 
            and complete your investor profile. This will give you access to:
        </p>
        <ul style="text-align: left; margin: 15px 0; padding-left: 20px; color: #856404;">
            <li style="margin-bottom: 8px;">View your subscription details</li>
            <li style="margin-bottom: 8px;">Track your investment portfolio</li>
            <li style="margin-bottom: 8px;">Access board member features (if applicable)</li>
            <li style="margin-bottom: 8px;">Receive important updates and notifications</li>
        </ul>
    </div>
    
    <div style="margin: 30px auto; padding: 20px; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0; font-weight: bold; color: #2e7d32;">✅ Next Steps</p>
        <ol style="margin: 10px 0; padding-left: 20px; color: #555;">
            <li style="margin-bottom: 8px;">Click "Complete Your Profile" below to get started</li>
            <li style="margin-bottom: 8px;">Set up your login credentials</li>
            <li style="margin-bottom: 8px;">Complete your investor profile information</li>
            <li style="margin-bottom: 8px;">View your subscription and payment status</li>
            <li style="margin-bottom: 8px;">Download your certificate once payment is verified</li>
        </ol>
    </div>
    
    <p style="margin-top: 25px; font-size: 14px; color: #666;">
        Payment has been submitted by {admin_name}. Once verified, your share certificate will be generated 
        and available for download in your investor portal.
    </p>
    """
    
    cta_section = {
        'title': 'Get Started Now',
        'button_text': '🚀 Complete Your Profile',
        'button_url': login_url
    }
    
    return build_email_template(
        hero_title="Welcome to Citizen Bank!",
        greeting="Your Shares Have Been Allocated",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra=f'Questions? Contact {admin_name} or our support team at <a href="mailto:shares@citizenbank.co.za" style="color: white;">shares@citizenbank.co.za</a>'
    )


def create_admin_subscription_existing_user_email(
    recipient_name: str,
    subscription_id: str,
    share_class: str,
    num_shares: int,
    total_amount: float,
    currency: str,
    admin_name: str,
    subscription_url: str,
    existing_shares: Optional[int] = None
) -> str:
    """
    Create email for existing users who received additional shares from admin.
    
    Args:
        recipient_name: Name of the existing investor
        subscription_id: Subscription ID created by admin
        share_class: Share class allocated (A, B, or C)
        num_shares: Number of shares allocated
        total_amount: Total investment amount
        currency: Currency (LSL, ZAR, etc.)
        admin_name: Name of admin who created subscription
        subscription_url: URL to view subscription details
        existing_shares: Optional count of existing shares
    
    Returns:
        Complete HTML email string
    """
    
    # Format currency display
    if currency == 'LSL':
        amount_display = f"M {total_amount:,.2f}"
    elif currency == 'ZAR':
        amount_display = f"R {total_amount:,.2f}"
    else:
        amount_display = f"{total_amount:,.2f} {currency}"
    
    # Existing shares context
    portfolio_context = ""
    if existing_shares is not None and existing_shares > 0:
        total_shares = existing_shares + num_shares
        portfolio_context = f"""
        <div style="margin: 20px auto; padding: 15px; background-color: #e3f2fd; border-radius: 6px; max-width: 500px;">
            <p style="margin: 0; color: #1565c0; font-size: 14px;">
                📈 <strong>Portfolio Update:</strong> You currently hold {existing_shares:,} shares. 
                This allocation increases your total to <strong>{total_shares:,} shares</strong>.
            </p>
        </div>
        """
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">🎉 New Share Allocation Received!</p>
    <p style="font-size: 16px; line-height: 1.8;">
        Excellent news! {admin_name} has subscribed for additional shares on your behalf. 
        Your investment portfolio has been expanded.
    </p>
    
    {portfolio_context}
    
    <div style="margin: 25px auto; padding: 20px; background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 8px; max-width: 500px; border: 2px solid {BRAND_PURPLE};">
        <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: {BRAND_PURPLE}; text-align: center;">📊 New Share Allocation</p>
        <table style="width: 100%; text-align: left;">
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Subscription ID:</td>
                <td style="padding: 10px 0; font-weight: bold; color: {BRAND_PINK}; font-family: monospace;">{subscription_id}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Share Class:</td>
                <td style="padding: 10px 0; font-weight: bold; color: #333;">Class {share_class}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Additional Shares:</td>
                <td style="padding: 10px 0; font-weight: bold; color: #333; font-size: 18px;">+{num_shares:,}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #555; font-weight: 500;">Investment Amount:</td>
                <td style="padding: 10px 0; font-weight: bold; color: {BRAND_PURPLE}; font-size: 20px;">{amount_display}</td>
            </tr>
        </table>
    </div>
    
    <div style="margin: 30px auto; padding: 20px; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0; font-weight: bold; color: #2e7d32;">✅ What's Next</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
            <li style="margin-bottom: 8px;">Payment is being processed by {admin_name}</li>
            <li style="margin-bottom: 8px;">You'll receive confirmation once payment is verified</li>
            <li style="margin-bottom: 8px;">Your certificate will be generated and available for download</li>
            <li style="margin-bottom: 8px;">View your updated portfolio in your investor portal</li>
        </ul>
    </div>
    
    <div style="margin: 30px auto; padding: 20px; background-color: #f9fafb; border-radius: 6px; max-width: 500px;">
        <p style="margin: 0 0 10px 0; font-size: 15px; color: #374151; font-weight: 600;">💡 Did You Know?</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.7;">
            As a Citizen Bank shareholder, you're part of a community-driven financial institution 
            committed to strengthening local economies and creating opportunities across Southern Africa.
        </p>
    </div>
    
    <p style="margin-top: 25px; font-size: 14px; color: #666;">
        Thank you for your continued trust and investment in Citizen Bank. Your support helps us 
        build a stronger financial future for our community.
    </p>
    """
    
    cta_section = {
        'title': 'View Your Investment',
        'button_text': '📊 View Subscription Details',
        'button_url': subscription_url
    }
    
    return build_email_template(
        hero_title="Portfolio Expanded!",
        greeting="New Shares Allocated to Your Account",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra=f'Questions? Contact {admin_name} or our support team at <a href="mailto:shares@citizenbank.co.za" style="color: white;">shares@citizenbank.co.za</a>'
    )

def create_profile_completion_reminder_email(
    recipient_name: str,
    subscription_id: str,
    num_shares: int,
    total_amount: float,
    missing_fields: Optional[List[str]] = None
) -> str:
    """
    Create profile completion reminder email for subscribers with incomplete profiles.
    
    Args:
        recipient_name: Full name of the subscriber
        subscription_id: Subscription ID for reference
        num_shares: Number of shares purchased
        total_amount: Total investment amount
        missing_fields: List of missing profile fields (optional)
    
    Returns:
        HTML email content
    """
    profile_url = f"{get_base_url()}/profile"
    
    # Build missing fields list if provided
    missing_fields_html = ""
    if missing_fields:
        fields_list = "</li><li>".join(missing_fields)
        missing_fields_html = f"""
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">📋 Missing Information:</p>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
                <li>{fields_list}</li>
            </ul>
        </div>
        """
    
    main_content = f"""
    <p>Dear {recipient_name},</p>
    
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">Complete Your Profile to Unlock All Benefits</p>
    
    <p>Thank you for subscribing to <strong>{num_shares:,} shares</strong> (M {total_amount:,.2f}) with Citizen Bank! 
    We're excited to have you as an investor.</p>
    
    <p>However, we noticed that your profile is <strong>not yet complete</strong>. Completing your profile is essential to:</p>
    
    <table style="margin: 20px auto; max-width: 500px; background-color: #f9f9f9; border-radius: 5px;">
        <tr>
            <td style="padding: 15px;">
                <strong>✅ Receive your share certificate</strong><br>
                <span style="color: #666; font-size: 14px;">We need complete information to issue official certificates</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px;">
                <strong>✅ Access dividend payments</strong><br>
                <span style="color: #666; font-size: 14px;">Ensure we have correct payment details on file</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px;">
                <strong>✅ Participate in governance</strong><br>
                <span style="color: #666; font-size: 14px;">Complete profiles are required for voting and board activities</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 15px;">
                <strong>✅ Comply with banking regulations</strong><br>
                <span style="color: #666; font-size: 14px;">Help us meet KYC and regulatory requirements</span>
            </td>
        </tr>
    </table>
    
    {missing_fields_html}
    
    <p style="margin-top: 30px;"><strong>It only takes 5 minutes to complete!</strong></p>
    
    <p style="font-size: 14px; color: #666;">Subscription ID: {subscription_id}</p>
    """
    
    cta_section = {
        'title': 'Complete Your Profile Now',
        'button_text': 'Update My Profile',
        'button_url': profile_url
    }
    
    return build_email_template(
        hero_title="Complete Your Profile",
        greeting=f"Hi {recipient_name},<br>Action Required",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra="Need help? Contact us at support@citizenbank.co.za"
    )

def create_governance_session_notification_email(
    recipient_name: str,
    session_title: str,
    session_description: str,
    opens_at: str,
    closes_at: str,
    session_url: str,
    meeting_location: Optional[str] = None,
    meeting_date: Optional[str] = None
) -> str:
    """Create governance session notification email.
    
    Args:
        recipient_name: Board member's name
        session_title: Title of the governance session
        session_description: Full description (forms the main email body)
        opens_at: When voting opens (formatted datetime string)
        closes_at: When voting closes (formatted datetime string)
        session_url: URL to view and participate in the session
        meeting_location: Optional physical meeting location
        meeting_date: Optional meeting date/time
    
    Returns:
        Complete HTML email string
    """
    
    # Meeting details section (if provided)
    meeting_info_html = ""
    if meeting_date or meeting_location:
        meeting_date_row = ""
        meeting_location_row = ""
        
        if meeting_date:
            meeting_date_row = f"""
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; font-weight: bold; color: #555;">📅 Meeting Date:</td>
                <td style="padding: 12px 0; color: #333;">{meeting_date}</td>
            </tr>
            """
        
        if meeting_location:
            meeting_location_row = f"""
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px 0; font-weight: bold; color: #555;">📍 Location:</td>
                <td style="padding: 12px 0; color: #333;">{meeting_location}</td>
            </tr>
            """
        
        meeting_info_html = f"""
        <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 8px; max-width: 500px; border: 2px solid {BRAND_PURPLE};">
            <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: {BRAND_PURPLE}; text-align: center;">📋 Meeting Information</p>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                {meeting_date_row}
                {meeting_location_row}
            </table>
        </div>
        """
    
    # Main content with session description as the body
    main_content = f"""
    <p>Dear {recipient_name},</p>
    
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">📊 {session_title}</p>
    
    <div style="margin: 25px auto; padding: 25px; background-color: #f9f9f9; border-left: 4px solid {BRAND_PINK}; border-radius: 4px; max-width: 550px; text-align: left; line-height: 1.8; color: #333;">
        {session_description}
    </div>
    
    {meeting_info_html}
    
    <div style="margin: 25px auto; padding: 20px; background-color: #e3f2fd; border-radius: 8px; max-width: 500px;">
        <p style="margin: 0 0 10px 0; font-size: 16px; color: {BRAND_PURPLE}; font-weight: bold;">⏰ Important Dates</p>
        <table style="width: 100%; text-align: left;">
            <tr>
                <td style="padding: 8px 0; color: #555;">Voting Opens:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #333;">{opens_at}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #555;">Voting Closes:</td>
                <td style="padding: 8px 0; font-weight: bold; color: {BRAND_PINK};">{closes_at}</td>
            </tr>
        </table>
    </div>
    
    <p style="margin-top: 25px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <strong>📢 Action Required:</strong><br>
        Please review the information above and participate in the governance session by clicking the button below.
    </p>
    """
    
    cta_section = {
        'title': 'Ready to Participate?',
        'button_text': '🗳️ View Session & Vote',
        'button_url': session_url
    }
    
    return build_email_template(
        hero_title="Governance Session",
        greeting="New Board Activity",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra='Questions? <a href="' + get_base_url() + '/contact" style="color: white; text-decoration: underline;">Contact our team</a>'
    )
