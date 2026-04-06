import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { api } from '../api/client';
import { vi } from 'vitest';

vi.mock('../api/client');

const makePlant = (overrides = {}) => ({
  id: 1, name: 'Test Pothos', type_emoji: '🪴', type_name: 'Pothos',
  water_amount_ml: 320, overdue_water: true, overdue_fertilize: false,
  next_water_date: new Date().toISOString(),
  next_fertilize_date: null,
  ...overrides,
});

test('shows "Nothing due today" when no plants are overdue', async () => {
  api.getPlants.mockResolvedValue([makePlant({ overdue_water: false })]);
  render(<MemoryRouter><Home /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/nothing due today/i)).toBeInTheDocument());
});

test('shows Water All button when 2+ plants need watering', async () => {
  api.getPlants.mockResolvedValue([
    makePlant({ id: 1, name: 'Pothos' }),
    makePlant({ id: 2, name: 'Monstera' }),
  ]);
  api.waterBatch.mockResolvedValue({ updated: 2 });
  render(<MemoryRouter><Home /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/water all/i)).toBeInTheDocument());
});

test('does not show Water All button when only 1 plant needs watering', async () => {
  api.getPlants.mockResolvedValue([makePlant({ id: 1, name: 'Pothos' })]);
  render(<MemoryRouter><Home /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText(/water all/i)).not.toBeInTheDocument());
});
