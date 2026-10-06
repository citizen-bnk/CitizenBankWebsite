"""Email utilities for admin-created subscriptions."""

import asyncpg
from datetime import datetime
from app.libs.email_queue import enqueue_email
from app.libs.url_helpers import get_frontend_base_url


async def send_subscription_created_email(
    conn: asyncpg.Connection,
    email: str,
    full_name: str,
    subscription_id: str,
    share_class: str,
    num_shares: int,
    total_amount: float,
    is_new_user: bool,
    created_by_admin_id: str
) -> None:
    """
    Send email when admin creates a subscription on behalf of an investor.
    
    Args:
        conn: Database connection
        email: Recipient email
        full_name: Recipient name
        subscription_id: Subscription ID
        share_class: Share class (e.g., "Class A")
        num_shares: Number of shares
        total_amount: Total investment amount
        is_new_user: Whether this is a new user (needs to register)
        created_by_admin_id: Admin who created the subscription
    """
    from app.libs.email_templates import build_email_template, BRAND_PURPLE, BRAND_PINK
    
    app_url = get_frontend_base_url()
    
    # Build email subject
    subject = "Share Subscription Created - Citizen Bank"
    
    # HappyCitizen images for visual appeal
    happy_citizens_html = """
    <div style="margin: 30px 0; text-align: center;">
        <img src="https://citizenbank.co.ls/brand/HappyCitizen%201.jpg" 
             alt="Welcome to Citizen Bank" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <img src="https://citizenbank.co.ls/brand/HappyCitizen%203.jpg" 
             alt="Citizen Bank Community" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </div>
    """
    
    # Build email body based on user status
    if is_new_user:
        # New user - needs to register
        main_content = f"""
        <p>Dear {full_name},</p>
        <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">🎉 Welcome to Citizen Bank!</p>
        <p style="font-size: 16px; line-height: 1.8;">Great news! A share subscription has been created on your behalf. You're now on your way to becoming a valued shareholder.</p>
        
        {happy_citizens_html}
        
        <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 12px; max-width: 550px; border: 2px solid {BRAND_PURPLE}; box-shadow: 0 4px 12px rgba(109, 82, 162, 0.15);">
            <p style="margin: 0 0 15px 0; font-size: 18px; color: {BRAND_PURPLE}; font-weight: bold;">📋 Your Subscription Details</p>
            <table style="width: 100%; text-align: left; color: #333;">
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Subscription ID:</td>
                    <td style="padding: 8px 0;">{subscription_id}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Share Class:</td>
                    <td style="padding: 8px 0;">{share_class}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Number of Shares:</td>
                    <td style="padding: 8px 0;">{num_shares:,}</td>
                </tr>
                <tr style="border-top: 2px solid {BRAND_PINK};">
                    <td style="padding: 12px 0 0 0; font-weight: bold; font-size: 16px; color: {BRAND_PURPLE};">Total Investment:</td>
                    <td style="padding: 12px 0 0 0; font-weight: bold; font-size: 16px; color: {BRAND_PURPLE};">LSL {total_amount:,.2f}</td>
                </tr>
            </table>
        </div>
        
        <div style="margin: 25px auto; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; max-width: 500px;">
            <p style="margin: 0; font-weight: bold; color: #856404;">📝 Next Steps to Complete Your Registration:</p>
            <ol style="text-align: left; margin: 15px 0 0 0; padding-left: 20px; color: #555; line-height: 1.8;">
                <li style="margin-bottom: 8px;">Click the button below to access your investor portal</li>
                <li style="margin-bottom: 8px;">Complete your profile with required information</li>
                <li style="margin-bottom: 8px;">Review your subscription details</li>
                <li style="margin-bottom: 8px;">Track your payment status and certificate generation</li>
            </ol>
        </div>
        
        <p style="margin-top: 25px; font-size: 15px; color: #666; line-height: 1.7;">Once you complete your registration, you'll have full access to track your investment, view documents, and manage your shareholding.</p>
        """
        
        cta_section = {
            'title': 'Start Your Investment Journey',
            'button_text': '✓ Complete Registration',
            'button_url': app_url
        }
        
        body_html = build_email_template(
            hero_title="Welcome to Citizen Bank",
            greeting="Your Share Subscription is Ready",
            main_content=main_content,
            cta_section=cta_section,
            footer_extra='Questions? <a href="' + app_url + '/support" style="color: white; text-decoration: underline;">Contact our support team</a>'
        )
    else:
        # Existing user - already registered
        main_content = f"""
        <p>Dear {full_name},</p>
        <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">📈 New Share Subscription Added!</p>
        <p style="font-size: 16px; line-height: 1.8;">A new share subscription has been added to your investor account. Your growing portfolio reflects your commitment to Citizen Bank.</p>
        
        {happy_citizens_html}
        
        <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #f8f0ff 0%, #fff5f9 100%); border-radius: 12px; max-width: 550px; border: 2px solid {BRAND_PURPLE}; box-shadow: 0 4px 12px rgba(109, 82, 162, 0.15);">
            <p style="margin: 0 0 15px 0; font-size: 18px; color: {BRAND_PURPLE}; font-weight: bold;">📋 Subscription Details</p>
            <table style="width: 100%; text-align: left; color: #333;">
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Subscription ID:</td>
                    <td style="padding: 8px 0;">{subscription_id}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Share Class:</td>
                    <td style="padding: 8px 0;">{share_class}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Number of Shares:</td>
                    <td style="padding: 8px 0;">{num_shares:,}</td>
                </tr>
                <tr style="border-top: 2px solid {BRAND_PINK};">
                    <td style="padding: 12px 0 0 0; font-weight: bold; font-size: 16px; color: {BRAND_PURPLE};">Total Investment:</td>
                    <td style="padding: 12px 0 0 0; font-weight: bold; font-size: 16px; color: {BRAND_PURPLE};">LSL {total_amount:,.2f}</td>
                </tr>
            </table>
        </div>
        
        <div style="margin: 25px auto; padding: 20px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px; max-width: 500px;">
            <p style="margin: 0; font-weight: bold; color: #1565c0;">💡 What Happens Next?</p>
            <ul style="text-align: left; margin: 10px 0 0 0; padding-left: 20px; color: #555; line-height: 1.8;">
                <li style="margin-bottom: 8px;">Payment will be processed by our team</li>
                <li style="margin-bottom: 8px;">Once confirmed, your shares will be allocated</li>
                <li style="margin-bottom: 8px;">You'll receive your share certificate via email</li>
                <li style="margin-bottom: 8px;">View all subscriptions in your investor portal</li>
            </ul>
        </div>
        
        <p style="margin-top: 25px; font-size: 15px; color: #666; line-height: 1.7;">Thank you for your continued trust in Citizen Bank. We'll notify you once payment is confirmed and your shares are allocated.</p>
        """
        
        cta_section = {
            'title': 'Track Your Investment',
            'button_text': 'View My Subscriptions',
            'button_url': f'{app_url}/my-subscriptions'
        }
        
        body_html = build_email_template(
            hero_title="New Share Subscription",
            greeting="Your Portfolio is Growing",
            main_content=main_content,
            cta_section=cta_section,
            footer_extra='Questions? <a href="' + app_url + '/support" style="color: white; text-decoration: underline;">Contact our support team</a>'
        )
    
    # Queue email for sending
    await enqueue_email(
        recipient_email=email,
        recipient_name=full_name,
        subject=subject,
        body_html=body_html,
        created_by=created_by_admin_id,
        priority="high"
    )
    
    print(f"✉️ Queued subscription created email to {email} (new_user={is_new_user})")


