export type ParseSuccess = {
  success: true;
  type: string;
  id: string;
  payload: string;
};

export type ParseError = {
  success: false;
  error: string;
  raw: string;
};

export type ParseResult = ParseSuccess | ParseError;
