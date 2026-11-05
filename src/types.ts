/** Where an argument is sent. */
export type FieldLocation = 'path' | 'query' | 'body' | 'header';

/** How routepeek found out about an argument. */
export type FieldSource = 'path' | 'validator' | 'learned';

export interface Field {
  name: string;
  in: FieldLocation;
  /** A simple type name: string, number, boolean, array, object, email, … */
  type: string;
  required: boolean;
  source: FieldSource;
}

export interface RouteInfo {
  /** Upper-case HTTP method, or ALL for `app.all()`. */
  method: string;
  /** Full path pattern, for example `/users/:id`. */
  path: string;
  /** True when part of the path could not be read from the app (see the README). */
  partialPath: boolean;
  /** Names of the handler functions, in order. */
  handlers: string[];
  fields: Field[];
  /** How many requests routepeek has seen for this route since the app started. */
  seen: number;
}

export interface RoutepeekOptions {
  /** Where the page is served. Default `/__routepeek`. */
  path?: string;
  /** Turn routepeek on or off. Default: on unless `NODE_ENV` is `production`. */
  enabled?: boolean;
  /** Learn arguments from requests the app receives. Default `true`. */
  learn?: boolean;
  /** Only answer requests from this machine. Default `true`. */
  localOnly?: boolean;
}
