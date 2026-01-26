"""Template schemas for analysis result display."""
from enum import Enum
from pydantic import BaseModel


class TemplateType(str, Enum):
    """분석 결과 표시 템플릿 유형."""
    DETAILED = "detailed"      # 상세 분석 (기본값)
    SUMMARY = "summary"        # 요약 카드
    PARENT = "parent"          # 부모용 리포트
    PRINT = "print"            # 프린트용


# 템플릿 정의
TEMPLATE_DEFINITIONS = {
    TemplateType.DETAILED: {
        "id": "detailed",
        "name": "상세 분석",
        "description": "모든 정보를 표시하는 기본 레이아웃",
        "icon": "📊",
        "features": ["차트", "문항별 상세", "신뢰도", "피드백"],
    },
    TemplateType.SUMMARY: {
        "id": "summary",
        "name": "요약 카드",
        "description": "핵심 지표만 카드 형태로 표시",
        "icon": "📋",
        "features": ["핵심 통계", "취약 단원", "개선 방향"],
    },
    TemplateType.PARENT: {
        "id": "parent",
        "name": "부모용 리포트",
        "description": "쉬운 언어로 개선 방향 중심 표시",
        "icon": "👨‍👩‍👧",
        "features": ["학습 현황", "강점/약점", "권장 학습"],
    },
    TemplateType.PRINT: {
        "id": "print",
        "name": "프린트용",
        "description": "인쇄에 최적화된 흑백 레이아웃",
        "icon": "🖨️",
        "features": ["흑백 최적화", "페이지 구분", "요약표"],
    },
}


class TemplateInfo(BaseModel):
    """템플릿 정보."""
    id: str
    name: str
    description: str
    icon: str
    features: list[str]


class TemplatePreference(BaseModel):
    """사용자 템플릿 설정."""
    preferred_template: TemplateType = TemplateType.DETAILED


class TemplateUpdateRequest(BaseModel):
    """템플릿 설정 업데이트 요청."""
    preferred_template: TemplateType


def get_all_templates() -> list[TemplateInfo]:
    """모든 템플릿 정보 반환."""
    return [
        TemplateInfo(**info) for info in TEMPLATE_DEFINITIONS.values()
    ]