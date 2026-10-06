"""AI-powered document analysis and categorization service."""

from typing import Dict, Any, List, Optional
import json
from openai import OpenAI
from app import runtime
import os


class DocumentAnalyzer:
    """Analyze documents using AI to determine category and metadata."""

    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model
        self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    async def analyze_document(
        self,
        file_name: str,
        extracted_text: str,
        available_categories: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze document and suggest categorization."""
        
        # Build category list for prompt
        category_list = "\n".join([
            f"- {cat['name']}: {cat.get('description', 'No description')}"
            for cat in available_categories
        ])

        # Create analysis prompt
        prompt = self._build_analysis_prompt(file_name, extracted_text, category_list)

        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert document classifier for a bank's data room. Analyze documents and categorize them accurately based on their content."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower temperature for more consistent results
                response_format={"type": "json_object"}
            )

            # Parse response
            result_text = response.choices[0].message.content
            result = json.loads(result_text)

            # Validate and normalize result
            return self._normalize_result(result, available_categories)

        except Exception as e:
            print(f"AI analysis error: {str(e)}")
            # Return low confidence result on error
            return {
                "category": None,
                "category_id": None,
                "confidence": 0,
                "document_type": "Unknown",
                "suggested_name": file_name,
                "description": f"Analysis failed: {str(e)}",
                "is_required_for_license": False,
                "error": str(e)
            }

    def _build_analysis_prompt(self, file_name: str, extracted_text: str, category_list: str) -> str:
        """Build the AI analysis prompt."""
        # Truncate text if too long (keep first 3000 chars for context)
        text_sample = extracted_text[:3000] if len(extracted_text) > 3000 else extracted_text
        
        return f"""Analyze this document from a bank's data room and categorize it.

Available Categories:
{category_list}

Document File Name: {file_name}

Document Content:
{text_sample}

Provide your analysis in JSON format with the following structure:
{{
  "category": "exact category name from the list above",
  "confidence": 85,  // 0-100, how confident you are in this categorization
  "document_type": "Brief description of document type",
  "suggested_name": "Clean, professional file name for this document",
  "description": "Brief summary of what this document contains",
  "is_required_for_license": true  // true if this seems like a regulatory/license requirement
}}

Guidelines:
- Use ONLY categories from the provided list
- Confidence score guidelines:
  - 90-100: Very clear match with strong evidence
  - 80-89: Good match with supporting evidence
  - 70-79: Likely match but some ambiguity
  - 50-69: Uncertain, needs human review
  - 0-49: Cannot determine category
- If you cannot confidently categorize, use confidence < 50
- suggested_name should be professional and descriptive (remove random characters, dates can stay)
- Flag as required_for_license if it's clearly regulatory (licenses, compliance, audits, board docs, etc.)
"""

    def _normalize_result(self, result: Dict[str, Any], available_categories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Normalize and validate AI result."""
        # Find matching category
        category_name = result.get("category")
        category_id = None
        
        if category_name:
            for cat in available_categories:
                if cat['name'].lower() == category_name.lower():
                    category_id = cat['id']
                    category_name = cat['name']  # Use exact name from DB
                    break
        
        # Ensure confidence is in valid range
        confidence = result.get("confidence", 0)
        if not isinstance(confidence, (int, float)):
            confidence = 0
        confidence = max(0, min(100, int(confidence)))
        
        # If category not found, reduce confidence
        if category_name and not category_id:
            confidence = min(confidence, 40)
        
        return {
            "category": category_name,
            "category_id": category_id,
            "confidence": confidence,
            "document_type": result.get("document_type", "Unknown"),
            "suggested_name": result.get("suggested_name", ""),
            "description": result.get("description", ""),
            "is_required_for_license": result.get("is_required_for_license", False)
        }
