/**
 * Template Switcher - 템플릿 전환 UI
 * 분석 결과 페이지 상단에 표시되는 템플릿 선택 버튼
 */
import { useState } from 'react';
import type { TemplateType } from '../../../types/auth';

interface TemplateSwitcherProps {
  currentTemplate: TemplateType;
  onTemplateChange: (template: TemplateType) => void;
  onSaveAsDefault?: (template: TemplateType) => void;
}

const TEMPLATE_OPTIONS: Array<{
  id: TemplateType;
  name: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'detailed',
    name: '상세 분석',
    icon: '📊',
    description: '모든 정보를 표시하는 기본 레이아웃',
  },
  {
    id: 'summary',
    name: '요약 카드',
    icon: '📋',
    description: '핵심 지표만 카드 형태로 표시',
  },
  {
    id: 'parent',
    name: '부모용',
    icon: '👨‍👩‍👧',
    description: '쉬운 언어로 개선 방향 중심 표시',
  },
  {
    id: 'print',
    name: '프린트',
    icon: '🖨️',
    description: '인쇄에 최적화된 흑백 레이아웃',
  },
];

export function TemplateSwitcher({
  currentTemplate,
  onTemplateChange,
  onSaveAsDefault,
}: TemplateSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = TEMPLATE_OPTIONS.find((opt) => opt.id === currentTemplate);

  return (
    <div className="relative">
      {/* 현재 선택된 템플릿 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">{currentOption?.icon}</span>
        <span className="text-sm font-medium text-gray-700">
          {currentOption?.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 메뉴 */}
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                템플릿 선택
              </p>
              {TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onTemplateChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    currentTemplate === option.id
                      ? 'bg-indigo-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{option.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        currentTemplate === option.id ? 'text-indigo-700' : 'text-gray-900'
                      }`}>
                        {option.name}
                      </span>
                      {currentTemplate === option.id && (
                        <span className="text-xs text-indigo-500">선택됨</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* 기본 템플릿으로 저장 */}
            {onSaveAsDefault && currentTemplate !== 'detailed' && (
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={() => {
                    onSaveAsDefault(currentTemplate);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg text-left"
                >
                  "{currentOption?.name}"을 기본 템플릿으로 저장
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
