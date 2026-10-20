import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the document intelligence workspace', () => {
  render(<App />);
  expect(screen.getByText(/Document Intelligence/i)).toBeInTheDocument();
});