async def send_payment_confirmed_email(
    conn: asyncpg.Connection,
    email: str,
    full_name: str,
    subscription_id: str,
    share_class: str,
    num_shares: int,
    amount_paid: float,
    created_by_admin_id: str
) -> None:
    """
    Send email when payment is confirmed for admin-created subscription.
    
    Args:
        conn: Database connection
        email: Recipient email
        full_name: Recipient name
        subscription_id: Subscription ID
        share_class: Share class
        num_shares: Number of shares
        amount_paid: Total amount paid
        created_by_admin_id: Admin who processed the payment
    """
    from app.libs.email_templates import build_email_template, BRAND_PURPLE, BRAND_PINK
    
    app_url = get_frontend_base_url()
    
    subject = "Payment Confirmed - Shares Allocated"
    
    # Success imagery
    success_images_html = """
    <div style="margin: 30px 0; text-align: center;">
        <img src="https://citizenbank.co.ls/brand/HappyCitizen%204.jpg" 
             alt="Success" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <img src="https://citizenbank.co.ls/brand/HappyCitizen%207.jpg" 
             alt="Celebration" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </div>
    """
    
    main_content = f"""
    <p>Dear {full_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">✅ Payment Successfully Confirmed!</p>
    <p style="font-size: 16px; line-height: 1.8;">We're pleased to confirm that your payment has been received and processed. Your shares have been allocated to your account.</p>
    
    {success_images_html}
    
    <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; max-width: 550px; border: 2px solid #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);">
        <p style="margin: 0 0 15px 0; font-size: 18px; color: #059669; font-weight: bold;">💰 Payment & Allocation Details</p>
        <table style="width: 100%; text-align: left; color: #333;">
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #059669;">Subscription ID:</td>
                <td style="padding: 8px 0;">{subscription_id}</td>
            </tr>
            <tr style="border-top: 2px solid #10b981;">
                <td style="padding: 12px 0 8px 0; font-weight: bold; font-size: 16px; color: #059669;">Amount Paid:</td>
                <td style="padding: 12px 0 8px 0; font-weight: bold; font-size: 16px; color: #059669;">LSL {amount_paid:,.2f}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Share Class:</td>
                <td style="padding: 8px 0;">{share_class}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-weight: 600; color: {BRAND_PURPLE};">Shares Allocated:</td>
                <td style="padding: 8px 0; font-weight: bold;">{num_shares:,}</td>
            </tr>
        </table>
    </div>
    
    <div style="margin: 25px auto; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0c4a6e;">📜 What's Next?</p>
        <ul style="text-align: left; margin: 10px 0 0 0; padding-left: 20px; color: #555; line-height: 1.8;">
            <li style="margin-bottom: 8px;">Your share certificate is being prepared</li>
            <li style="margin-bottom: 8px;">You'll receive it via email within 2-3 business days</li>
            <li style="margin-bottom: 8px;">View your shareholding in your investor portal</li>
            <li style="margin-bottom: 8px;">Download your payment receipt anytime</li>
        </ul>
    </div>
    
    <div style="margin: 30px auto; padding: 25px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; max-width: 550px; text-align: center; border: 2px solid #f59e0b;">
        <p style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: #92400e;">🎉 Thank You for Your Investment!</p>
        <p style="margin: 0; font-size: 15px; color: #78350f; line-height: 1.6;">Your investment helps strengthen Citizen Bank and supports local development in Lesotho. Together, we're building a stronger financial future.</p>
    </div>
    
    <p style="margin-top: 25px; font-size: 15px; color: #666; line-height: 1.7;">As a valued shareholder, you're now part of our mission to revolutionize banking in Southern Africa.</p>
    """
    
    cta_section = {
        'title': 'View Your Investment Portfolio',
        'button_text': '📊 View My Portfolio',
        'button_url': f'{app_url}/my-subscriptions'
    }
    
    body_html = build_email_template(
        hero_title="Payment Confirmed!",
        greeting="Your Shares Are Now Allocated",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra='Questions? <a href="' + app_url + '/support" style="color: white; text-decoration: underline;">Contact our support team</a>'
    )
    
    # Queue email for sending
    await enqueue_email(
        recipient_email=email,
        recipient_name=full_name,
        subject=subject,
        body_html=body_html,
        created_by=created_by_admin_id,
        priority="high"
    )
    
    print(f"✉️ Queued payment confirmation email to {email}")


