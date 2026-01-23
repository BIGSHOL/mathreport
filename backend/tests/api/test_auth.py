"""
Authentication API Tests
FEAT-0: 인증/인가

계약 파일 참조: contracts/auth.contract.ts
스키마 참조: backend/app/schemas/auth.py

테스트 대상 엔드포인트:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- GET /api/v1/users/me

현재 상태: RED (구현 없음)
다음 단계: Phase 1에서 실제 구현 후 GREEN으로 전환
"""

import pytest
from httpx import AsyncClient


class TestRegister:
    """회원가입 테스트"""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-001] 정상적인 회원가입

        Given: 유효한 회원가입 정보 (이메일, 비밀번호, 닉네임)
        When: POST /api/v1/auth/register 요청
        Then: 201 Created, 사용자 정보 반환
        """
        # Arrange
        register_data = {
            "email": "teacher@example.com",
            "password": "securepass123",
            "nickname": "김선생님"
        }

        # Act
        response = await client.post("/api/v1/auth/register", json=register_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == register_data["email"]
        assert data["nickname"] == register_data["nickname"]
        assert data["role"] == "user"
        assert "id" in data
        assert "created_at" in data
        assert "password" not in data

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-002] 중복 이메일 회원가입 실패

        Given: 이미 존재하는 이메일
        When: POST /api/v1/auth/register 요청
        Then: 409 Conflict, EMAIL_ALREADY_EXISTS 에러
        """
        # Arrange
        register_data = {
            "email": "duplicate@example.com",
            "password": "password123",
            "nickname": "첫번째사용자"
        }

        # Act - 첫 번째 회원가입 성공
        response1 = await client.post("/api/v1/auth/register", json=register_data)
        assert response1.status_code == 201

        # Act - 동일 이메일로 재시도
        response2 = await client.post("/api/v1/auth/register", json=register_data)

        # Assert
        assert response2.status_code == 409
        error_data = response2.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == "EMAIL_ALREADY_EXISTS"

    @pytest.mark.asyncio
    async def test_register_invalid_password(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-003] 약한 비밀번호 회원가입 실패

        Given: 비밀번호 정책 위반 (8자 미만, 영문/숫자 미포함)
        When: POST /api/v1/auth/register 요청
        Then: 422 Unprocessable Entity, WEAK_PASSWORD 에러
        """
        # Test case 1: 8자 미만
        response1 = await client.post("/api/v1/auth/register", json={
            "email": "user1@example.com",
            "password": "short",
            "nickname": "사용자1"
        })
        assert response1.status_code == 422

        # Test case 2: 숫자 미포함
        response2 = await client.post("/api/v1/auth/register", json={
            "email": "user2@example.com",
            "password": "onlyletters",
            "nickname": "사용자2"
        })
        assert response2.status_code == 422

        # Test case 3: 영문 미포함
        response3 = await client.post("/api/v1/auth/register", json={
            "email": "user3@example.com",
            "password": "12345678",
            "nickname": "사용자3"
        })
        assert response3.status_code == 422


class TestLogin:
    """로그인 테스트"""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-004] 정상적인 로그인

        Given: 등록된 사용자의 이메일과 비밀번호
        When: POST /api/v1/auth/login 요청
        Then: 200 OK, access_token 및 refresh_token 반환
        """
        # Arrange: 먼저 사용자 등록
        register_data = {
            "email": "login_test@example.com",
            "password": "testpass123",
            "nickname": "테스트유저"
        }
        register_response = await client.post("/api/v1/auth/register", json=register_data)
        assert register_response.status_code == 201

        # Act: 로그인 시도
        login_data = {
            "email": "login_test@example.com",
            "password": "testpass123"
        }
        response = await client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert data["user"]["email"] == "login_test@example.com"
        assert data["user"]["nickname"] == "테스트유저"
        assert data["user"]["role"] == "user"
        assert "id" in data["user"]

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-005] 잘못된 비밀번호로 로그인 실패

        Given: 등록된 이메일, 틀린 비밀번호
        When: POST /api/v1/auth/login 요청
        Then: 401 Unauthorized, INVALID_CREDENTIALS 에러
        """
        # Arrange: 먼저 사용자 등록
        register_data = {
            "email": "wrongpw@example.com",
            "password": "correctpass123",
            "nickname": "패스워드테스트"
        }
        register_response = await client.post("/api/v1/auth/register", json=register_data)
        assert register_response.status_code == 201

        # Act: 잘못된 비밀번호로 로그인 시도
        login_data = {
            "email": "wrongpw@example.com",
            "password": "wrongpass123"
        }
        response = await client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == 401
        error_data = response.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == "INVALID_CREDENTIALS"

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-006] 존재하지 않는 사용자 로그인 실패

        Given: 등록되지 않은 이메일
        When: POST /api/v1/auth/login 요청
        Then: 401 Unauthorized, INVALID_CREDENTIALS 에러
        """
        # Act: 등록되지 않은 이메일로 로그인 시도
        login_data = {
            "email": "nonexistent@example.com",
            "password": "anypassword123"
        }
        response = await client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == 401
        error_data = response.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == "INVALID_CREDENTIALS"


class TestRefreshToken:
    """토큰 갱신 테스트"""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-007] 정상적인 토큰 갱신

        Given: 유효한 refresh_token
        When: POST /api/v1/auth/refresh 요청
        Then: 200 OK, 새로운 access_token 반환
        """
        # Arrange: 사용자 등록 및 로그인으로 refresh_token 획득
        register_data = {
            "email": "refresh@example.com",
            "password": "refreshtest123",
            "nickname": "리프레시테스트"
        }
        await client.post("/api/v1/auth/register", json=register_data)

        login_response = await client.post("/api/v1/auth/login", json={
            "email": "refresh@example.com",
            "password": "refreshtest123"
        })
        refresh_token = login_response.json()["refresh_token"]

        # Act: Refresh token으로 새 access token 요청
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-008] 유효하지 않은 토큰으로 갱신 실패

        Given: 만료되거나 조작된 refresh_token
        When: POST /api/v1/auth/refresh 요청
        Then: 401 Unauthorized, INVALID_TOKEN 에러
        """
        # Act: 조작된 refresh token으로 요청
        response = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid.token.here"
        })

        # Assert
        assert response.status_code == 401
        error_data = response.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == "INVALID_TOKEN"


class TestGetCurrentUser:
    """현재 사용자 정보 조회 테스트"""

    @pytest.mark.asyncio
    async def test_get_current_user(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-009] 인증된 사용자 정보 조회

        Given: 유효한 access_token
        When: GET /api/v1/users/me 요청 (Authorization: Bearer {token})
        Then: 200 OK, 사용자 정보 반환
        """
        # Arrange: 사용자 등록 및 로그인으로 access_token 획득
        register_data = {
            "email": "currentuser@example.com",
            "password": "currentuser123",
            "nickname": "현재유저"
        }
        await client.post("/api/v1/auth/register", json=register_data)

        login_response = await client.post("/api/v1/auth/login", json={
            "email": "currentuser@example.com",
            "password": "currentuser123"
        })
        access_token = login_response.json()["access_token"]

        # Act: Authorization 헤더와 함께 사용자 정보 요청
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "currentuser@example.com"
        assert data["nickname"] == "현재유저"
        assert data["role"] == "user"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-010] 인증 없이 사용자 정보 조회 실패

        Given: Authorization 헤더 없음
        When: GET /api/v1/users/me 요청
        Then: 401 Unauthorized
        """
        # Act: Authorization 헤더 없이 요청
        response = await client.get("/api/v1/users/me")

        # Assert
        assert response.status_code == 401
