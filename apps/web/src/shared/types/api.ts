export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface AuthResponse {
  token: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user_id: number;
}

export interface ChatResponse {
  response: string;
}
