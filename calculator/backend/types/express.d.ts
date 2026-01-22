declare module 'express' {
  export interface Request {
    headers: Record<string, string | string[] | undefined>
    method?: string
    path?: string
    cookies?: Record<string, string>
    user?: {
      id?: string
      username?: string
      role?: string
      tokenVersion?: number
      reauthAt?: number
      mustChangePassword?: boolean
    }
    authUser?: {
      id?: string
      username?: string
      role?: string
    }
    effectivePermissions?: {
      allow: Set<string>
      deny: Set<string>
    }
    ip?: string
    connection?: { remoteAddress?: string | null }
    params: Record<string, string>
    query: Record<string, string | undefined>
    body: any
  }

  export interface Response {
    status(code: number): Response
    json(body?: unknown): Response
    send(body?: unknown): Response
    cookie(name: string, value: string, options?: Record<string, unknown>): Response
    clearCookie(name: string, options?: Record<string, unknown>): Response
  }

  export type NextFunction = (err?: unknown) => void
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => unknown

  export interface Router {
    get(path: string, ...handlers: RequestHandler[]): Router
    post(path: string, ...handlers: RequestHandler[]): Router
    put(path: string, ...handlers: RequestHandler[]): Router
    patch(path: string, ...handlers: RequestHandler[]): Router
    delete(path: string, ...handlers: RequestHandler[]): Router
    use(path: string | RequestHandler, ...handlers: RequestHandler[]): Router
  }

  interface Application {
    use(...args: unknown[]): Application
    set(...args: unknown[]): Application
    listen(...args: unknown[]): unknown
  }

  interface ExpressStatic {
    (): Application
    Router(): Router
    json(): RequestHandler
  }

  const express: ExpressStatic
  export = express
}

declare namespace Express {
  interface Request {
    user?: {
      id?: string
      username?: string
      role?: string
      tokenVersion?: number
      reauthAt?: number
      mustChangePassword?: boolean
    }
    authUser?: {
      id?: string
      username?: string
      role?: string
    }
    effectivePermissions?: {
      allow: Set<string>
      deny: Set<string>
    }
    cookies?: Record<string, string>
    headers?: Record<string, string | string[] | undefined>
    method?: string
    path?: string
  }
}
