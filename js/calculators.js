/**
 * Financial Calculators Module
 * Split Bill, 50/30/20 Budget Planner, Savings Goal & Runway, Loan/EMI Calculator
 */

const Calculators = {
  /**
   * Split Bill & Tip Calculator
   */
  calculateSplitBill({ subtotal, tipPercent, taxPercent, numPeople }) {
    const bill = Math.max(0, parseFloat(subtotal) || 0);
    const tipPct = Math.max(0, parseFloat(tipPercent) || 0);
    const taxPct = Math.max(0, parseFloat(taxPercent) || 0);
    const people = Math.max(1, parseInt(numPeople) || 1);

    const taxAmount = (bill * taxPct) / 100;
    const tipAmount = (bill * tipPct) / 100;
    const totalAmount = bill + taxAmount + tipAmount;

    const perPersonTotal = totalAmount / people;
    const perPersonBill = bill / people;
    const perPersonTip = tipAmount / people;
    const perPersonTax = taxAmount / people;

    return {
      subtotal: bill,
      tipPercent: tipPct,
      taxPercent: taxPct,
      numPeople: people,
      tipAmount,
      taxAmount,
      totalAmount,
      perPersonTotal,
      perPersonBill,
      perPersonTip,
      perPersonTax
    };
  },

  /**
   * 50/30/20 Budget Calculator
   */
  calculate503020(monthlyIncome, currentActuals = null) {
    const income = Math.max(0, parseFloat(monthlyIncome) || 0);
    const needsTarget = income * 0.50;
    const wantsTarget = income * 0.30;
    const savingsTarget = income * 0.20;

    let comparison = null;
    if (currentActuals) {
      const actualNeeds = currentActuals.needs || 0;
      const actualWants = currentActuals.wants || 0;
      const actualSavings = currentActuals.savings || 0;

      comparison = {
        needs: {
          target: needsTarget,
          actual: actualNeeds,
          diff: needsTarget - actualNeeds,
          percentActual: income > 0 ? (actualNeeds / income) * 100 : 0
        },
        wants: {
          target: wantsTarget,
          actual: actualWants,
          diff: wantsTarget - actualWants,
          percentActual: income > 0 ? (actualWants / income) * 100 : 0
        },
        savings: {
          target: savingsTarget,
          actual: actualSavings,
          diff: actualSavings - savingsTarget,
          percentActual: income > 0 ? (actualSavings / income) * 100 : 0
        }
      };
    }

    return {
      income,
      needs: needsTarget,
      wants: wantsTarget,
      savings: savingsTarget,
      comparison
    };
  },

  /**
   * Savings Goal & Emergency Fund Runway Calculator
   */
  calculateSavingsGoal({ targetAmount, currentSavings, monthlyContribution, annualReturnRate, monthlyExpense }) {
    const target = Math.max(0, parseFloat(targetAmount) || 0);
    const initial = Math.max(0, parseFloat(currentSavings) || 0);
    const monthlyDeposit = Math.max(0, parseFloat(monthlyContribution) || 0);
    const rate = Math.max(0, parseFloat(annualReturnRate) || 0) / 100;
    const monthlyRate = rate / 12;
    const monthlyBurn = Math.max(0, parseFloat(monthlyExpense) || 0);

    let monthsToTarget = 0;
    let balance = initial;
    let totalDeposited = initial;
    let totalInterest = 0;

    if (balance >= target) {
      monthsToTarget = 0;
    } else if (monthlyDeposit <= 0 && rate <= 0) {
      monthsToTarget = Infinity;
    } else {
      const maxMonths = 1200; // 100 years max
      while (balance < target && monthsToTarget < maxMonths) {
        const interest = balance * monthlyRate;
        balance += interest + monthlyDeposit;
        totalDeposited += monthlyDeposit;
        totalInterest += interest;
        monthsToTarget++;
      }
    }

    // Emergency Fund Runway (how many months current savings can sustain living)
    const runwayMonths = monthlyBurn > 0 ? (initial / monthlyBurn).toFixed(1) : '∞';

    return {
      target,
      initial,
      monthlyDeposit,
      monthsToTarget: monthsToTarget === Infinity ? 'Unreachable (Increase monthly deposit)' : monthsToTarget,
      yearsToTarget: monthsToTarget !== Infinity ? (monthsToTarget / 12).toFixed(1) : null,
      finalBalance: balance,
      totalDeposited,
      totalInterest,
      runwayMonths,
      monthlyBurn
    };
  },

  /**
   * Loan / EMI Calculator
   */
  calculateEMI({ principal, annualInterestRate, tenureYears, tenureMonths }) {
    const p = Math.max(0, parseFloat(principal) || 0);
    const annualRate = Math.max(0, parseFloat(annualInterestRate) || 0);
    let totalMonths = 0;

    if (tenureYears !== undefined && tenureYears !== null) {
      totalMonths += (parseFloat(tenureYears) || 0) * 12;
    }
    if (tenureMonths !== undefined && tenureMonths !== null) {
      totalMonths += parseFloat(tenureMonths) || 0;
    }

    totalMonths = Math.max(1, Math.round(totalMonths));
    const r = (annualRate / 12) / 100;

    let emi = 0;
    let totalPayment = 0;
    let totalInterest = 0;

    if (r === 0) {
      emi = p / totalMonths;
      totalPayment = p;
      totalInterest = 0;
    } else {
      emi = (p * r * Math.pow(1 + r, totalMonths)) / (Math.pow(1 + r, totalMonths) - 1);
      totalPayment = emi * totalMonths;
      totalInterest = totalPayment - p;
    }

    // Generate year-by-year schedule
    const schedule = [];
    let remainingPrincipal = p;
    let accumulatedInterestYear = 0;
    let principalPaidYear = 0;

    for (let m = 1; m <= totalMonths; m++) {
      const interestForMonth = remainingPrincipal * r;
      const principalForMonth = emi - interestForMonth;
      remainingPrincipal = Math.max(0, remainingPrincipal - principalForMonth);

      accumulatedInterestYear += interestForMonth;
      principalPaidYear += principalForMonth;

      if (m % 12 === 0 || m === totalMonths) {
        schedule.push({
          year: Math.ceil(m / 12),
          principalPaid: principalPaidYear,
          interestPaid: accumulatedInterestYear,
          totalPaid: principalPaidYear + accumulatedInterestYear,
          remainingBalance: remainingPrincipal
        });
        accumulatedInterestYear = 0;
        principalPaidYear = 0;
      }
    }

    return {
      principal: p,
      annualRate,
      totalMonths,
      monthlyEMI: isNaN(emi) ? 0 : emi,
      totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
      totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
      schedule
    };
  }
};