async def send_certificate_ready_email(
    conn: asyncpg.Connection,
    email: str,
    full_name: str,
    subscription_id: str,
    certificate_number: str,
    share_class: str,
    num_shares: int,
    certificate_url: str,
    created_by_admin_id: str
) -> None:
    """
    Send email when share certificate is ready for download.
    
    Args:
        conn: Database connection
        email: Recipient email
        full_name: Recipient name
        subscription_id: Subscription ID
        certificate_number: Certificate number
        share_class: Share class
        num_shares: Number of shares
        certificate_url: URL to download certificate
        created_by_admin_id: Admin who generated the certificate
    """
    from app.libs.email_templates import build_email_template, BRAND_PURPLE, BRAND_PINK
    
    app_url = get_frontend_base_url()
    
    subject = "Your Share Certificate is Ready"
    
    # Professional certificate imagery
    certificate_images_html = """
    <div style="margin: 30px 0; text-align: center;">
        <img src="https://citizenbank.co.ls/brand/HappyCitizen%203.jpg" 
             alt="Certificate Ready" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <img src="https://citizenbank.co.ls/brand/HappyCitizen%207.jpg" 
             alt="Achievement" 
             style="max-width: 48%; margin: 4px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    </div>
    """
    
    main_content = f"""
    <p>Dear {full_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">📜 Congratulations! Your Certificate is Ready</p>
    <p style="font-size: 16px; line-height: 1.8;">Your official share certificate has been generated and is ready for download. This is your proof of shareholding in Citizen Bank.</p>
    
    {certificate_images_html}
    
    <div style="margin: 30px auto; padding: 30px; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; max-width: 550px; border: 3px solid {BRAND_PURPLE}; box-shadow: 0 6px 20px rgba(47, 0, 79, 0.2); text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b21a8; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Official Share Certificate</p>
        <h2 style="margin: 10px 0; font-size: 28px; color: {BRAND_PURPLE}; font-weight: bold;">#{certificate_number}</h2>
        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px;">
            <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">{num_shares:,} {share_class} Shares</p>
            <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">Issued to: <strong>{full_name}</strong></p>
        </div>
    </div>
    
    <div style="margin: 30px auto; padding: 25px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">📄 Certificate Details</p>
        <table style="width: 100%; text-align: left; color: #333;">
            <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #78350f;">Certificate Number:</td>
                <td style="padding: 6px 0;">{certificate_number}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #78350f;">Subscription ID:</td>
                <td style="padding: 6px 0;">{subscription_id}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #78350f;">Share Class:</td>
                <td style="padding: 6px 0;">{share_class}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #78350f;">Number of Shares:</td>
                <td style="padding: 6px 0; font-weight: bold;">{num_shares:,}</td>
            </tr>
        </table>
    </div>
    
    <div style="margin: 25px auto; padding: 20px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px; max-width: 500px;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">⚠️ Important Information:</p>
        <ul style="text-align: left; margin: 10px 0 0 0; padding-left: 20px; color: #555; line-height: 1.8;">
            <li style="margin-bottom: 8px;">Keep your certificate in a safe place</li>
            <li style="margin-bottom: 8px;">This is your official proof of shareholding</li>
            <li style="margin-bottom: 8px;">You can download it again anytime from your investor portal</li>
            <li style="margin-bottom: 8px;">For verification, share the certificate number with any queries</li>
        </ul>
    </div>
    
    <div style="margin: 30px auto; padding: 20px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; max-width: 550px; text-align: center; border: 2px solid {BRAND_PINK};">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #991b1b;">🎉 You're Now a Shareholder!</p>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6;">Thank you for being a valued shareholder of Citizen Bank. Your investment supports our mission to strengthen financial services in Lesotho.</p>
    </div>
    
    <p style="margin-top: 25px; font-size: 15px; color: #666; line-height: 1.7;">If you have any questions about your certificate or shareholding, please don't hesitate to contact our team.</p>
    """
    
    # Create two CTA buttons - download and view portal
    cta_section = {
        'title': 'Access Your Certificate',
        'button_text': '💾 Download Certificate (PDF)',
        'button_url': certificate_url
    }
    
    body_html = build_email_template(
        hero_title="Certificate Ready!",
        greeting="Your Official Share Certificate",
        main_content=main_content,
        cta_section=cta_section,
        footer_extra='<a href="' + f'{app_url}/my-subscriptions' + '" style="color: white; text-decoration: underline;">View All My Certificates</a> | <a href="' + app_url + '/support" style="color: white; text-decoration: underline;">Contact Support</a>'
    )
    
    # Queue email for sending
    await enqueue_email(
        recipient_email=email,
        recipient_name=full_name,
        subject=subject,
        body_html=body_html,
        created_by=created_by_admin_id,
        priority="normal"
    )
    
    print(f"✉️ Queued certificate ready email to {email}")
