"""School Trends Service - Aggregates exam data by school/region."""
import uuid
from datetime import datetime
from collections import defaultdict

from app.db.supabase_client import SupabaseClient
from app.data.school_regions import get_school_region, format_school_region


class SchoolTrendsService:
    """Service for aggregating and managing school exam trends."""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def aggregate_school_trends(
        self,
        school_name: str | None = None,
        min_sample_count: int = 1,
    ) -> dict:
        """Aggregate exam trends for schools.

        Args:
            school_name: Optional specific school to aggregate
            min_sample_count: Minimum exams needed to create a trend record

        Returns:
            Summary of aggregation results
        """
        # 1. 완료된 시험지와 분석 결과 조인 조회
        query = self.db.table("exams").select(
            "id, school_name, school_region, school_type, grade, subject"
        ).eq("status", "completed")

        if school_name:
            query = query.eq("school_name", school_name)

        exams_result = await query.execute()

        # school_name이 있는 항목만 필터링 (커스텀 클라이언트에서 not.is.null 미지원)
        exams_data = [e for e in (exams_result.data or []) if e.get("school_name")]

        if not exams_data:
            return {"message": "No exams with school info found", "created": 0, "updated": 0}

        # 시험 ID 목록
        exam_ids = [e["id"] for e in exams_data]
        exams_map = {e["id"]: e for e in exams_data}

        # 2. 분석 결과 조회
        analysis_result = await self.db.table("analysis_results").select(
            "id, exam_id, summary, questions, total_questions"
        ).in_("exam_id", exam_ids).execute()

        if not analysis_result.data:
            return {"message": "No analysis results found", "created": 0, "updated": 0}

        # 3. 학교+학년+과목별로 그룹화
        grouped: dict[str, list[dict]] = defaultdict(list)

        for analysis in analysis_result.data:
            exam = exams_map.get(analysis["exam_id"])
            if not exam:
                continue

            key = f"{exam['school_name']}|{exam['grade']}|{exam['subject'] or '수학'}"
            grouped[key].append({
                "exam": exam,
                "analysis": analysis,
            })

        # 4. 각 그룹에 대해 집계
        created = 0
        updated = 0

        for key, items in grouped.items():
            if len(items) < min_sample_count:
                continue

            school_name_val, grade, subject = key.split("|")
            first_exam = items[0]["exam"]

            # 집계 계산
            trend_data = self._calculate_trend(items)
            trend_data["school_name"] = school_name_val

            # 학교 지역 정보 자동 매핑
            school_region = first_exam.get("school_region")
            school_type = first_exam.get("school_type")

            if not school_region or not school_type:
                # school_regions 매핑에서 자동 조회
                city, district, mapped_type = get_school_region(school_name_val)
                if city and not school_region:
                    school_region = format_school_region(city, district)
                if mapped_type and not school_type:
                    school_type = mapped_type

            trend_data["school_region"] = school_region
            trend_data["school_type"] = school_type
            trend_data["grade"] = grade
            trend_data["subject"] = subject

            # 기존 레코드 확인
            existing = await self.db.table("school_exam_trends").select("id").eq(
                "school_name", school_name_val
            ).eq("grade", grade).eq("subject", subject).eq(
                "period_type", "all"
            ).maybe_single().execute()

            if existing.data:
                # 업데이트
                await self.db.table("school_exam_trends").update({
                    **trend_data,
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("id", existing.data["id"]).execute()
                updated += 1
            else:
                # 생성
                await self.db.table("school_exam_trends").insert({
                    "id": str(uuid.uuid4()),
                    **trend_data,
                    "period_type": "all",
                    "period_value": None,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }).execute()
                created += 1

        return {
            "message": "Aggregation completed",
            "created": created,
            "updated": updated,
            "total_schools_processed": len(grouped),
        }

    def _calculate_trend(self, items: list[dict]) -> dict:
        """Calculate aggregated trend from exam/analysis pairs."""
        difficulty_totals: dict[str, int] = defaultdict(int)
        difficulty_points: dict[str, list[float]] = defaultdict(list)
        question_types: dict[str, int] = defaultdict(int)
        chapters: dict[str, int] = defaultdict(int)
        total_points_list: list[float] = []
        question_counts: list[int] = []
        exam_ids: list[str] = []

        for item in items:
            analysis = item["analysis"]
            exam_ids.append(item["exam"]["id"])

            summary = analysis.get("summary", {})
            questions = analysis.get("questions", [])

            # 난이도 분포 집계
            diff_dist = summary.get("difficulty_distribution", {})
            for diff, count in diff_dist.items():
                if count and isinstance(count, (int, float)):
                    difficulty_totals[diff] += int(count)

            # 문항별 상세 집계
            total_pts = 0
            for q in questions:
                difficulty = q.get("difficulty", "medium")
                points = q.get("points", 0) or 0
                q_type = q.get("question_type", "객관식")
                chapter = q.get("chapter") or q.get("topic") or "기타"

                if points > 0:
                    difficulty_points[difficulty].append(points)
                    total_pts += points

                question_types[q_type] += 1
                chapters[chapter] += 1

            total_points_list.append(total_pts)
            question_counts.append(analysis.get("total_questions", len(questions)))

        # 평균 계산
        avg_points_by_diff = {}
        for diff, pts_list in difficulty_points.items():
            if pts_list:
                avg_points_by_diff[diff] = round(sum(pts_list) / len(pts_list), 1)

        avg_total = round(sum(total_points_list) / len(total_points_list), 1) if total_points_list else 0
        avg_q_count = round(sum(question_counts) / len(question_counts), 1) if question_counts else 0

        # 출제 특성 요약 생성
        trend_summary = self._generate_trend_summary(
            difficulty_totals, question_types, chapters, avg_total
        )

        return {
            "sample_count": len(items),
            "difficulty_distribution": dict(difficulty_totals),
            "difficulty_avg_points": avg_points_by_diff,
            "question_type_distribution": dict(question_types),
            "chapter_distribution": dict(chapters),
            "avg_total_points": avg_total,
            "avg_question_count": avg_q_count,
            "trend_summary": trend_summary,
            "source_exam_ids": exam_ids,
        }

    def _generate_trend_summary(
        self,
        difficulty_dist: dict[str, int],
        question_types: dict[str, int],
        chapters: dict[str, int],
        avg_total: float,
    ) -> dict:
        """Generate human-readable trend summary."""
        characteristics = []
        focus_areas = []

        # 난이도 특성
        total_q = sum(difficulty_dist.values()) or 1
        high_ratio = (difficulty_dist.get("creative", 0) + difficulty_dist.get("reasoning", 0)) / total_q

        if high_ratio > 0.4:
            characteristics.append("고난도 문항 비중 높음")
            difficulty_level = "상"
        elif high_ratio > 0.25:
            characteristics.append("중상 난이도 분포")
            difficulty_level = "중상"
        elif high_ratio > 0.1:
            difficulty_level = "중"
        else:
            characteristics.append("기본 난이도 중심")
            difficulty_level = "하"

        # 문제 유형 특성
        total_type = sum(question_types.values()) or 1
        subjective_ratio = (question_types.get("서술형", 0) + question_types.get("단답형", 0)) / total_type

        if subjective_ratio > 0.3:
            characteristics.append("서답형 문항 비중 높음")
        elif subjective_ratio < 0.1:
            characteristics.append("객관식 중심 출제")

        # 단원 집중도
        sorted_chapters = sorted(chapters.items(), key=lambda x: x[1], reverse=True)
        if sorted_chapters:
            top_chapters = [c[0] for c in sorted_chapters[:3] if c[1] > 2]
            if top_chapters:
                focus_areas = top_chapters
                if len(top_chapters) <= 2:
                    characteristics.append(f"{', '.join(top_chapters)} 단원 집중 출제")

        return {
            "characteristics": characteristics,
            "difficulty_level": difficulty_level,
            "focus_areas": focus_areas,
            "notable_patterns": [],
        }

    async def get_school_trends(
        self,
        school_name: str | None = None,
        school_region: str | None = None,
        grade: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        """Get school exam trends with filters."""
        query = self.db.table("school_exam_trends").select("*")

        if school_name:
            query = query.ilike("school_name", f"%{school_name}%")
        if school_region:
            query = query.eq("school_region", school_region)
        if grade:
            query = query.eq("grade", grade)

        # 정렬: sample_count 높은 순
        result = await query.order("sample_count", desc=True).limit(limit).offset(offset).execute()

        # 총 개수
        count_query = self.db.table("school_exam_trends").select("id")
        if school_name:
            count_query = count_query.ilike("school_name", f"%{school_name}%")
        if school_region:
            count_query = count_query.eq("school_region", school_region)
        if grade:
            count_query = count_query.eq("grade", grade)

        count_result = await count_query.execute()
        total = len(count_result.data) if count_result.data else 0

        return result.data or [], total

    async def get_region_summary(self) -> list[dict]:
        """Get summary of trends grouped by region."""
        result = await self.db.table("school_exam_trends").select(
            "school_region, grade"
        ).execute()

        if not result.data:
            return []

        # 지역별 집계
        regions: dict[str, dict] = defaultdict(lambda: {"count": 0, "grades": set()})

        for item in result.data:
            region = item.get("school_region") or "미분류"
            grade = item.get("grade")
            regions[region]["count"] += 1
            if grade:
                regions[region]["grades"].add(grade)

        return [
            {
                "region": region,
                "school_count": data["count"],
                "grades": sorted(list(data["grades"])),
            }
            for region, data in sorted(regions.items())
        ]


def get_school_trends_service(db: SupabaseClient) -> SchoolTrendsService:
    """Factory function for SchoolTrendsService."""
    return SchoolTrendsService(db)
