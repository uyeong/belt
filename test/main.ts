test('sum', async () => {
  // Given
  const a = 10;
  const b = 5;
  // When
  const result = a + b;
  // Then
  expect(result).toEqual(15);
});