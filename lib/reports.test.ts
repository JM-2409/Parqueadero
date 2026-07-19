import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadClosureReport } from './reports';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: class MockJSPDF {
      setFontSize = mockSetFontSize;
      setTextColor = mockSetTextColor;
      text = mockText;
      save = mockSave;
      lastAutoTable = { finalY: 100 };
    },
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

const createDbChain = (resolveValue: any) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve(resolveValue)),
  };
  return chain;
};

describe('downloadClosureReport', () => {
  const mockClosure = {
    opened_at: '2023-01-01T08:00:00Z',
    closed_at: '2023-01-01T18:00:00Z',
    parking_lot_id: 'test-lot-1',
    parking_lots: { name: 'Test Parking' },
    expected_revenue: 100000,
    base_amount: 50000,
    withdrawn_amount: 20000,
    total_revenue: 130000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockClear();
    mockText.mockClear();
    mockSetFontSize.mockClear();
    mockSetTextColor.mockClear();
  });

  it('should successfully generate a report with all data', async () => {
    const mockSessions = [
      {
        receipt_number: 1,
        entry_time: '2023-01-01T09:00:00Z',
        exit_time: '2023-01-01T10:00:00Z',
        total_charged: 5000,
        vehicles: { plate: 'ABC123', type: 'car' },
      },
    ];

    const mockWithdrawals = [
      {
        withdrawn_at: '2023-01-01T12:00:00Z',
        reason: 'Lunch',
        amount: 20000,
      },
    ];

    const mockMonthly = [
      {
        plate: 'XYZ987',
        owner_name: 'John Doe',
        created_at: '2023-01-01T10:00:00Z',
        amount_paid: 50000,
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: any) => {
      if (table === 'parking_sessions') return createDbChain({ data: mockSessions, error: null });
      if (table === 'cash_withdrawals') return createDbChain({ data: mockWithdrawals, error: null });
      if (table === 'monthly_subscribers') return createDbChain({ data: mockMonthly, error: null });
      return createDbChain({ data: [], error: null });
    });

    await downloadClosureReport(mockClosure);

    expect(supabase.from).toHaveBeenCalledWith('parking_sessions');
    expect(supabase.from).toHaveBeenCalledWith('cash_withdrawals');
    expect(supabase.from).toHaveBeenCalledWith('monthly_subscribers');

    expect(autoTable).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(mockSave.mock.calls[0][0]).toMatch(/^cierre_Test_Parking_2023-01-01.*\.pdf$/);
  });

  it('should successfully generate a report with empty data', async () => {
    vi.mocked(supabase.from).mockImplementation(() => createDbChain({ data: [], error: null }));

    await downloadClosureReport(mockClosure);

    expect(autoTable).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
  });

  it('should throw an error when sessions query fails', async () => {
    const errorMessage = 'Database error fetching sessions';
    vi.mocked(supabase.from).mockImplementation((table: any) => {
      if (table === 'parking_sessions') return createDbChain({ data: null, error: { message: errorMessage } });
      return createDbChain({ data: [], error: null });
    });

    await expect(downloadClosureReport(mockClosure)).rejects.toThrowError(
      'No se pudo generar el reporte: ' + errorMessage
    );
  });

  it('should throw an error when withdrawals query fails', async () => {
    const errorMessage = 'Database error fetching withdrawals';
    vi.mocked(supabase.from).mockImplementation((table: any) => {
      if (table === 'parking_sessions') return createDbChain({ data: [], error: null });
      if (table === 'cash_withdrawals') return createDbChain({ data: null, error: { message: errorMessage } });
      return createDbChain({ data: [], error: null });
    });

    await expect(downloadClosureReport(mockClosure)).rejects.toThrowError(
      'No se pudo generar el reporte: ' + errorMessage
    );
  });
});
