"""Trends API endpoints - 출제 경향 분석."""
from collections import Counter, defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.deps import CurrentUser, DbDep
from app.db.supabase_client import SupabaseClient

router = APIRouter(prefix="/trends", tags=["trends"])


# ============================================
# Response Schemas
# ============================================


class TopicStat(BaseModel):
    """단원별 통계"""
    topic: str = Field(description="단원명 (예: 공통수학1 > 다항식 > 인수분해)")
    count: int = Field(ge=0, description="출제 문항 수")
    percentage: float = Field(ge=0, le=100, description="전체 대비 비율 (%)")
    avg_difficulty: str | None = Field(None, description="평균 난이도 (high, medium, low)")
    total_points: float = Field(ge=0, description="배점 합계")


class DifficultyTrendStat(BaseModel):
    """난이도 통계"""
    difficulty: str = Field(description="난이도 (high, medium, low)")
    count: int = Field(ge=0, description="문항 수")
    percentage: float = Field(ge=0, le=100, description="비율 (%)")
    avg_points: float = Field(ge=0, description="평균 배점")


class QuestionTypeStat(BaseModel):
    """문항 유형 통계"""
    question_type: str = Field(description="문항 유형")
    count: int = Field(ge=0, description="문항 수")
    percentage: float = Field(ge=0, le=100, description="비율 (%)")
    avg_difficulty: str | None = Field(None, description="평균 난이도")


class QuestionFormatStat(BaseModel):
    """문항 형식 통계"""
    question_format: str = Field(description="문항 형식 (objective, short_answer, essay)")
    count: int = Field(ge=0, description="문항 수")
    percentage: float = Field(ge=0, le=100, description="비율 (%)")
    avg_points: float = Field(ge=0, description="평균 배점")


class TextbookStat(BaseModel):
    """교과서별 통계 (과목 단위)"""
    textbook: str = Field(description="교과서명 (예: 공통수학1)")
    count: int = Field(ge=0, description="출제 문항 수")
    percentage: float = Field(ge=0, le=100, description="비율 (%)")
    chapters: list[str] = Field(description="포함된 대단원 목록")


class TrendsSummary(BaseModel):
    """전체 통계 요약"""
    total_exams: int = Field(ge=0, description="분석된 시험지 수")
    total_questions: int = Field(ge=0, description="전체 문항 수")
    avg_questions_per_exam: float = Field(ge=0, description="시험지당 평균 문항 수")
    total_points: float = Field(ge=0, description="전체 배점 합계")
    avg_confidence: float | None = Field(None, ge=0, le=1, description="평균 신뢰도")


class TrendsResponse(BaseModel):
    """출제 경향 분석 응답"""
    summary: TrendsSummary
    topics: list[TopicStat] = Field(description="단원별 통계 (출제 빈도순)")
    difficulty: list[DifficultyTrendStat] = Field(description="난이도 분포")
    question_types: list[QuestionTypeStat] = Field(description="문항 유형 분포")
    question_formats: list[QuestionFormatStat] = Field(description="문항 형식 분포")
    textbooks: list[TextbookStat] = Field(description="교과서별 통계")


# ============================================
# API Endpoints
# ============================================


