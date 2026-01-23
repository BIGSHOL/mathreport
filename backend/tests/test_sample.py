"""
Sample test to verify pytest configuration.
"""
import pytest


def test_sample():
    """Simple test to verify pytest is working."""
    assert True


def test_addition():
    """Test basic Python functionality."""
    assert 1 + 1 == 2


@pytest.mark.asyncio
async def test_async_sample():
    """Test async functionality."""
    result = await async_addition(2, 3)
    assert result == 5


async def async_addition(a: int, b: int) -> int:
    """Helper function for async test."""
    return a + b
