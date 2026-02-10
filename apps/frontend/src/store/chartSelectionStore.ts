import { create } from 'zustand';
import { Time } from 'lightweight-charts';

export interface TimeRangeSelection {
  startTime: Time | null;
  endTime: Time | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface ChartSelectionState {
  // Time range selection
  timeRangeSelection: TimeRangeSelection;
  
  // Actions
  setTimeRangeSelection: (selection: TimeRangeSelection) => void;
  clearTimeRangeSelection: () => void;
  
  // Convert Time to Date string for API calls
  getDateRangeForAPI: () => { startDate: string | null; endDate: string | null };
}

const defaultSelection: TimeRangeSelection = {
  startTime: null,
  endTime: null,
  startDate: null,
  endDate: null,
  isActive: false,
};

export const useChartSelectionStore = create<ChartSelectionState>((set, get) => ({
  timeRangeSelection: defaultSelection,

  setTimeRangeSelection: (selection) => {
    // Convert Time to Date strings
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (selection.startTime !== null) {
      const timestamp = typeof selection.startTime === 'number' 
        ? selection.startTime * 1000 
        : new Date(selection.startTime as any).getTime();
      startDate = new Date(timestamp).toISOString().split('T')[0];
    }

    if (selection.endTime !== null) {
      const timestamp = typeof selection.endTime === 'number' 
        ? selection.endTime * 1000 
        : new Date(selection.endTime as any).getTime();
      endDate = new Date(timestamp).toISOString().split('T')[0];
    }

    set({
      timeRangeSelection: {
        ...selection,
        startDate,
        endDate,
      },
    });
  },

  clearTimeRangeSelection: () => set({ timeRangeSelection: defaultSelection }),

  getDateRangeForAPI: () => {
    const { timeRangeSelection } = get();
    return {
      startDate: timeRangeSelection.startDate,
      endDate: timeRangeSelection.endDate,
    };
  },
}));
