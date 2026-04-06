const { query } = require('../db');

test('database connection works', async () => {
  const result = await query('SELECT 1 + 1 AS sum');
  expect(result.rows[0].sum).toBe(2);
});
