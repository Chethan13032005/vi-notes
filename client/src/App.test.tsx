import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders vi-notes title', () => {
  render(<App />);
  const titleElement = screen.getByText(/vi-notes/i);
  expect(titleElement).toBeInTheDocument();
});
