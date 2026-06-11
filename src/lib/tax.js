/**
 * Philippine Income Tax Calculator
 * Based on TRAIN Law (RA 10963) - Effective 2023 onwards
 */

// SSS Contribution Table (2024)
export function computeSSS(monthlySalary) {
    if (monthlySalary <= 3250) return 135;
    if (monthlySalary <= 3750) return 158;
    if (monthlySalary <= 4250) return 180;
    if (monthlySalary <= 4750) return 203;
    if (monthlySalary <= 5250) return 225;
    if (monthlySalary <= 5750) return 248;
    if (monthlySalary <= 6250) return 270;
    if (monthlySalary <= 6750) return 293;
    if (monthlySalary <= 7250) return 315;
    if (monthlySalary <= 7750) return 338;
    if (monthlySalary <= 8250) return 360;
    if (monthlySalary <= 8750) return 383;
    if (monthlySalary <= 9250) return 405;
    if (monthlySalary <= 9750) return 428;
    if (monthlySalary <= 10250) return 450;
    if (monthlySalary <= 10750) return 473;
    if (monthlySalary <= 11250) return 495;
    if (monthlySalary <= 11750) return 518;
    if (monthlySalary <= 12250) return 540;
    if (monthlySalary <= 12750) return 563;
    if (monthlySalary <= 13250) return 585;
    if (monthlySalary <= 13750) return 608;
    if (monthlySalary <= 14250) return 630;
    if (monthlySalary <= 14750) return 653;
    if (monthlySalary <= 15250) return 675;
    if (monthlySalary <= 15750) return 698;
    if (monthlySalary <= 16250) return 720;
    if (monthlySalary <= 16750) return 743;
    if (monthlySalary <= 17250) return 765;
    if (monthlySalary <= 17750) return 788;
    if (monthlySalary <= 18250) return 810;
    if (monthlySalary <= 18750) return 833;
    if (monthlySalary <= 19250) return 855;
    if (monthlySalary <= 19750) return 878;
    if (monthlySalary <= 20250) return 900;
    if (monthlySalary <= 20750) return 923;
    if (monthlySalary <= 21250) return 945;
    if (monthlySalary <= 21750) return 968;
    if (monthlySalary <= 22250) return 990;
    if (monthlySalary <= 22750) return 1013;
    if (monthlySalary <= 23250) return 1035;
    if (monthlySalary <= 23750) return 1058;
    if (monthlySalary <= 24250) return 1080;
    if (monthlySalary <= 24750) return 1103;
    return 1125; // Max
}

// PhilHealth Contribution (2024) - 2.5% shared by employee and employer
export function computePhilHealth(monthlySalary) {
    const monthlyBasic = Math.min(Math.max(monthlySalary, 10000), 100000);
    return (monthlyBasic * 0.025); // Employee share: 2.5%
}

// Pag-IBIG Contribution
export function computePagIBIG(monthlySalary) {
    if (monthlySalary <= 1500) return monthlySalary * 0.01;
    return Math.min(monthlySalary * 0.02, 200); // 2% or max 200
}

/**
 * Withholding Tax Computation (TRAIN Law)
 * Based on annual taxable income
 */
export function computeWithholdingTax(monthlySalary, sss, philhealth, pagibig) {
    // Annual gross income
    const annualGross = monthlySalary * 12;
    
    // Annual deductions
    const annualSSS = sss * 12;
    const annualPhilHealth = philhealth * 12;
    const annualPagIBIG = pagibig * 12;
    const totalContributions = annualSSS + annualPhilHealth + annualPagIBIG;
    
    // Taxable income
    const taxableIncome = annualGross - totalContributions;

    // TRAIN Law Tax Table (Annual)
    let annualTax = 0;

    if (taxableIncome <= 250000) {
        annualTax = 0;
    } else if (taxableIncome <= 400000) {
        annualTax = (taxableIncome - 250000) * 0.15;
    } else if (taxableIncome <= 800000) {
        annualTax = 22500 + (taxableIncome - 400000) * 0.20;
    } else if (taxableIncome <= 2000000) {
        annualTax = 102500 + (taxableIncome - 800000) * 0.25;
    } else if (taxableIncome <= 8000000) {
        annualTax = 402500 + (taxableIncome - 2000000) * 0.30;
    } else {
        annualTax = 2202500 + (taxableIncome - 8000000) * 0.35;
    }

    // Monthly withholding tax
    return annualTax / 12;
}

/**
 * Complete payroll deductions computation
 */
export function computeDeductions(monthlySalary, applyTax = 1) {
    const sss = computeSSS(monthlySalary);
    const philhealth = computePhilHealth(monthlySalary);
    const pagibig = computePagIBIG(monthlySalary);
    const tax = applyTax == 1 ? computeWithholdingTax(monthlySalary, sss, philhealth, pagibig) : 0;

    return {
        sss: Math.round(sss * 100) / 100,
        philhealth: Math.round(philhealth * 100) / 100,
        pagibig: Math.round(pagibig * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        totalContributions: Math.round((sss + philhealth + pagibig + tax) * 100) / 100,
    };
}