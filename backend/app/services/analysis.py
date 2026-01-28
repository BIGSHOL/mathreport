"""Analysis service for handling AI analysis requests using Supabase REST API."""
import uuid
from datetime import datetime
from typing import Optional, Any

from fastapi import HTTPException, status

from app.db.supabase_client import SupabaseClient
from app.schemas.analysis import (
    AnalysisResult as AnalysisResultSchema,
    QuestionDifficulty,
    QuestionType
)
from app.core.config import settings


class AnalysisDict(dict):
    """Analysis data wrapper that allows attribute access."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'AnalysisDict' has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


class AnalysisService:
    """Service for analysis-related business logic."""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def request_analysis(
        self,
        exam_id: str,
        user_id: str,
        force_reanalyze: bool = False,
        analysis_mode: str = "full"
    ):
        """Request exam analysis.

        Performs AI analysis and saves the results.

        Args:
            exam_id: 시험지 ID
            user_id: 사용자 ID
            force_reanalyze: 재분석 강제 여부
            analysis_mode: 분석 모드
                - "questions_only": 문항 분석만 (정오답 제외, 빠른 분석)
                - "full": 전체 분석 (문항 + 정오답)
        """
        # 1. Check exam existence
        result = await self.db.table("exams").select("*").eq("id", exam_id).eq("user_id", user_id).maybe_single().execute()

        if result.error or result.data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "EXAM_NOT_FOUND", "message": "시험지를 찾을 수 없습니다."}
            )

        exam = result.data

        # 1.5. Check if already analyzing (prevent duplicate requests)
        if exam.get("status") == "analyzing":
            print(f"[Analysis] 이미 분석 중: {exam_id}")
            return {
                "analysis_id": None,
                "status": "analyzing",
                "message": "이미 분석이 진행 중입니다."
            }

        # 2. Check if already exists (unless force_reanalyze)
        existing_result = await self.db.table("analysis_results").select("*").eq("exam_id", exam_id).maybe_single().execute()
        existing = existing_result.data

        if not force_reanalyze and existing:
            # 기존 분석 결과가 있으면 그대로 반환 (캐시 히트)
            return {
                "analysis_id": existing["id"],
                "status": "completed",
                "message": "기존 분석 결과를 반환합니다.",
                "cache_hit": True,
                "analyzed_at": existing.get("analyzed_at"),
            }

        # 2.5. 재분석 로깅 (force_reanalyze가 True이고 기존 분석이 있을 때)
        if force_reanalyze and existing:
            try:
                from app.services.analytics_log import get_analytics_log_service
                analytics = get_analytics_log_service(self.db)

                prev_confidence = existing.get("avg_confidence")
                reason = "low_confidence" if prev_confidence and prev_confidence < 0.6 else "user_request"

                await analytics.log_reanalysis(
                    user_id=user_id,
                    exam_id=exam_id,
                    analysis_id=existing["id"],
                    reason=reason,
                    prev_confidence=prev_confidence,
                )
            except Exception as log_error:
                print(f"[Analytics Log Error] {log_error}")

        # 3. Update status to ANALYZING
        await self.db.table("exams").eq("id", exam_id).update({
            "status": "analyzing",
            "updated_at": datetime.utcnow().isoformat()
        }).execute()

        # 4. Perform AI Analysis with Pattern System
        from app.services.ai_engine import ai_engine

        try:
            # 패턴 시스템 통합 분석 사용
            # - 시험지 유형 자동 분류 (blank/answered/채점여부)
            # - 동적 프롬프트 생성 (오류 패턴, 예시 포함)
            # - 학년/단원별 최적화
            ai_result = await ai_engine.analyze_exam_with_patterns(
                db=self.db,
                file_path=exam["file_path"],
                grade_level=exam.get("grade"),
                unit=exam.get("unit"),
                category=exam.get("category"),  # 세부 과목 (공통수학1, 공통수학2 등)
                exam_scope=exam.get("exam_scope"),  # 출제범위 (단원 목록)
                auto_classify=True,  # 시험지 유형 자동 분류
                exam_id=exam_id,  # 진행 단계 업데이트용
                analysis_mode=analysis_mode,  # 분석 모드 (questions_only/full)
                user_id=user_id,  # Analytics 로깅용
                subject=exam.get("subject") or "수학",  # 과목 (수학/영어)
            )

            # 5. Process & Save Result
            await self.db.table("exams").eq("id", exam_id).update({"analysis_step": 4}).execute()
            print("[Step 4] 결과 저장 중...")
            processed_questions = []
            for q in ai_result.get("questions", []):
                q["id"] = str(uuid.uuid4())
                q["created_at"] = datetime.utcnow().isoformat()
                processed_questions.append(q)

            summary = ai_result.get("summary", {})

            # ID를 명시적으로 생성
            analysis_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()

            analysis_data = {
                "id": analysis_id,
                "exam_id": exam_id,
                "user_id": user_id,
                "file_hash": f"hash_{exam_id}",
                "total_questions": len(processed_questions),
                "model_version": settings.GEMINI_MODEL_NAME,
                "summary": summary,
                "questions": processed_questions,
                "analyzed_at": now,
                "created_at": now
            }

            # force_reanalyze인 경우 기존 결과 삭제
            if existing:
                await self.db.table("analysis_results").eq("id", existing["id"]).delete().execute()

            # Insert new analysis result
            insert_result = await self.db.table("analysis_results").insert(analysis_data).execute()

            if insert_result.error:
                raise Exception(f"Failed to save analysis: {insert_result.error}")

            print(f"[Step 4] 분석 결과 저장 완료: {analysis_id}")

            # 6. Update status to COMPLETED + 분석 결과에서 분류 정보 추출
            exam_update = {
                "status": "completed",
                "updated_at": datetime.utcnow().isoformat()
            }

            # 정오답 분석 완료 여부 (full 모드에서만)
            if analysis_mode == "full":
                exam_update["has_answer_analysis"] = True

            # 분석 결과에서 _classification 정보 추출하여 exam에 저장
            classification = ai_result.get("_classification", {})
            if classification:
                # 시험지 유형
                paper_type = classification.get("paper_type")
                if paper_type:
                    exam_update["detected_type"] = paper_type
                    exam_update["detection_confidence"] = classification.get("paper_type_confidence", 0.5)

                # 채점 상태
                grading_status = classification.get("grading_status")
                if grading_status:
                    exam_update["grading_status"] = grading_status

                # 과목 감지
                detected_subject = classification.get("detected_subject")
                if detected_subject:
                    exam_update["detected_subject"] = detected_subject
                    exam_update["subject_confidence"] = classification.get("subject_confidence", 0.5)
                    # 과목도 업데이트 (사용자 입력 대신 AI 감지 결과)
                    exam_update["subject"] = detected_subject

                # 메타데이터에서 제목 추출
                metadata = classification.get("extracted_metadata", {})
                if metadata:
                    suggested_title = metadata.get("suggested_title")
                    if suggested_title:
                        exam_update["suggested_title"] = suggested_title
                    extracted_grade = metadata.get("grade")
                    if extracted_grade:
                        exam_update["extracted_grade"] = extracted_grade

            await self.db.table("exams").eq("id", exam_id).update(exam_update).execute()

            # 7. 자동 레퍼런스 수집 (신뢰도 낮은 문제 + 상 난이도 문제)
            await self._collect_question_references(
                analysis_id=analysis_id,
                exam=exam,
                processed_questions=processed_questions,
            )

            return {
                "analysis_id": analysis_id,
                "status": "completed",
                "message": "분석이 완료되었습니다.",
                "cache_hit": False,
            }

        except Exception as e:
            # Analytics 로깅: 분석 에러
            try:
                from app.services.analytics_log import get_analytics_log_service
                analytics = get_analytics_log_service(self.db)

                error_type = "timeout" if "timeout" in str(e).lower() else "analysis_error"
                await analytics.log_analysis_error(
                    user_id=user_id,
                    exam_id=exam_id,
                    error_info={
                        "error_type": error_type,
                        "error_message": str(e)[:500],
                        "step": "analysis",
                    },
                    metadata={
                        "analysis_mode": analysis_mode,
                        "grade_level": exam.get("grade"),
                        "unit": exam.get("unit"),
                    }
                )
            except Exception as log_error:
                print(f"[Analytics Log Error] {log_error}")

            # Update status to FAILED
            error_msg = str(e)[:500] if str(e) else "알 수 없는 오류"
            await self.db.table("exams").eq("id", exam_id).update({
                "status": "failed",
                "error_message": error_msg,
                "updated_at": datetime.utcnow().isoformat()
            }).execute()

            import traceback
            print(f"Analysis failed: {e}")
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"분석 실패: {str(e)}"
            )

    async def request_answer_analysis(
        self,
        exam_id: str,
        user_id: str,
        existing_analysis_id: str
    ):
        """기존 분석에 정오답 분석 추가.

        Args:
            exam_id: 시험지 ID
            user_id: 사용자 ID
            existing_analysis_id: 기존 분석 결과 ID
        """
        # 1. 시험지 조회
        result = await self.db.table("exams").select("*").eq("id", exam_id).eq("user_id", user_id).maybe_single().execute()

        if result.error or result.data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "EXAM_NOT_FOUND", "message": "시험지를 찾을 수 없습니다."}
            )

        exam = result.data

        # 2. 기존 분석 결과 조회
        analysis_result = await self.db.table("analysis_results").select("*").eq("id", existing_analysis_id).maybe_single().execute()

        if analysis_result.error or analysis_result.data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
            )

        existing_analysis = analysis_result.data

        # 3. 정오답 분석 수행 (answers_only 모드)
        from app.services.ai_engine import ai_engine

        try:
            # 상태 업데이트
            await self.db.table("exams").eq("id", exam_id).update({
                "status": "analyzing",
                "updated_at": datetime.utcnow().isoformat()
            }).execute()

            # 정오답 분석 전용 호출 (최적화 버전 사용)
            # - 배점 기반 검증 (Zero-token)
            # - 탐지 우선 분기 (고신뢰도는 AI 스킵)
            # - 불확실 문항만 AI 분석
            ai_result = await ai_engine.analyze_answers_optimized(
                db=self.db,
                file_path=exam["file_path"],
                existing_questions=existing_analysis.get("questions", []),
                exam_id=exam_id,
            )

            # 4. 기존 문항에 정오답 정보 병합
            updated_questions = self._merge_answer_results(
                existing_analysis.get("questions", []),
                ai_result.get("questions", [])
            )

            # 최적화 통계 추출
            optimization_stats = ai_result.get("_optimization_stats", {})

            # 5. 분석 결과 업데이트 (최적화 통계 포함)
            now = datetime.utcnow().isoformat()
            update_data = {
                "questions": updated_questions,
                "analyzed_at": now,
            }

            # 기존 메타데이터에 최적화 통계 추가
            existing_meta = existing_analysis.get("metadata", {}) or {}
            existing_meta["answer_analysis_stats"] = optimization_stats
            update_data["metadata"] = existing_meta

            await self.db.table("analysis_results").eq("id", existing_analysis_id).update(update_data).execute()

            # 6. 시험지 상태 업데이트
            await self.db.table("exams").eq("id", exam_id).update({
                "status": "completed",
                "has_answer_analysis": True,
                "updated_at": now
            }).execute()

            # 최적화 로그
            if optimization_stats:
                print(f"[Answer Analysis Optimization]")
                print(f"  - 점수 기반 해결: {optimization_stats.get('resolved_by_score', 0)}개")
                print(f"  - 탐지 기반 해결: {optimization_stats.get('resolved_by_detection', 0)}개")
                print(f"  - AI 분석: {optimization_stats.get('resolved_by_ai', 0)}개")
                print(f"  - 토큰 절약 추정: {optimization_stats.get('tokens_saved_estimate', 0)}개")

            return {
                "analysis_id": existing_analysis_id,
                "status": "completed",
                "message": "정오답 분석이 완료되었습니다."
            }

        except Exception as e:
            error_msg = str(e)[:500] if str(e) else "알 수 없는 오류"
            await self.db.table("exams").eq("id", exam_id).update({
                "status": "completed",  # 정오답 분석 실패해도 기존 분석은 유지
                "error_message": f"정오답 분석 실패: {error_msg}",
                "updated_at": datetime.utcnow().isoformat()
            }).execute()

            import traceback
            print(f"Answer analysis failed: {e}")
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"정오답 분석 실패: {str(e)}"
            )

    def _merge_answer_results(
        self,
        existing_questions: list[dict],
        answer_results: list[dict]
    ) -> list[dict]:
        """기존 문항에 정오답 분석 결과 병합."""
        # 문항 번호로 매핑
        answer_map = {
            str(q.get("question_number")): q
            for q in answer_results
        }

        merged = []
        for q in existing_questions:
            q_num = str(q.get("question_number"))
            answer_info = answer_map.get(q_num, {})

            # 정오답 관련 필드만 업데이트
            if answer_info:
                q["is_correct"] = answer_info.get("is_correct")
                q["student_answer"] = answer_info.get("student_answer")
                q["earned_points"] = answer_info.get("earned_points")
                q["error_type"] = answer_info.get("error_type")
                q["grading_rationale"] = answer_info.get("grading_rationale")

            merged.append(q)

        return merged

    async def _collect_question_references(
        self,
        analysis_id: str,
        exam: dict,
        processed_questions: list[dict],
    ):
        """신뢰도 낮은 문제 + 상 난이도 문제 자동 수집

        수집 조건:
        - confidence < 0.7 (신뢰도 낮음)
        - difficulty = "high" (상 난이도)
        """
        # 학년 정보: extracted_grade > grade > "unknown"
        grade_level = exam.get("extracted_grade") or exam.get("grade") or "unknown"

        references_to_insert = []

        for q in processed_questions:
            confidence = q.get("confidence", 1.0)
            difficulty = q.get("difficulty", "medium")

            # 수집 조건 확인
            reasons = []
            if confidence is not None and confidence < 0.7:
                reasons.append("low_confidence")
            if difficulty == "high":
                reasons.append("high_difficulty")

            if not reasons:
                continue

            # 레퍼런스 생성 (첫 번째 사유 사용)
            reference = {
                "id": str(uuid.uuid4()),
                "source_analysis_id": analysis_id,
                "source_exam_id": exam["id"],
                "question_number": str(q.get("question_number", "")),
                "topic": q.get("topic"),
                "difficulty": difficulty,
                "question_type": q.get("question_type"),
                "ai_comment": q.get("ai_comment"),
                "points": q.get("points"),
                "confidence": confidence if confidence is not None else 1.0,
                "grade_level": grade_level,
                "collection_reason": reasons[0],
                "review_status": "pending",
                "original_analysis_snapshot": q,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            references_to_insert.append(reference)

        if references_to_insert:
            await self.db.table("question_references").insert(references_to_insert).execute()

    async def get_analysis(self, analysis_id: str) -> Optional[AnalysisDict]:
        """Get analysis result by ID."""
        result = await self.db.table("analysis_results").select("*").eq("id", analysis_id).maybe_single().execute()

        if result.error or result.data is None:
            return None

        return AnalysisDict(result.data)

    async def get_analysis_by_exam(self, exam_id: str) -> Optional[AnalysisDict]:
        """Get analysis result by Exam ID."""
        result = await self.db.table("analysis_results").select("*").eq("exam_id", exam_id).maybe_single().execute()

        if result.error or result.data is None:
            return None

        return AnalysisDict(result.data)

    async def merge_analyses(
        self,
        analyses: list[AnalysisDict],
        user_id: str,
        title: str = "병합된 분석"
    ) -> AnalysisDict:
        """여러 분석 결과를 병합합니다.

        Args:
            analyses: 병합할 분석 결과 목록
            user_id: 사용자 ID
            title: 병합 결과 제목

        Returns:
            병합된 분석 결과
        """
        # 문항들을 모두 수집하고 번호 재배정
        merged_questions = []
        question_num = 1

        for analysis in analyses:
            for q in (analysis.get("questions") or []):
                q_copy = q.copy() if isinstance(q, dict) else dict(q)
                q_copy["id"] = str(uuid.uuid4())
                q_copy["question_number"] = question_num
                q_copy["created_at"] = datetime.utcnow().isoformat()
                merged_questions.append(q_copy)
                question_num += 1

        # 요약 통계 재계산
        difficulty_dist = {"high": 0, "medium": 0, "low": 0}
        type_dist = {
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        }

        for q in merged_questions:
            diff = q.get("difficulty", "medium")
            if diff in difficulty_dist:
                difficulty_dist[diff] += 1

            q_type = q.get("question_type", "calculation")
            if q_type in type_dist:
                type_dist[q_type] += 1

        # 평균 난이도 및 지배적 유형 계산
        total = len(merged_questions)
        if total > 0:
            high_ratio = difficulty_dist["high"] / total
            if high_ratio >= 0.4:
                avg_difficulty = "high"
            elif high_ratio >= 0.2 or difficulty_dist["medium"] / total >= 0.5:
                avg_difficulty = "medium"
            else:
                avg_difficulty = "low"

            dominant_type = max(type_dist, key=type_dist.get)
        else:
            avg_difficulty = "medium"
            dominant_type = "calculation"

        summary = {
            "difficulty_distribution": difficulty_dist,
            "type_distribution": type_dist,
            "average_difficulty": avg_difficulty,
            "dominant_type": dominant_type
        }

        # 첫 번째 분석의 exam_id 사용 (병합 표시용)
        first_exam_id = str(analyses[0]["exam_id"]) if analyses else None
        now = datetime.utcnow().isoformat()

        # 병합 결과 저장
        merged_data = {
            "id": str(uuid.uuid4()),
            "exam_id": first_exam_id,
            "user_id": user_id,
            "file_hash": f"merged_{uuid.uuid4().hex[:8]}",
            "total_questions": len(merged_questions),
            "model_version": f"merged_from_{len(analyses)}_analyses",
            "summary": summary,
            "questions": merged_questions,
            "analyzed_at": now,
            "created_at": now
        }

        result = await self.db.table("analysis_results").insert(merged_data).execute()

        if result.error:
            raise Exception(f"Failed to save merged analysis: {result.error}")

        return AnalysisDict(result.data)


def get_analysis_service(db: SupabaseClient) -> AnalysisService:
    return AnalysisService(db)
