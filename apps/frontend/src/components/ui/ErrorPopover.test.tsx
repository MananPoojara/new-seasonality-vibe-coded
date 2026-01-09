// Simple test to verify ErrorPopover component structure
import { ErrorPopover } from './ErrorPopover';

// Mock test data
const mockAnchorRect: DOMRect = {
  bottom: 100,
  height: 30,
  left: 200,
  right: 300,
  top: 70,
  width: 100,
  x: 200,
  y: 70,
  toJSON: () => ({})
};

const mockError = "Test error message for validation";

// This would be used in a proper test environment
export const ErrorPopoverTest = () => {
  return (
    <ErrorPopover
      anchorRect={mockAnchorRect}
      error={mockError}
      onClose={() => console.log('Popover closed')}
    />
  );
};