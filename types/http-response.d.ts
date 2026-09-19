export interface HttpResponse<T = unknown> {
  success: boolean
  statusCode: number
  data?: T
  message?: string
  error?: {
    code: string
    details?: unknown
  }
}

export interface SuccessResponse<T = unknown> extends HttpResponse<T> {
  success: true
  data: T
  error?: never
}

export interface ErrorResponse<T = unknown> extends HttpResponse<T> {
  success: false
  data?: never
  error: {
    code: string
    details?: unknown
  }
}
