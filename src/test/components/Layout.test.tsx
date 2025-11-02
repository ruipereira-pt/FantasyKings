import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    signOut: vi.fn(),
  })),
}));

describe('Layout Component', () => {
  it('should render without crashing', () => {
    const mockOnAuthClick = vi.fn();
    const mockOnTabChange = vi.fn();
    
    render(
      <Layout
        activeTab="rankings"
        onTabChange={mockOnTabChange}
        onAuthClick={mockOnAuthClick}
      >
        <div>Test Content</div>
      </Layout>
    );
    
    const heading = screen.getByText('FantasyKings.com');
    expect(heading).toBeInTheDocument();
  });
});

