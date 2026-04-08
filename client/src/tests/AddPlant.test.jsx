import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AddPlant from '../pages/AddPlant';
import { api } from '../api/client';
import { vi } from 'vitest';

vi.mock('../api/client');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockTypes = [
  { id: 1, name: 'Pothos', emoji: '🪴', thirst_factor: 0.9, water_amount_per_cm: 8, fertilize_every: 28 },
  { id: 2, name: 'Cactus (globular)', emoji: '🌵', thirst_factor: 2.0, water_amount_per_cm: 3, fertilize_every: 60 },
];

test('step 1 shows plant type list', async () => {
  api.getPlantTypes.mockResolvedValue(mockTypes);
  render(<MemoryRouter><AddPlant /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Pothos')).toBeInTheDocument());
  expect(screen.getByText('Cactus (globular)')).toBeInTheDocument();
});

test('selecting a plant type advances to step 2', async () => {
  api.getPlantTypes.mockResolvedValue(mockTypes);
  render(<MemoryRouter><AddPlant /></MemoryRouter>);
  await waitFor(() => screen.getByText('Pothos'));
  fireEvent.click(screen.getByText('Pothos'));
  expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
});
