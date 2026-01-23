# Backend Tests

## Setup

Tests are configured using pytest with async support via pytest-asyncio.

### Configuration Files

- `pytest.ini`: Main pytest configuration
- `pyproject.toml`: Also contains pytest settings (pytest.ini takes precedence)
- `conftest.py`: Shared fixtures and test utilities

## Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_sample.py

# Run tests matching a pattern
pytest -k "test_auth"

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run only unit tests (fast)
pytest -m unit

# Skip slow tests
pytest -m "not slow"
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py          # Shared fixtures
├── test_sample.py       # Sample tests
└── api/                 # API endpoint tests
    └── test_auth.py
```

## Available Fixtures

Once the application structure is created, these fixtures will be available:

- `test_engine`: SQLite in-memory database engine
- `db_session`: Fresh database session for each test (auto-rollback)
- `client`: Async HTTP client for testing endpoints
- `sync_client`: Synchronous test client
- `event_loop`: Event loop for async tests

## Writing Tests

### Basic Test

```python
def test_something():
    assert True
```

### Async Test

```python
import pytest

@pytest.mark.asyncio
async def test_async_endpoint(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
```

### Database Test

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_with_database(db_session: AsyncSession):
    # Your test code here
    pass
```

## Test Markers

- `@pytest.mark.unit`: Unit tests (fast, isolated)
- `@pytest.mark.integration`: Integration tests (may require real database)
- `@pytest.mark.slow`: Slow tests (can be skipped during development)

## Dependencies

- pytest: Test framework
- pytest-asyncio: Async test support
- httpx: Async HTTP client for API testing