@router.get(
    "",
    response_model=TrendsResponse,
    summary="출제 경향 분석 조회"
)
async def get_trends(
    subject: Annotated[str | None, Query(description="과목 필터 (기본값: 전체)")] = None,
    grade: Annotated[str | None, Query(description="학년 필터 (기본값: 전체)")] = None,
    school_region: Annotated[str | None, Query(description="지역 필터 (기본값: 전체)")] = None,
    school_type: Annotated[str | None, Query(description="학교 유형 필터 (기본값: 전체)")] = None,
    current_user: CurrentUser = None,
    db: DbDep = None,
) -> TrendsResponse:
    """
    사용자의 모든 분석 결과를 기반으로 출제 경향을 분석합니다.

    - 시간별 필터는 추후 구현 예정 (프로젝트 초기 단계로 데이터 부족)
    - 현재는 전체 누적 데이터 기반 통계 제공

    Parameters:
    - **subject**: 과목 필터 (예: "수학")
    - **grade**: 학년 필터 (예: "중1", "고2")
    - **school_region**: 지역 필터 (예: "서울_강남구")
    - **school_type**: 학교 유형 필터 (예: "일반고", "특목고")

    Returns:
    - 단원별, 난이도별, 유형별 출제 경향 통계
    """

    # 1. 사용자의 완료된 시험지 조회
    exams_query = db.table("exams").select("id, subject, grade, school_name, school_region, school_type").eq("user_id", current_user["id"]).eq("status", "completed")

    # 과목 필터 적용
    if subject:
        exams_query = exams_query.eq("subject", subject)

    # 학년 필터 적용
    if grade:
        exams_query = exams_query.eq("grade", grade)

    # 지역 필터 적용
    if school_region:
        exams_query = exams_query.eq("school_region", school_region)

    # 학교 유형 필터 적용
    if school_type:
        exams_query = exams_query.eq("school_type", school_type)

    exams_result = await exams_query.execute()

    if not exams_result.data:
        # 데이터 없으면 빈 응답 반환
        return TrendsResponse(
            summary=TrendsSummary(
                total_exams=0,
                total_questions=0,
                avg_questions_per_exam=0,
                total_points=0,
                avg_confidence=None
            ),
            topics=[],
            difficulty=[],
            question_types=[],
            question_formats=[],
            textbooks=[]
        )

    exam_ids = [exam["id"] for exam in exams_result.data]

    # 2. 해당 시험지들의 분석 결과 조회
    all_questions = []
    all_confidences = []

    for exam_id in exam_ids:
        analysis_result = await db.table("analysis_results").select("questions").eq("exam_id", exam_id).maybe_single().execute()

        if analysis_result.data:
            questions = analysis_result.data.get("questions") or []
            all_questions.extend(questions)

            # 신뢰도 수집
            for q in questions:
                conf = q.get("confidence")
                if conf is not None:
                    all_confidences.append(conf)

    # 데이터 없으면 빈 응답
    if not all_questions:
        return TrendsResponse(
            summary=TrendsSummary(
                total_exams=len(exam_ids),
                total_questions=0,
                avg_questions_per_exam=0,
                total_points=0,
                avg_confidence=None
            ),
            topics=[],
            difficulty=[],
            question_types=[],
            question_formats=[],
            textbooks=[]
        )

    # 3. 통계 집계
    total_questions = len(all_questions)
    total_points = sum(q.get("points", 0) or 0 for q in all_questions)
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else None

    # 단원별 통계
    topic_counter = Counter()
    topic_difficulty = defaultdict(list)
    topic_points = defaultdict(float)

    for q in all_questions:
        topic = q.get("topic")
        if topic:
            topic_counter[topic] += 1
            difficulty = q.get("difficulty")
            if difficulty:
                topic_difficulty[topic].append(difficulty)
            points = q.get("points", 0) or 0
            topic_points[topic] += points

    topics_list = []
    for topic, count in topic_counter.most_common():
        percentage = (count / total_questions) * 100

        # 평균 난이도 계산 (최빈값)
        difficulties = topic_difficulty.get(topic, [])
        avg_diff = Counter(difficulties).most_common(1)[0][0] if difficulties else None

        topics_list.append(TopicStat(
            topic=topic,
            count=count,
            percentage=round(percentage, 1),
            avg_difficulty=avg_diff,
            total_points=round(topic_points[topic], 1)
        ))

    # 난이도별 통계
    difficulty_counter = Counter()
    difficulty_points = defaultdict(list)

    for q in all_questions:
        diff = q.get("difficulty")
        if diff:
            difficulty_counter[diff] += 1
            points = q.get("points", 0) or 0
            difficulty_points[diff].append(points)

    difficulty_list = []
    for diff in ["high", "medium", "low"]:
        count = difficulty_counter.get(diff, 0)
        percentage = (count / total_questions) * 100 if total_questions > 0 else 0
        avg_pts = sum(difficulty_points[diff]) / len(difficulty_points[diff]) if difficulty_points[diff] else 0

        difficulty_list.append(DifficultyTrendStat(
            difficulty=diff,
            count=count,
            percentage=round(percentage, 1),
            avg_points=round(avg_pts, 1)
        ))

    # 문항 유형별 통계
    type_counter = Counter()
    type_difficulty = defaultdict(list)

    for q in all_questions:
        qtype = q.get("question_type")
        if qtype:
            type_counter[qtype] += 1
            diff = q.get("difficulty")
            if diff:
                type_difficulty[qtype].append(diff)

    types_list = []
    for qtype, count in type_counter.most_common():
        percentage = (count / total_questions) * 100
        difficulties = type_difficulty.get(qtype, [])
        avg_diff = Counter(difficulties).most_common(1)[0][0] if difficulties else None

        types_list.append(QuestionTypeStat(
            question_type=qtype,
            count=count,
            percentage=round(percentage, 1),
            avg_difficulty=avg_diff
        ))

    # 문항 형식별 통계
    format_counter = Counter()
    format_points = defaultdict(list)

    for q in all_questions:
        fmt = q.get("question_format")
        if fmt:
            format_counter[fmt] += 1
            points = q.get("points", 0) or 0
            format_points[fmt].append(points)

    formats_list = []
    for fmt, count in format_counter.most_common():
        percentage = (count / total_questions) * 100
        avg_pts = sum(format_points[fmt]) / len(format_points[fmt]) if format_points[fmt] else 0

        formats_list.append(QuestionFormatStat(
            question_format=fmt,
            count=count,
            percentage=round(percentage, 1),
            avg_points=round(avg_pts, 1)
        ))

    # 교과서별 통계 (topic의 첫 번째 > 구분자 이전 부분)
    textbook_counter = Counter()
    textbook_chapters = defaultdict(set)

    for q in all_questions:
        topic = q.get("topic")
        if topic and " > " in topic:
            parts = topic.split(" > ")
            textbook = parts[0]  # 예: "공통수학1"
            textbook_counter[textbook] += 1
            if len(parts) > 1:
                textbook_chapters[textbook].add(parts[1])  # 대단원

    textbooks_list = []
    for textbook, count in textbook_counter.most_common():
        percentage = (count / total_questions) * 100
        chapters = sorted(list(textbook_chapters[textbook]))

        textbooks_list.append(TextbookStat(
            textbook=textbook,
            count=count,
            percentage=round(percentage, 1),
            chapters=chapters
        ))

    # 응답 생성
    return TrendsResponse(
        summary=TrendsSummary(
            total_exams=len(exam_ids),
            total_questions=total_questions,
            avg_questions_per_exam=round(total_questions / len(exam_ids), 1),
            total_points=round(total_points, 1),
            avg_confidence=round(avg_confidence, 3) if avg_confidence else None
        ),
        topics=topics_list,
        difficulty=difficulty_list,
        question_types=types_list,
        question_formats=formats_list,
        textbooks=textbooks_list
    )
