import { Request } from 'express';
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  search: z.string().optional(),
});

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
  };
}

export function getPaginationParams(req: Request): PaginationOptions {
  const query = req.query;
  
  return {
    page: parseInt(query.page as string) || 1,
    limit: parseInt(query.limit as string) || 20,
    sortBy: query.sortBy as string,
    sortOrder: (query.sortOrder as 'asc' | 'desc') || 'asc',
    search: query.search as string,
    ...Object.fromEntries(
      Object.entries(query).filter(
        ([key]) => !['page', 'limit', 'sortBy', 'sortOrder', 'search'].includes(key)
      )
    ),
  };
}

export function buildOrderByClause(sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): string {
  return sortOrder === 'desc' ? `-${sortBy}` : sortBy;
}

export function createFilterConditions(searchFields: string[], searchTerm?: string): Record<string, unknown> {
  if (!searchTerm) return {};
  
  const orConditions = searchFields.map(field => ({
    [field]: { $regex: searchTerm, $options: 'i' }
  }));
  
  return { $or: orConditions };
}

export function parseSortString(sortString: string): { field: string; order: 'asc' | 'desc' } {
  if (sortString.startsWith('-')) {
    return {
      field: sortString.substring(1),
      order: 'desc',
    };
  }
  
  return {
    field: sortString,
    order: 'asc',
  };
}

export function validatePaginationParams(params: Record<string, unknown>): PaginationOptions {
  const validated = paginationSchema.parse(params);
  
  return {
    page: validated.page,
    limit: validated.limit,
    sortBy: validated.sortBy,
    sortOrder: validated.sortOrder,
    search: validated.search,
  };
}

export function createPaginationLinks(
  baseUrl: string,
  page: number,
  limit: number,
  total: number,
  queryParams: Record<string, string | number | boolean | undefined> = {}
): {
  first: string;
  prev?: string;
  next?: string;
  last: string;
} {
  const totalPages = Math.ceil(total / limit);
  const url = new URL(baseUrl);
  
  // Add query parameters
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  
  // Set limit
  url.searchParams.set('limit', String(limit));
  
  const links: { first: string; prev?: string; next?: string; last: string } = {
    first: `${url.origin}${url.pathname}?${url.searchParams.toString()}&page=1`,
    last: `${url.origin}${url.pathname}?${url.searchParams.toString()}&page=${totalPages}`,
  };
  
  if (page > 1) {
    url.searchParams.set('page', String(page - 1));
    links.prev = `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
  }
  
  if (page < totalPages) {
    url.searchParams.set('page', String(page + 1));
    links.next = `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
  }
  
  return links;
}

export function sanitizePaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  return createPaginationResponse(data, total, page, limit);
}

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  sortOrder: 'asc' as const,
};

export const MAX_PAGINATION_LIMIT = 1000;

export function clampPaginationLimit(limit: number): number {
  return Math.min(Math.max(limit, 1), MAX_PAGINATION_LIMIT);
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 1 && page <= totalPages;
}

export function getPageNumbersAroundCurrent(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): number[] {
  const pages: number[] = [];
  const halfVisible = Math.floor(maxVisible / 2);
  
  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, currentPage + halfVisible);
  
  // Adjust if we're at the edges
  if (endPage - startPage < maxVisible - 1) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + maxVisible - 1);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return pages;
}

export function createMetaTags(
  page: number,
  limit: number,
  total: number,
  baseUrl: string
): Record<string, string> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    'X-Current-Page': String(page),
    'X-Total-Pages': String(totalPages),
    'X-Total-Count': String(total),
    'X-Per-Page': String(limit),
    'X-Has-Next': String(page < totalPages),
    'X-Has-Prev': String(page > 1),
    'Link': createPaginationLinks(baseUrl, page, limit, total).toString(),
  };
}