"""
Pattern Management API
문제 유형별 패턴 및 동적 프롬프트 관리 엔드포인트
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.pattern import (
    ProblemCategory,
    ProblemType,
    ErrorPattern,
    PromptTemplate,
    PatternExample,
)
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
    db: Annotated[AsyncSession, Depends(get_db)],
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """문제 카테고리 목록 조회"""
    query = select(ProblemCategory).order_by(ProblemCategory.display_order)
    if not include_inactive:
        query = query.where(ProblemCategory.is_active == True)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/categories/{category_id}", response_model=ProblemCategoryWithTypes)
async def get_category(
    category_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """카테고리 상세 조회 (하위 유형 포함)"""
    query = (
        select(ProblemCategory)
        .options(selectinload(ProblemCategory.problem_types))
        .where(ProblemCategory.id == category_id)
    )
    result = await db.execute(query)
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

    return category


@router.post("/categories", response_model=ProblemCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: ProblemCategoryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """문제 카테고리 생성 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 중복 검사
    existing = await db.execute(
        select(ProblemCategory).where(ProblemCategory.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 존재하는 카테고리명입니다")

    category = ProblemCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return category


@router.patch("/categories/{category_id}", response_model=ProblemCategoryResponse)
async def update_category(
    category_id: str,
    data: ProblemCategoryUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """문제 카테고리 수정 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(ProblemCategory).where(ProblemCategory.id == category_id)
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)

    return category


# ============================================
# 문제 유형 (세부 분류) CRUD
# ============================================
@router.get("/types", response_model=list[ProblemTypeResponse])
async def list_problem_types(
    db: Annotated[AsyncSession, Depends(get_db)],
    category_id: str | None = Query(None, description="카테고리 필터"),
    grade_level: str | None = Query(None, description="학년 필터"),
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """문제 유형 목록 조회"""
    query = select(ProblemType).order_by(ProblemType.display_order)

    if category_id:
        query = query.where(ProblemType.category_id == category_id)
    if not include_inactive:
        query = query.where(ProblemType.is_active == True)

    result = await db.execute(query)
    types = result.scalars().all()

    # 학년 필터 (JSON 배열 내 검색)
    if grade_level:
        types = [t for t in types if grade_level in t.grade_levels]

    return types


@router.get("/types/{type_id}", response_model=ProblemTypeDetail)
async def get_problem_type(
    type_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """문제 유형 상세 조회 (오류 패턴 포함)"""
    query = (
        select(ProblemType)
        .options(
            selectinload(ProblemType.category),
            selectinload(ProblemType.error_patterns),
        )
        .where(ProblemType.id == type_id)
    )
    result = await db.execute(query)
    problem_type = result.scalar_one_or_none()

    if not problem_type:
        raise HTTPException(status_code=404, detail="문제 유형을 찾을 수 없습니다")

    return problem_type


@router.post("/types", response_model=ProblemTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_problem_type(
    data: ProblemTypeCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """문제 유형 생성 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 카테고리 존재 확인
    category = await db.execute(
        select(ProblemCategory).where(ProblemCategory.id == data.category_id)
    )
    if not category.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

    problem_type = ProblemType(**data.model_dump())
    db.add(problem_type)
    await db.commit()
    await db.refresh(problem_type)

    return problem_type


@router.patch("/types/{type_id}", response_model=ProblemTypeResponse)
async def update_problem_type(
    type_id: str,
    data: ProblemTypeUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """문제 유형 수정 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(ProblemType).where(ProblemType.id == type_id)
    )
    problem_type = result.scalar_one_or_none()

    if not problem_type:
        raise HTTPException(status_code=404, detail="문제 유형을 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(problem_type, key, value)

    await db.commit()
    await db.refresh(problem_type)

    return problem_type


# ============================================
# 오류 패턴 CRUD
# ============================================
@router.get("/errors", response_model=list[ErrorPatternResponse])
async def list_error_patterns(
    db: Annotated[AsyncSession, Depends(get_db)],
    problem_type_id: str | None = Query(None, description="문제 유형 필터"),
    error_type: str | None = Query(None, description="오류 유형 필터"),
    frequency: str | None = Query(None, description="빈도 필터"),
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """오류 패턴 목록 조회"""
    query = select(ErrorPattern).order_by(ErrorPattern.occurrence_count.desc())

    if problem_type_id:
        query = query.where(ErrorPattern.problem_type_id == problem_type_id)
    if error_type:
        query = query.where(ErrorPattern.error_type == error_type)
    if frequency:
        query = query.where(ErrorPattern.frequency == frequency)
    if not include_inactive:
        query = query.where(ErrorPattern.is_active == True)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/errors/{pattern_id}", response_model=ErrorPatternDetail)
async def get_error_pattern(
    pattern_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """오류 패턴 상세 조회 (예시 포함)"""
    query = (
        select(ErrorPattern)
        .options(
            selectinload(ErrorPattern.problem_type),
            selectinload(ErrorPattern.examples),
        )
        .where(ErrorPattern.id == pattern_id)
    )
    result = await db.execute(query)
    pattern = result.scalar_one_or_none()

    if not pattern:
        raise HTTPException(status_code=404, detail="오류 패턴을 찾을 수 없습니다")

    return pattern


@router.post("/errors", response_model=ErrorPatternResponse, status_code=status.HTTP_201_CREATED)
async def create_error_pattern(
    data: ErrorPatternCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """오류 패턴 생성 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 문제 유형 존재 확인
    problem_type = await db.execute(
        select(ProblemType).where(ProblemType.id == data.problem_type_id)
    )
    if not problem_type.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="문제 유형을 찾을 수 없습니다")

    # Pydantic 모델을 dict로 변환 (중첩 모델 처리)
    pattern_data = data.model_dump()
    pattern_data["wrong_examples"] = [ex.model_dump() if hasattr(ex, 'model_dump') else ex for ex in data.wrong_examples]
    pattern_data["correct_examples"] = [ex.model_dump() if hasattr(ex, 'model_dump') else ex for ex in data.correct_examples]

    pattern = ErrorPattern(**pattern_data)
    db.add(pattern)
    await db.commit()
    await db.refresh(pattern)

    return pattern


@router.patch("/errors/{pattern_id}", response_model=ErrorPatternResponse)
async def update_error_pattern(
    pattern_id: str,
    data: ErrorPatternUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """오류 패턴 수정 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(ErrorPattern).where(ErrorPattern.id == pattern_id)
    )
    pattern = result.scalar_one_or_none()

    if not pattern:
        raise HTTPException(status_code=404, detail="오류 패턴을 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)

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

    for key, value in update_data.items():
        setattr(pattern, key, value)

    await db.commit()
    await db.refresh(pattern)

    return pattern


# ============================================
# 프롬프트 템플릿 CRUD
# ============================================
@router.get("/templates", response_model=list[PromptTemplateResponse])
async def list_prompt_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    template_type: str | None = Query(None, description="템플릿 유형 필터"),
    problem_type_id: str | None = Query(None, description="문제 유형 필터"),
    include_inactive: bool = Query(False, description="비활성 포함"),
):
    """프롬프트 템플릿 목록 조회"""
    query = select(PromptTemplate).order_by(PromptTemplate.priority.desc())

    if template_type:
        query = query.where(PromptTemplate.template_type == template_type)
    if problem_type_id:
        query = query.where(PromptTemplate.problem_type_id == problem_type_id)
    if not include_inactive:
        query = query.where(PromptTemplate.is_active == True)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/templates", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt_template(
    data: PromptTemplateCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """프롬프트 템플릿 생성 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    template_data = data.model_dump()
    template_data["conditions"] = data.conditions.model_dump() if data.conditions else {}

    template = PromptTemplate(**template_data)
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return template


@router.patch("/templates/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: str,
    data: PromptTemplateUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """프롬프트 템플릿 수정 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(PromptTemplate).where(PromptTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="프롬프트 템플릿을 찾을 수 없습니다")

    update_data = data.model_dump(exclude_unset=True)
    if "conditions" in update_data and update_data["conditions"]:
        update_data["conditions"] = update_data["conditions"].model_dump() if hasattr(update_data["conditions"], 'model_dump') else update_data["conditions"]

    for key, value in update_data.items():
        setattr(template, key, value)

    await db.commit()
    await db.refresh(template)

    return template


# ============================================
# 패턴 예시 CRUD
# ============================================
@router.post("/examples", response_model=PatternExampleResponse, status_code=status.HTTP_201_CREATED)
async def create_pattern_example(
    data: PatternExampleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """패턴 예시 추가"""
    # 오류 패턴 존재 확인
    error_pattern = await db.execute(
        select(ErrorPattern).where(ErrorPattern.id == data.error_pattern_id)
    )
    if not error_pattern.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="오류 패턴을 찾을 수 없습니다")

    example = PatternExample(**data.model_dump(), source="manual")
    db.add(example)
    await db.commit()
    await db.refresh(example)

    return example


@router.patch("/examples/{example_id}/verify", response_model=PatternExampleResponse)
async def verify_pattern_example(
    example_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """패턴 예시 검증 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(PatternExample).where(PatternExample.id == example_id)
    )
    example = result.scalar_one_or_none()

    if not example:
        raise HTTPException(status_code=404, detail="예시를 찾을 수 없습니다")

    from datetime import datetime
    example.is_verified = True
    example.verified_by = current_user.id
    example.verified_at = datetime.utcnow()

    await db.commit()
    await db.refresh(example)

    return example


# ============================================
# 동적 프롬프트 빌드
# ============================================
@router.post("/build-prompt", response_model=BuildPromptResponse)
async def build_dynamic_prompt(
    request: BuildPromptRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
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
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """패턴 시스템 통계 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 카운트 쿼리
    categories_count = await db.execute(select(func.count(ProblemCategory.id)))
    types_count = await db.execute(select(func.count(ProblemType.id)))
    patterns_count = await db.execute(select(func.count(ErrorPattern.id)))
    examples_count = await db.execute(select(func.count(PatternExample.id)))
    verified_count = await db.execute(
        select(func.count(PatternExample.id)).where(PatternExample.is_verified == True)
    )

    # Top 오류 패턴
    top_patterns_result = await db.execute(
        select(ErrorPattern)
        .order_by(ErrorPattern.occurrence_count.desc())
        .limit(10)
    )
    top_patterns = [
        {"id": p.id, "name": p.name, "count": p.occurrence_count}
        for p in top_patterns_result.scalars().all()
    ]

    # 유형별 정확도
    types_result = await db.execute(select(ProblemType))
    accuracy_by_type = {
        t.name: t.accuracy_rate
        for t in types_result.scalars().all()
        if t.accuracy_rate > 0
    }

    avg_accuracy = sum(accuracy_by_type.values()) / len(accuracy_by_type) if accuracy_by_type else 0.0

    return PatternStats(
        total_categories=categories_count.scalar() or 0,
        total_problem_types=types_count.scalar() or 0,
        total_error_patterns=patterns_count.scalar() or 0,
        total_examples=examples_count.scalar() or 0,
        verified_examples=verified_count.scalar() or 0,
        top_error_patterns=top_patterns,
        average_accuracy=avg_accuracy,
        accuracy_by_type=accuracy_by_type,
    )
