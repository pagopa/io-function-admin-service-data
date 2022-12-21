export const mockQuery = () => jest.fn();

export function Pool() {
  return {
    async connect() {
      return {
        query: mockQuery
      };
    }
  };
}
