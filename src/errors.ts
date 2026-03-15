export class BadRequestError extends Error {
  // 400 Bad Request
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  // 401 Unauthorized
  constructor(message: string) {
    super(message);
  }
}

export class ForbiddenError extends Error {
  // 403 Forbidden
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends Error {
  // 404 Not Found
  constructor(message: string) {
    super(message);
  }
}
