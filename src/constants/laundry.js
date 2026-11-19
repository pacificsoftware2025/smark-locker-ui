// ==============================================================================
// LAUNDRY SERVICE CONSTANTS
// Strictly matches the pricing, tiers, and capacities specified in workflow.md
// ==============================================================================

export const LAUNDRY_SERVICES = [
  {
    id: 'wash_only',
    label: 'Wash Only',
    basePrice: '₱40/kg',
    description: 'Machine wash only with standard spin',
  },
  {
    id: 'wash_dry',
    label: 'Wash & Dry',
    basePrice: '₱55/kg',
    description: 'Complete wash and hot air tumble dry',
  },
  {
    id: 'wash_dry_fold',
    label: 'Wash, Dry & Fold',
    basePrice: '₱65/kg',
    description: 'Full service: wash, dry, neatly folded in bag',
    recommended: true,
  },
];

export const LOAD_SIZES = [
  { id: 'Small', label: 'Small', maxKg: 'Max 5kg' },
  { id: 'Medium', label: 'Medium', maxKg: 'Max 7kg', default: true },
  { id: 'Large', label: 'Large', maxKg: 'Max 9kg' },
];
