"""Certificate Service Module

Handles all certificate generation, versioning, and management logic.
Decoupled from the API layer for better maintainability and testability.
"""

from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
from concurrent.futures import ThreadPoolExecutor

asyncpg_connection = None  # Type hint for connection


class CertificateService:
    """Service class for managing share certificates"""
    
    def __init__(self, db_connection):
        self.conn = db_connection
        self.executor = ThreadPoolExecutor(max_workers=3)
    
    async def generate_certificate_number(self) -> str:
        """
        Generate next sequential certificate number.
        Format: CB-SHARE-YYYY-NNNNN
        """
        current_year = datetime.now().year
        prefix = f"CB-SHARE-{current_year}-"
        
        # Get highest number for current year
        last_cert = await self.conn.fetchval("""
            SELECT certificate_number 
            FROM share_certificates 
            WHERE certificate_number LIKE $1 
            ORDER BY certificate_number DESC 
            LIMIT 1
        """, f"{prefix}%")
        
        if last_cert:
            # Extract number and increment
            last_num = int(last_cert.split('-')[-1])
            next_num = last_num + 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:05d}"
    
    async def get_or_create_certificate_number(
        self, 
        subscription_id: str
    ) -> str:
        """
        Get existing certificate number for subscription or generate new one.
        Updates the subscription record if generating new number.
        """
        # Check if subscription already has a certificate number
        cert_number = await self.conn.fetchval("""
            SELECT certificate_number 
            FROM share_subscriptions 
            WHERE subscription_id = $1
        """, subscription_id)
        
        if cert_number:
            return cert_number
        
        # Generate new certificate number
        new_cert_number = await self.generate_certificate_number()
        
        # Update subscription
        await self.conn.execute("""
            UPDATE share_subscriptions 
            SET certificate_number = $1 
            WHERE subscription_id = $2
        """, new_cert_number, subscription_id)
        
        return new_cert_number
    
    async def get_next_version(
        self, 
        certificate_number: str
    ) -> int:
        """
        Get the next version number for a certificate.
        Returns 1 if this is the first version.
        """
        latest_version = await self.conn.fetchval("""
            SELECT COALESCE(MAX(version), 0) 
            FROM share_certificates 
            WHERE certificate_number = $1
        """, certificate_number)
        
        return latest_version + 1
    
    async def create_certificate_record(
        self,
        certificate_number: str,
        subscription_data: Dict[str, Any],
        version: int,
        verification_code: str,
        certificate_url: str,
        qr_code_svg: str,
        issued_by: str,
        drive_file_id: Optional[str] = None
    ) -> int:
        """
        Create a new certificate record in the database.
        Never updates existing records - always creates new version.
        
        Returns: certificate_id
        """
        cert_id = await self.conn.fetchval("""
            INSERT INTO share_certificates (
                certificate_number, subscription_id, user_id, full_name,
                shares_count, share_class, id_number, issue_date,
                certificate_url, verification_code, qr_code_svg_data,
                issued_by, status, drive_file_id, version
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id
        """, 
            certificate_number,
            subscription_data['id'],
            subscription_data['user_id'],
            subscription_data['full_name'],
            subscription_data['num_shares'],
            'Ordinary',  # Default share class
            subscription_data['id_number'],
            datetime.now().date(),
            certificate_url,
            verification_code,
            qr_code_svg,
            issued_by,
            'active',
            drive_file_id,
            version
        )
        
        return cert_id
    
    async def update_subscription_issue_date(
        self,
        subscription_id: str
    ) -> None:
        """
        Update the certificate issue date on the subscription.
        """
        await self.conn.execute("""
            UPDATE share_subscriptions 
            SET certificate_issued_date = $1 
            WHERE subscription_id = $2
        """, datetime.now().date(), subscription_id)
    
    async def get_subscription_data(
        self,
        subscription_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch subscription details needed for certificate generation.
        """
        row = await self.conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email, id_number, 
                   num_shares, total_amount, amount_paid, status, certificate_number
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)
        
        return dict(row) if row else None
    
    async def validate_subscription_for_certificate(
        self,
        subscription_data: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        Validate if subscription is eligible for certificate generation.
        
        Returns: (is_valid, error_message)
        """
        if not subscription_data:
            return False, "Subscription not found"
        
        if subscription_data['amount_paid'] <= 0:
            return False, "Cannot generate certificate - no payment received"
        
        return True, None
    
    async def log_certificate_generation(
        self,
        user_id: str,
        certificate_id: int,
        certificate_number: str,
        version: int,
        subscription_id: str
    ) -> None:
        """
        Create audit log entry for certificate generation.
        """
        await self.conn.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, 
            user_id, 
            'certificate_generated', 
            'certificate', 
            str(certificate_id),
            f"Generated certificate {certificate_number} version {version} for subscription {subscription_id}",
            user_id
        )


class CertificateNumberGenerator:
    """
    Utility class for certificate number generation.
    Separated for potential future customization.
    """
    
    @staticmethod
    def format_certificate_number(
        year: int, 
        sequence: int, 
        prefix: str = "CB-SHARE"
    ) -> str:
        """
        Format a certificate number with proper padding.
        """
        return f"{prefix}-{year}-{sequence:05d}"
    
    @staticmethod
    def parse_certificate_number(cert_number: str) -> tuple[str, int, int]:
        """
        Parse a certificate number into its components.
        Returns: (prefix, year, sequence)
        """
        parts = cert_number.split('-')
        if len(parts) >= 4:
            prefix = '-'.join(parts[:-2])
            year = int(parts[-2])
            sequence = int(parts[-1])
            return prefix, year, sequence
        raise ValueError(f"Invalid certificate number format: {cert_number}")
