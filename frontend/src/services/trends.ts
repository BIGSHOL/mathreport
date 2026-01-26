/**
 * Trends API Service
 *
 * 출제 경향 분석 API
 */

import { apiClient } from './api';
import { TrendsResponse, TrendsRequest } from '../types/trends';

/**
 * 출제 경향 조회
 */
export const getTrends = async (params?: TrendsRequest): Promise<TrendsResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.subject) {
    queryParams.append('subject', params.subject);
  }
  if (params?.grade) {
    queryParams.append('grade', params.grade);
  }
  if (params?.school_region) {
    queryParams.append('school_region', params.school_region);
  }
  if (params?.school_type) {
    queryParams.append('school_type', params.school_type);
  }

  const response = await apiClient.get<TrendsResponse>(
    `/api/v1/trends?${queryParams.toString()}`
  );
  return response.data;
};

const trendsService = {
  getTrends,
};

export default trendsService;
