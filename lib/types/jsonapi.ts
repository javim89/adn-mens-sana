// JSON:API v1.1 shared TypeScript types

// Resource object
export type JsonApiResource<T extends Record<string, unknown>> = {
  type: string;
  id: string;
  attributes: T;
};

// Collection response
export type JsonApiCollection<T extends Record<string, unknown>> = {
  data: JsonApiResource<T>[];
  links: {
    self: string;
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: { total: number };
};

// Single-resource response
export type JsonApiSingle<T extends Record<string, unknown>> = {
  data: JsonApiResource<T>;
};

// Error object
export type JsonApiErrorObject = {
  status: string;
  code: string;
  title: string;
  detail?: string;
  source?: { pointer: string };
};

// Error response
export type JsonApiErrors = {
  errors: JsonApiErrorObject[];
};
