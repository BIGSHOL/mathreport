import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestAuthAPI:
    """인증 API 테스트 (RED State)"""

    async def test_register_success(self, client: AsyncClient):
        """[T0.5.3-AUTH-BE-001] 회원가입 성공"""
        # Given
        payload = {
            "email": "newuser@example.com",
            "password": "securepass123",
            "nickname": "신규유저"
        }

        # When
        response = await client.post("/api/v1/auth/register", json=payload)

        # Then
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == payload["email"]
        assert data["nickname"] == payload["nickname"]
        assert "id" in data
        assert data["role"] == "user"

    async def test_login_success(self, client: AsyncClient):
        """[T0.5.3-AUTH-BE-002] 로그인 성공"""
        login_data = {
            "email": "teacher@example.com",
            "password": "securepass123"
        }
        
        # 유저 생성 (회원가입)
        await client.post("/api/v1/auth/register", json={
            "email": login_data["email"],
            "password": login_data["password"],
            "nickname": "김선생님"
        })

        # When
        response = await client.post("/api/v1/auth/login", json=login_data)

        # Then
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
