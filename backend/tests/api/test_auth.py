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
        raise NotImplementedError(
            "POST /api/v1/auth/login 엔드포인트가 구현되지 않았습니다. "
            "Phase 1 (T1.1)에서 구현 예정"
        )

        # Expected response:
        # {
        #   "access_token": "eyJhbGci...",
        #   "refresh_token": "eyJhbGci...",
        #   "token_type": "bearer",
        #   "expires_in": 900,
        #   "user": {
        #     "id": "...",
        #     "email": "teacher@example.com",
        #     "nickname": "김선생님",
        #     "role": "user"
        #   }
        # }

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-005] 잘못된 비밀번호로 로그인 실패

        Given: 등록된 이메일, 틀린 비밀번호
        When: POST /api/v1/auth/login 요청
        Then: 401 Unauthorized, INVALID_CREDENTIALS 에러
        """
        raise NotImplementedError(
            "비밀번호 검증 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.1)에서 구현 예정"
        )

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-006] 존재하지 않는 사용자 로그인 실패

        Given: 등록되지 않은 이메일
        When: POST /api/v1/auth/login 요청
        Then: 401 Unauthorized, INVALID_CREDENTIALS 에러
        """
        raise NotImplementedError(
            "사용자 존재 여부 검증 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.1)에서 구현 예정"
        )


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
        raise NotImplementedError(
            "POST /api/v1/auth/refresh 엔드포인트가 구현되지 않았습니다. "
            "Phase 1 (T1.1)에서 구현 예정"
        )

        # Expected response:
        # {
        #   "access_token": "new_access_token...",
        #   "token_type": "bearer",
        #   "expires_in": 900
        # }

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-008] 유효하지 않은 토큰으로 갱신 실패

        Given: 만료되거나 조작된 refresh_token
        When: POST /api/v1/auth/refresh 요청
        Then: 401 Unauthorized, INVALID_TOKEN 에러
        """
        raise NotImplementedError(
            "JWT 토큰 검증 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.1)에서 구현 예정"
        )


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
        raise NotImplementedError(
            "GET /api/v1/users/me 엔드포인트가 구현되지 않았습니다. "
            "Phase 1 (T1.1)에서 구현 예정"
        )

        # Expected response:
        # {
        #   "id": "...",
        #   "email": "teacher@example.com",
        #   "nickname": "김선생님",
        #   "role": "user",
        #   "created_at": "2024-01-23T10:00:00Z",
        #   "updated_at": "2024-01-23T10:00:00Z"
        # }

    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """
        [T0.5.3-AUTH-010] 인증 없이 사용자 정보 조회 실패

        Given: Authorization 헤더 없음
        When: GET /api/v1/users/me 요청
        Then: 401 Unauthorized
        """
        raise NotImplementedError(
            "인증 미들웨어가 구현되지 않았습니다. "
            "Phase 1 (T1.1)에서 구현 예정"
        )
