"""
Pattern Management API (Supabase REST API)
문제 유형별 패턴 및 동적 프롬프트 관리 엔드포인트
"""
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, status, Query

from app.core.deps import CurrentUser, DbDep
from app.schemas.pattern import (
    # Category
    ProblemCategoryCreate,
    ProblemCategoryUpdate,
    ProblemCategoryResponse,
    ProblemCategoryWithTypes,
    # Type
    ProblemTypeCreate,
    ProblemTypeUpdate,
    ProblemTypeResponse,
    ProblemTypeDetail,
    # Error Pattern
    ErrorPatternCreate,
    ErrorPatternUpdate,
    ErrorPatternResponse,
    ErrorPatternDetail,
    # Prompt Template
    PromptTemplateCreate,
    PromptTemplateUpdate,
    PromptTemplateResponse,
    # Pattern Example
    PatternExampleCreate,
    PatternExampleUpdate,
    PatternExampleResponse,
    # Dynamic Prompt
    BuildPromptRequest,
    BuildPromptResponse,
    # Stats
    PatternStats,
)

router = APIRouter(prefix="/patterns", tags=["patterns"])


# ============================================
# 문제 카테고리 (대분류) CRUD
# ============================================
@router.get("/categories", response_model=list[ProblemCategoryResponse])
async def list_categories(
    db: DbDep,
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """문제 카테고리 목록 조회"""
    query = db.table("problem_categories").select("*").order("display_order")
    if not include_inactive:
        query = query.eq("is_active", True)

    result = await query.execute()
    return result.data or []


@router.get("/categories/{category_id}", response_model=ProblemCategoryWithTypes)
async def get_category(
    category_id: str,
    db: DbDep,
):
    """카테고리 상세 조회 (하위 유형 포함)"""
    # 카테고리 조회
    cat_result = await db.table("problem_categories").select("*").eq("id", category_id).maybe_single().execute()

    if not cat_result.data:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

    # 하위 유형 조회
    types_result = await db.table("problem_types").select("*").eq("category_id", category_id).execute()

    category = cat_result.data
    category["problem_types"] = types_result.data or []

    return category


@router.post("/categories", response_model=ProblemCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: ProblemCategoryCreate,
    db: DbDep,
    current_user: CurrentUser,
):
    """문제 카테고리 생성 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 중복 검사
    existing = await db.table("problem_categories").select("id").eq("name", data.name).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="이미 존재하는 카테고리명입니다")

    category_data = data.model_dump()
    category_data["id"] = str(uuid.uuid4())
    category_data["created_at"] = datetime.utcnow().isoformat()
    category_data["updated_at"] = datetime.utcnow().isoformat()

    result = await db.table("problem_categories").insert(category_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"생성 실패: {result.error}")

    return result.data


@router.patch("/categories/{category_id}", response_model=ProblemCategoryResponse)
async def update_category(
    category_id: str,
    data: ProblemCategoryUpdate,
    db: DbDep,
    current_user: CurrentUser,
):
    """문제 카테고리 수정 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    existing = await db.table("problem_categories").select("id").eq("id", category_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = await db.table("problem_categories").eq("id", category_id).update(update_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"수정 실패: {result.error}")

    return result.data


# ============================================
# 문제 유형 (세부 분류) CRUD
# ============================================
@router.get("/types", response_model=list[ProblemTypeResponse])
async def list_problem_types(
    db: DbDep,
    category_id: str | None = Query(None, description="카테고리 필터"),
    grade_level: str | None = Query(None, description="학년 필터"),
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """문제 유형 목록 조회"""
    query = db.table("problem_types").select("*").order("display_order")

    if category_id:
        query = query.eq("category_id", category_id)
    if not include_inactive:
        query = query.eq("is_active", True)

    result = await query.execute()
    types = result.data or []

    # 학년 필터 (JSON 배열 내 검색 - 클라이언트 사이드 필터링)
    if grade_level:
        types = [t for t in types if grade_level in (t.get("grade_levels") or [])]

    return types


@router.get("/types/{type_id}", response_model=ProblemTypeDetail)
async def get_problem_type(
    type_id: str,
    db: DbDep,
):
    """문제 유형 상세 조회 (오류 패턴 포함)"""
    # 문제 유형 조회
    type_result = await db.table("problem_types").select("*").eq("id", type_id).maybe_single().execute()

    if not type_result.data:
        raise HTTPException(status_code=404, detail="문제 유형을 찾을 수 없습니다")

    problem_type = type_result.data

    # 카테고리 조회
    if problem_type.get("category_id"):
        cat_result = await db.table("problem_categories").select("*").eq("id", problem_type["category_id"]).maybe_single().execute()
        problem_type["category"] = cat_result.data

    # 오류 패턴 조회
    patterns_result = await db.table("error_patterns").select("*").eq("problem_type_id", type_id).execute()
    problem_type["error_patterns"] = patterns_result.data or []

    return problem_type


@router.post("/types", response_model=ProblemTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_problem_type(
    data: ProblemTypeCreate,
    db: DbDep,
    current_user: CurrentUser,
):
    """문제 유형 생성 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 카테고리 존재 확인
    category = await db.table("problem_categories").select("id").eq("id", data.category_id).maybe_single().execute()
    if not category.data:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

    type_data = data.model_dump()
    type_data["id"] = str(uuid.uuid4())
    type_data["created_at"] = datetime.utcnow().isoformat()
    type_data["updated_at"] = datetime.utcnow().isoformat()

    result = await db.table("problem_types").insert(type_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"생성 실패: {result.error}")

    return result.data


@router.patch("/types/{type_id}", response_model=ProblemTypeResponse)
async def update_problem_type(
    type_id: str,
    data: ProblemTypeUpdate,
    db: DbDep,
    current_user: CurrentUser,
):
    """문제 유형 수정 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    existing = await db.table("problem_types").select("id").eq("id", type_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="문제 유형을 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = await db.table("problem_types").eq("id", type_id).update(update_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"수정 실패: {result.error}")

    return result.data


# ============================================
# 오류 패턴 CRUD
# ============================================
@router.get("/errors", response_model=list[ErrorPatternResponse])
async def list_error_patterns(
    db: DbDep,
    problem_type_id: str | None = Query(None, description="문제 유형 필터"),
    error_type: str | None = Query(None, description="오류 유형 필터"),
    frequency: str | None = Query(None, description="빈도 필터"),
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """오류 패턴 목록 조회"""
    query = db.table("error_patterns").select("*").order("occurrence_count", desc=True)

    if problem_type_id:
        query = query.eq("problem_type_id", problem_type_id)
    if error_type:
        query = query.eq("error_type", error_type)
    if frequency:
        query = query.eq("frequency", frequency)
    if not include_inactive:
        query = query.eq("is_active", True)

    result = await query.execute()
    return result.data or []


@router.get("/errors/{pattern_id}", response_model=ErrorPatternDetail)
async def get_error_pattern(
    pattern_id: str,
    db: DbDep,
):
    """오류 패턴 상세 조회 (예시 포함)"""
    # 오류 패턴 조회
    pattern_result = await db.table("error_patterns").select("*").eq("id", pattern_id).maybe_single().execute()

    if not pattern_result.data:
        raise HTTPException(status_code=404, detail="오류 패턴을 찾을 수 없습니다")

    pattern = pattern_result.data

    # 문제 유형 조회
    if pattern.get("problem_type_id"):
        type_result = await db.table("problem_types").select("*").eq("id", pattern["problem_type_id"]).maybe_single().execute()
        pattern["problem_type"] = type_result.data

    # 예시 조회
    examples_result = await db.table("pattern_examples").select("*").eq("error_pattern_id", pattern_id).execute()
    pattern["examples"] = examples_result.data or []

    return pattern


@router.post("/errors", response_model=ErrorPatternResponse, status_code=status.HTTP_201_CREATED)
async def create_error_pattern(
    data: ErrorPatternCreate,
    db: DbDep,
    current_user: CurrentUser,
):
    """오류 패턴 생성 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 문제 유형 존재 확인
    problem_type = await db.table("problem_types").select("id").eq("id", data.problem_type_id).maybe_single().execute()
    if not problem_type.data:
        raise HTTPException(status_code=404, detail="문제 유형을 찾을 수 없습니다")

    pattern_data = data.model_dump()
    pattern_data["id"] = str(uuid.uuid4())
    pattern_data["created_at"] = datetime.utcnow().isoformat()
    pattern_data["updated_at"] = datetime.utcnow().isoformat()

    # 중첩 모델 처리
    if "wrong_examples" in pattern_data:
        pattern_data["wrong_examples"] = [
            ex.model_dump() if hasattr(ex, 'model_dump') else ex
            for ex in (pattern_data["wrong_examples"] or [])
        ]
    if "correct_examples" in pattern_data:
        pattern_data["correct_examples"] = [
            ex.model_dump() if hasattr(ex, 'model_dump') else ex
            for ex in (pattern_data["correct_examples"] or [])
        ]

    result = await db.table("error_patterns").insert(pattern_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"생성 실패: {result.error}")

    return result.data


@router.patch("/errors/{pattern_id}", response_model=ErrorPatternResponse)
async def update_error_pattern(
    pattern_id: str,
    data: ErrorPatternUpdate,
    db: DbDep,
    current_user: CurrentUser,
):
    """오류 패턴 수정 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    existing = await db.table("error_patterns").select("id").eq("id", pattern_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="오류 패턴을 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()

    # 중첩 모델 처리
    if "wrong_examples" in update_data and update_data["wrong_examples"]:
        update_data["wrong_examples"] = [
            ex.model_dump() if hasattr(ex, 'model_dump') else ex
            for ex in update_data["wrong_examples"]
        ]
    if "correct_examples" in update_data and update_data["correct_examples"]:
        update_data["correct_examples"] = [
            ex.model_dump() if hasattr(ex, 'model_dump') else ex
            for ex in update_data["correct_examples"]
        ]

    result = await db.table("error_patterns").eq("id", pattern_id).update(update_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"수정 실패: {result.error}")

    return result.data


# ============================================
# 프롬프트 템플릿 CRUD
# ============================================
@router.get("/templates", response_model=list[PromptTemplateResponse])
async def list_prompt_templates(
    db: DbDep,
    template_type: str | None = Query(None, description="템플릿 유형 필터"),
    problem_type_id: str | None = Query(None, description="문제 유형 필터"),
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """프롬프트 템플릿 목록 조회"""
    query = db.table("prompt_templates").select("*").order("priority", desc=True)

    if template_type:
        query = query.eq("template_type", template_type)
    if problem_type_id:
        query = query.eq("problem_type_id", problem_type_id)
    if not include_inactive:
        query = query.eq("is_active", True)

    result = await query.execute()
    return result.data or []


@router.post("/templates", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt_template(
    data: PromptTemplateCreate,
    db: DbDep,
    current_user: CurrentUser,
):
    """프롬프트 템플릿 생성 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    template_data = data.model_dump()
    template_data["id"] = str(uuid.uuid4())
    template_data["created_at"] = datetime.utcnow().isoformat()
    template_data["updated_at"] = datetime.utcnow().isoformat()

    if template_data.get("conditions"):
        template_data["conditions"] = (
            data.conditions.model_dump()
            if hasattr(data.conditions, 'model_dump')
            else template_data["conditions"]
        )

    result = await db.table("prompt_templates").insert(template_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"생성 실패: {result.error}")

    return result.data


@router.patch("/templates/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: str,
    data: PromptTemplateUpdate,
    db: DbDep,
    current_user: CurrentUser,
):
    """프롬프트 템플릿 수정 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    existing = await db.table("prompt_templates").select("id").eq("id", template_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="프롬프트 템플릿을 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()

    if "conditions" in update_data and update_data["conditions"]:
        update_data["conditions"] = (
            update_data["conditions"].model_dump()
            if hasattr(update_data["conditions"], 'model_dump')
            else update_data["conditions"]
        )

    result = await db.table("prompt_templates").eq("id", template_id).update(update_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"수정 실패: {result.error}")

    return result.data


# ============================================
# 패턴 예시 CRUD
# ============================================
@router.post("/examples", response_model=PatternExampleResponse, status_code=status.HTTP_201_CREATED)
async def create_pattern_example(
    data: PatternExampleCreate,
    db: DbDep,
    current_user: CurrentUser,
):
    """패턴 예시 추가"""
    # 오류 패턴 존재 확인
    error_pattern = await db.table("error_patterns").select("id").eq("id", data.error_pattern_id).maybe_single().execute()
    if not error_pattern.data:
        raise HTTPException(status_code=404, detail="오류 패턴을 찾을 수 없습니다")

    example_data = data.model_dump()
    example_data["id"] = str(uuid.uuid4())
    example_data["source"] = "manual"
    example_data["created_at"] = datetime.utcnow().isoformat()
    example_data["updated_at"] = datetime.utcnow().isoformat()

    result = await db.table("pattern_examples").insert(example_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"생성 실패: {result.error}")

    return result.data


@router.patch("/examples/{example_id}/verify", response_model=PatternExampleResponse)
async def verify_pattern_example(
    example_id: str,
    db: DbDep,
    current_user: CurrentUser,
):
    """패턴 예시 검증 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    existing = await db.table("pattern_examples").select("id").eq("id", example_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="예시를 찾을 수 없습니다")

    update_data = {
        "is_verified": True,
        "verified_by": current_user["id"],
        "verified_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.table("pattern_examples").eq("id", example_id).update(update_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"검증 실패: {result.error}")

    return result.data


# ============================================
# 동적 프롬프트 빌드
# ============================================
@router.post("/build-prompt", response_model=BuildPromptResponse)
async def build_dynamic_prompt(
    request: BuildPromptRequest,
    db: DbDep,
):
    """
    동적 프롬프트 빌드
    시험지 컨텍스트에 맞는 최적화된 프롬프트 생성
    """
    from app.services.prompt_builder import PromptBuilder

    builder = PromptBuilder(db)
    result = await builder.build(request)

    return result


# ============================================
# 통계
# ============================================
@router.get("/stats", response_model=PatternStats)
async def get_pattern_stats(
    db: DbDep,
    current_user: CurrentUser,
):
    """패턴 시스템 통계 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 카운트 쿼리
    categories_result = await db.table("problem_categories").select("id").execute()
    types_result = await db.table("problem_types").select("id").execute()
    patterns_result = await db.table("error_patterns").select("id").execute()
    examples_result = await db.table("pattern_examples").select("id").execute()
    verified_result = await db.table("pattern_examples").select("id").eq("is_verified", True).execute()

    categories_count = len(categories_result.data) if categories_result.data else 0
    types_count = len(types_result.data) if types_result.data else 0
    patterns_count = len(patterns_result.data) if patterns_result.data else 0
    examples_count = len(examples_result.data) if examples_result.data else 0
    verified_count = len(verified_result.data) if verified_result.data else 0

    # Top 오류 패턴
    top_patterns_result = await db.table("error_patterns").select("id,name,occurrence_count").order(
        "occurrence_count", desc=True
    ).limit(10).execute()
    top_patterns = [
        {"id": p["id"], "name": p["name"], "count": p.get("occurrence_count", 0)}
        for p in (top_patterns_result.data or [])
    ]

    # 유형별 정확도
    types_full_result = await db.table("problem_types").select("name,accuracy_rate").execute()
    accuracy_by_type = {
        t["name"]: t["accuracy_rate"]
        for t in (types_full_result.data or [])
        if t.get("accuracy_rate", 0) > 0
    }

    avg_accuracy = sum(accuracy_by_type.values()) / len(accuracy_by_type) if accuracy_by_type else 0.0

    return PatternStats(
        total_categories=categories_count,
        total_problem_types=types_count,
        total_error_patterns=patterns_count,
        total_examples=examples_count,
        verified_examples=verified_count,
        top_error_patterns=top_patterns,
        average_accuracy=avg_accuracy,
        accuracy_by_type=accuracy_by_type,
    )
