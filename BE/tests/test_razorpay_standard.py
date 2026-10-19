"""
Unit tests for app.core.razorpay — the centralized Razorpay integration module.

HTTP-layer tests (create-order / verify-payment endpoints) live in:
  - tests/test_subscriptions_and_streak.py
  - tests/test_passes_and_coins.py
  - tests/test_courses.py
"""

import hashlib
import hmac

import pytest

from app.core.config import settings
from app.core.razorpay import (
    verify_razorpay_signature,
    verify_razorpay_webhook_signature,
)


# ── verify_razorpay_signature ─────────────────────────────────────────────────

def test_valid_hmac_signature_accepted():
    order_id = "order_unit_test_001"
    payment_id = "pay_unit_test_001"
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    valid_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"), msg, hashlib.sha256
    ).hexdigest()

    assert verify_razorpay_signature(order_id, payment_id, valid_sig) is True


def test_tampered_signature_rejected():
    assert (
        verify_razorpay_signature("order_abc", "pay_xyz", "deadbeef_fake") is False
    )


def test_missing_order_or_payment_id_rejected():
    assert verify_razorpay_signature("", "pay_xyz", "anysig") is False
    assert verify_razorpay_signature("order_abc", "", "anysig") is False


def test_none_signature_rejected_in_production(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert verify_razorpay_signature("order_abc", "pay_xyz", None) is False


def test_webhook_verified_bypass_accepted():
    """Webhook auto-fulfillment path uses 'webhook_verified' as sentinel."""
    assert verify_razorpay_signature("order_abc", "pay_xyz", "webhook_verified") is True


# ── verify_razorpay_webhook_signature ─────────────────────────────────────────

def test_valid_webhook_signature_accepted():
    body = b'{"event":"payment.captured"}'
    secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET
    sig = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

    assert verify_razorpay_webhook_signature(body, sig) is True


def test_invalid_webhook_signature_rejected():
    body = b'{"event":"payment.captured"}'
    assert verify_razorpay_webhook_signature(body, "not_the_real_sig") is False


def test_empty_webhook_body_rejected():
    assert verify_razorpay_webhook_signature(b"", "anysig") is False
