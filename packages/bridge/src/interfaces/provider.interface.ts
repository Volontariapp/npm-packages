export interface IConnectionProvider<T> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDriver(): T;
  isConnected(): boolean;
}
