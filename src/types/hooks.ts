export type FilterOperator =
  | '='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | 'like'
  | 'not like'
  | 'in'
  | 'not in'
  | 'is'
  | 'between';

/** [field, operator, value] */
export type Filter = [string, FilterOperator, unknown];

export interface GetListArgs<T = Record<string, unknown>> {
  /** Chỉ lấy các field này. Mặc định: lấy tất cả */
  fields?: (keyof T | string)[];
  /** Điều kiện AND */
  filters?: Filter[];
  /** Điều kiện OR */
  orFilters?: Filter[];
  /** Bỏ qua n bản ghi đầu (dùng cho pagination) */
  limit_start?: number;
  /** Số bản ghi mỗi trang. Mặc định: 20 */
  limit?: number;
  /** Sắp xếp */
  orderBy?: { field: string; order: 'asc' | 'desc' };
  /** Trả về key-value dict thay vì array */
  asDict?: boolean;
}

export interface TokenParams {
  useToken: boolean;
  /** Token string hoặc hàm trả về token */
  token: string | (() => string);
  /** Prefix trong Authorization header */
  type: 'Bearer' | 'token';
}

export interface UploadArgs {
  /** File có private không. Mặc định: false */
  isPrivate?: boolean;
  /** Folder đích */
  folder?: string;
  /** File URL nếu đã có */
  file_url?: string;
  /** Doctype liên kết */
  doctype?: string;
  /** ID của document liên kết */
  docname?: string;
  /** Field trong document sẽ lưu file */
  fieldname?: string;
}
