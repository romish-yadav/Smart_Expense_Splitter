"""
AI-powered expense parsing services.

Uses Google Gemini API for:
1. Natural language expense entry parsing
2. Bill text parsing into line items
"""

import json
import os
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)

NL_EXPENSE_PROMPT = """You are an expense parser for a group expense splitting app.
Given a natural language description of an expense, extract structured data.

The group has these members:
{members}

Extract:
- payer_name: Who paid (must match a member name exactly, case-insensitive)
- amount_paise: Total amount in paise (1 INR = 100 paise). If the user says "2400", that means 2400 INR = 240000 paise
- description: Brief description of the expense
- split_mode: One of "equal", "equal_subset", "custom", "weight"
  - "equal": Split equally among ALL group members
  - "equal_subset": Split equally among specified members only
  - "custom": Each person pays a specific different amount
  - "weight": Split by weight/ratio
- split_members: List of member names who share this expense (if not all members)
- custom_amounts: If split_mode is "custom", map of member_name -> amount in paise
- confidence: 0.0 to 1.0, how confident you are in the parsing

IMPORTANT RULES:
- Currency amounts mentioned without unit are assumed to be INR
- Convert all amounts to paise (multiply INR by 100)
- If someone says "reduce X's share by Y", compute the custom amounts accordingly
- If the text says "split between me, A and B", identify who "me" is from context or default to the first member mentioned as payer
- If you cannot parse the input reliably, set confidence below 0.5

Respond ONLY with valid JSON, no markdown formatting:
{{"payer_name": "...", "amount_paise": ..., "description": "...", "split_mode": "...", "split_members": [...], "custom_amounts": {{}}, "confidence": ...}}"""

BILL_PARSE_PROMPT = """You are a bill/receipt parser. Given raw text from a restaurant bill or receipt, extract line items and total.

Extract:
- line_items: Array of {{description, amount_paise}} where amount is in paise (1 INR = 100 paise)
- total_paise: Total bill amount in paise
- confidence: 0.0 to 1.0

IMPORTANT:
- Convert all amounts to paise (multiply INR by 100)
- Include taxes, service charges as separate line items if present
- If the total doesn't match sum of items, use the explicitly stated total
- If you cannot reliably parse the bill, set confidence below 0.5

Respond ONLY with valid JSON, no markdown formatting:
{{"line_items": [{{"description": "...", "amount_paise": ...}}, ...], "total_paise": ..., "confidence": ...}}"""


def get_gemini_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


def parse_nl_expense(
    text: str,
    members: list[dict],
) -> dict | None:
    """
    Parse natural language expense description into structured data.
    Returns parsed expense dict or None if parsing fails.
    """
    model = get_gemini_model()
    if not model:
        return None

    members_str = "\n".join(
        [f"- {m['name']} (ID: {m['id']})" for m in members]
    )
    prompt = NL_EXPENSE_PROMPT.format(members=members_str)

    try:
        response = model.generate_content(
            f"{prompt}\n\nUser input: {text}",
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
        )

        content = response.text
        if not content:
            return None

        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:])
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        parsed = json.loads(content)

        member_map = {m["name"].lower(): m for m in members}

        payer_name = parsed.get("payer_name", "")
        payer = member_map.get(payer_name.lower())
        if not payer:
            for name, m in member_map.items():
                if payer_name.lower() in name or name in payer_name.lower():
                    payer = m
                    break

        if not payer:
            parsed["confidence"] = max(0, parsed.get("confidence", 0) - 0.3)

        parsed["payer"] = payer
        parsed["member_map"] = member_map
        return parsed

    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error("Failed to parse NL expense: %s", e)
        return None
    except Exception as e:
        logger.error("Gemini API error: %s", e)
        return None


def parse_bill_text(
    bill_text: str,
) -> dict | None:
    """
    Parse raw bill/receipt text into line items.
    Returns parsed bill dict or None if parsing fails.
    """
    model = get_gemini_model()
    if not model:
        return None

    try:
        response = model.generate_content(
            f"{BILL_PARSE_PROMPT}\n\nBill text:\n{bill_text}",
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
        )

        content = response.text
        if not content:
            return None

        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:])
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        return json.loads(content)

    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error("Failed to parse bill: %s", e)
        return None
    except Exception as e:
        logger.error("Gemini API error: %s", e)
        return None
