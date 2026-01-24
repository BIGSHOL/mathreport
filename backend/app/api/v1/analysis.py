"""Analysis API endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.schemas.analysis import (
    AnalysisCreateResponse,
    AnalysisDetailResponse,
    AnalysisMetadata,
    AnalysisRequest,
    AnalysisResult as AnalysisResultSchema
)
from app.services.analysis import get_analysis_service

router = APIRouter(tags=["analysis"])


@router.post(
    "/exams/{exam_id}/analyze",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="시험지 분석 요청"
)
async def request_analysis(
    exam_id: str,
    request: AnalysisRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AnalysisCreateResponse:
    """시험지 분석을 요청합니다.
    
    - MOCK: 요청 즉시 분석이 완료됩니다.
    """
    analysis_service = get_analysis_service(db)
    result = await analysis_service.request_analysis(
        exam_id=exam_id,
        user_id=current_user.id,
        force_reanalyze=request.force_reanalyze
    )
    
    # Mock response
    return AnalysisCreateResponse(data=result)


@router.get(
    "/exams/{exam_id}/analysis",
    summary="시험지의 분석 결과 ID 조회"
)
async def get_analysis_by_exam(
    exam_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """시험지에 연결된 분석 결과 ID를 조회합니다."""
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis_by_exam(exam_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    return {"analysis_id": analysis.id}


@router.get(
    "/analysis/{analysis_id}",
    response_model=AnalysisDetailResponse,
    summary="분석 결과 조회"
)
async def get_analysis(
    analysis_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AnalysisDetailResponse:
    """분석 결과를 조회합니다."""

    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    # Check ownership
    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    try:
        result_data = AnalysisResultSchema.model_validate(analysis)
    except Exception as e:
        print(f"[ERROR] Validation failed for analysis {analysis_id}: {e}")
        print(f"  Summary: {analysis.summary}")
        print(f"  Questions: {analysis.questions}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "VALIDATION_ERROR", "message": f"데이터 검증 실패: {str(e)}"}
        )

    return AnalysisDetailResponse(
        data=result_data,
        meta=AnalysisMetadata(
            cache_hit=True,
            analysis_duration=1.5
        )
    )
