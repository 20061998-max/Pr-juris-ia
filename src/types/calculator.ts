export type CalculatorMode = 'standard' | 'scientific' | 'converter' | 'financial';

export type AngleMode = 'DEG' | 'RAD';

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
  note?: string;
}

export type UnitCategory = 
  | 'length' 
  | 'weight' 
  | 'temperature' 
  | 'area' 
  | 'volume' 
  | 'speed' 
  | 'data' 
  | 'time';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  toBase: (val: number) => number;
  fromBase: (val: number) => number;
}

export interface UnitCategoryData {
  id: UnitCategory;
  name: string;
  units: UnitDefinition[];
}

export interface CompoundInterestInput {
  initialAmount: number;
  monthlyContribution: number;
  interestRate: number; // percentage
  rateType: 'monthly' | 'yearly';
  period: number;
  periodType: 'months' | 'years';
}

export interface CompoundInterestResult {
  totalInvested: number;
  totalInterest: number;
  finalAmount: number;
  yearlyBreakdown: {
    year: number;
    invested: number;
    interest: number;
    balance: number;
  }[];
}
