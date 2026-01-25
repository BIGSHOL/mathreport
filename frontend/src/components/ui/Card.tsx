/**
 * Card Component
 *
 * 재사용 가능한 카드 컴포넌트
 *
 * Vercel React Best Practices:
 * - rerender-memo: memo() 적용
 * - rendering-hoist-jsx: 정적 클래스 외부 정의
 */
import { memo, type ReactNode } from 'react';
import { CARD_BASE, CARD_PADDING, HEADING, LABEL } from '../../styles/tokens';

export interface CardProps {
  children: ReactNode;
  /** 카드 제목 */
  title?: string;
  /** 제목 아래 설명 */
  subtitle?: string;
  /** 헤더 우측 요소 */
  headerRight?: ReactNode;
  /** 패딩 크기 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** 추가 클래스 */
  className?: string;
}

export const Card = memo(function Card({
  children,
  title,
  subtitle,
  headerRight,
  padding = 'md',
  className = '',
}: CardProps) {
  const hasHeader = title || headerRight;

  return (
    <div className={`${CARD_BASE} ${className}`}>
      {hasHeader ? (
        <>
          <div className={`flex items-center justify-between ${CARD_PADDING[padding]} ${title ? 'pb-0' : ''}`}>
            <div>
              {title ? <h3 className={HEADING.base}>{title}</h3> : null}
              {subtitle ? <p className={`${LABEL.sm} mt-0.5`}>{subtitle}</p> : null}
            </div>
            {headerRight ? <div>{headerRight}</div> : null}
          </div>
          <div className={CARD_PADDING[padding]}>{children}</div>
        </>
      ) : (
        <div className={CARD_PADDING[padding]}>{children}</div>
      )}
    </div>
  );
});

export default Card;
