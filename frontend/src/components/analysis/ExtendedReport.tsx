/**
 * Extended Analysis Report Component.
 * 4단계 보고서: 요약 / 진단 / 학습계획 / 성과예측
 * 컴팩트 버전
 */
import { memo, useState, useCallback } from 'react';
import type {
  AnalysisExtension,
  WeaknessProfile,
  LearningPlan,
  PerformancePrediction,
} from '../../services/analysis';
import { CognitiveLevelRadar } from './charts/CognitiveLevelRadar';
import { ScoreTrajectoryChart } from './charts/ScoreTrajectoryChart';

interface ExtendedReportProps {
  extension: AnalysisExtension | null;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

type TabType = 'summary' | 'diagnosis' | 'plan' | 'prediction';

const TABS: { id: TabType; label: string }[] = [
  { id: 'summary', label: '요약' },
  { id: 'diagnosis', label: '진단' },
  { id: 'plan', label: '학습계획' },
  { id: 'prediction', label: '성과예측' },
];

export const ExtendedReport = memo(function ExtendedReport({
  extension,
  onGenerate,
  isGenerating,
}: ExtendedReportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const handleTabClick = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  if (!extension) {
    return (
      <div className="bg-white shadow rounded-lg p-4 text-center">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          확장 분석 (4단계 보고서)
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          취약점 분석, 맞춤형 학습 계획, 성과 예측을 생성합니다.
        </p>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {isGenerating ? '생성 중...' : '확장 분석 생성'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 py-2 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'summary' && extension.weakness_profile && extension.learning_plan && extension.performance_prediction && (
          <ExecutiveSummary
            weakness={extension.weakness_profile}
            plan={extension.learning_plan}
            prediction={extension.performance_prediction}
          />
        )}
        {activeTab === 'diagnosis' && extension.weakness_profile && (
          <DiagnosisSection weakness={extension.weakness_profile} />
        )}
        {activeTab === 'plan' && extension.learning_plan && (
          <LearningPlanSection plan={extension.learning_plan} />
        )}
        {activeTab === 'prediction' && extension.performance_prediction && (
          <PredictionSection prediction={extension.performance_prediction} />
        )}
      </div>
    </div>
  );
});

// ============================================
// Sub-components (Compact)
// ============================================

const ExecutiveSummary = memo(function ExecutiveSummary({
  weakness,
  plan,
  prediction,
}: {
  weakness: WeaknessProfile;
  plan: LearningPlan;
  prediction: PerformancePrediction;
}) {
  const { current_assessment, goal_achievement } = prediction;
  const { expected_improvement } = plan;

  return (
    <div className="space-y-4">
      {/* Score Overview - 가로 배치 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 rounded-lg p-3">
          <p className="text-xs text-indigo-600">현재 예상</p>
          <p className="text-xl font-bold text-indigo-900">
            {current_assessment.score_estimate}점
          </p>
          <p className="text-xs text-indigo-500">
            상위 {current_assessment.rank_estimate_percentile}%
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600">목표</p>
          <p className="text-xl font-bold text-green-900">
            {expected_improvement.target_score}점
          </p>
          <p className="text-xs text-green-500">
            +{expected_improvement.improvement_points}점
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <p className="text-xs text-yellow-600">달성 확률</p>
          <p className="text-xl font-bold text-yellow-900">
            {Math.round(goal_achievement.with_current_plan * 100)}%
          </p>
          <p className="text-xs text-yellow-500">{plan.duration}</p>
        </div>
      </div>

      {/* Key Weaknesses + Learning Time 가로 배치 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">주요 취약점</h4>
          <ul className="space-y-1">
            {weakness.topic_weaknesses.slice(0, 3).map((tw, idx) => (
              <li key={idx} className="flex items-center text-sm">
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0 ${
                    tw.severity_score > 0.7
                      ? 'bg-red-500'
                      : tw.severity_score > 0.4
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                />
                <span className="text-gray-700 truncate">{tw.topic}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">추천 학습</h4>
          <p className="text-lg font-bold text-gray-800">
            주 {plan.weekly_hours}시간
          </p>
          <p className="text-xs text-gray-500">{plan.duration} 동안</p>
        </div>
      </div>
    </div>
  );
});

const DiagnosisSection = memo(function DiagnosisSection({
  weakness,
}: {
  weakness: WeaknessProfile;
}) {
  const { cognitive_levels, topic_weaknesses, mistake_patterns } = weakness;

  return (
    <div className="space-y-4">
      {/* Cognitive Levels Radar Chart */}
      <CognitiveLevelRadar levels={cognitive_levels} />

      {/* Topic Weaknesses - 테이블 형식 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900">단원별 취약점</h4>
        </div>
        <div className="divide-y">
          {topic_weaknesses.map((tw, idx) => (
            <div key={idx} className="px-3 py-2 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{tw.topic}</p>
                <p className="text-xs text-gray-500 truncate">{tw.recommendation}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ml-2 flex-shrink-0 ${
                  tw.severity_score > 0.7
                    ? 'bg-red-100 text-red-800'
                    : tw.severity_score > 0.4
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}
              >
                {tw.severity_score > 0.7 ? '취약' : tw.severity_score > 0.4 ? '보통' : '양호'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mistake Patterns */}
      {mistake_patterns.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900">실수 패턴</h4>
          </div>
          <div className="divide-y">
            {mistake_patterns.map((mp, idx) => (
              <div key={idx} className="px-3 py-2 flex items-start">
                <span className="text-red-500 mr-2 text-xs">!</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{mp.description}</p>
                  <p className="text-xs text-gray-500">
                    {mp.frequency}회 · 문항 {mp.example_questions.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const LearningPlanSection = memo(function LearningPlanSection({
  plan,
}: {
  plan: LearningPlan;
}) {
  const { phases, daily_schedule, expected_improvement } = plan;

  return (
    <div className="space-y-4">
      {/* Overview - 가로 배치 */}
      <div className="bg-indigo-50 rounded-lg p-3 flex justify-between items-center">
        <div className="text-center">
          <p className="text-xs text-indigo-600">기간</p>
          <p className="text-lg font-bold text-indigo-900">{plan.duration}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-indigo-600">주당</p>
          <p className="text-lg font-bold text-indigo-900">{plan.weekly_hours}시간</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-indigo-600">달성률</p>
          <p className="text-lg font-bold text-indigo-900">
            {Math.round(expected_improvement.achievement_confidence * 100)}%
          </p>
        </div>
      </div>

      {/* Phases - 컴팩트 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900">학습 단계</h4>
        </div>
        <div className="divide-y">
          {phases.map((phase) => (
            <div key={phase.phase_number} className="px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <h5 className="text-sm font-medium text-gray-900">
                  P{phase.phase_number}. {phase.title}
                </h5>
                <span className="text-xs text-gray-500">{phase.duration}</span>
              </div>
              <div className="space-y-0.5">
                {phase.topics.map((topic, idx) => (
                  <div key={idx} className="flex items-center text-xs text-gray-600">
                    <span className="text-gray-400 mr-1">└</span>
                    <span className="truncate">{topic.topic}</span>
                    <span className="text-gray-400 ml-auto flex-shrink-0">
                      {topic.duration_hours}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Schedule - 컴팩트 그리드 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900">주간 일정</h4>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-7 gap-1">
            {daily_schedule.map((day, idx) => (
              <div key={idx} className="text-center p-1.5 bg-gray-50 rounded">
                <p className="text-xs font-medium text-gray-900">{day.day}</p>
                <p className="text-xs text-gray-500">{day.duration_minutes}분</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

const PredictionSection = memo(function PredictionSection({
  prediction,
}: {
  prediction: PerformancePrediction;
}) {
  const { current_assessment, trajectory, goal_achievement, risk_factors } = prediction;

  return (
    <div className="space-y-4">
      {/* Score Trajectory Chart */}
      <ScoreTrajectoryChart
        currentAssessment={current_assessment}
        trajectory={trajectory}
        targetScore={
          goal_achievement.goal.match(/\d+/)?.[0]
            ? parseInt(goal_achievement.goal.match(/\d+/)![0])
            : undefined
        }
      />

      {/* Goal Achievement - 컴팩트 */}
      <div className="bg-green-50 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">목표 달성 확률</h4>
        <p className="text-xs text-gray-600 mb-2">{goal_achievement.goal}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">현재</p>
            <p className="text-base font-bold text-gray-600">
              {Math.round(goal_achievement.current_probability * 100)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">계획대로</p>
            <p className="text-base font-bold text-green-600">
              {Math.round(goal_achievement.with_current_plan * 100)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">최적화</p>
            <p className="text-base font-bold text-indigo-600">
              {Math.round(goal_achievement.with_optimized_plan * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Risk Factors - 테이블 형식 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900">위험 요소</h4>
        </div>
        <div className="divide-y">
          {risk_factors.map((risk, idx) => (
            <div key={idx} className="px-3 py-2 flex items-start">
              <span
                className={`text-xs px-1.5 py-0.5 rounded mr-2 flex-shrink-0 ${
                  risk.impact_on_goal === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : risk.impact_on_goal === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {risk.impact_on_goal}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{risk.factor}</p>
                <p className="text-xs text-gray-500">{risk.mitigation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
