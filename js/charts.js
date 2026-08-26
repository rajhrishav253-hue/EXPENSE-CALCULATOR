/**
 * Chart.js Integration Module for Student Expense Visualizations
 */

const ChartManager = {
  categoryChart: null,
  trendChart: null,
  dashboardCategoryChart: null,
  dashboardTrendChart: null,

  getColors(isDark) {
    return {
      textColor: isDark ? '#e2e8f0' : '#334155',
      mutedText: isDark ? '#94a3b8' : '#64748b',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipText: isDark ? '#f8fafc' : '#0f172a',
      borderBg: isDark ? '#334155' : '#e2e8f0',
      categoryColors: {
        'Food': '#f97316',          // Orange
        'Travel': '#0284c7',        // Sky Blue
        'Shopping': '#9333ea',      // Purple
        'Education': '#0d9488',     // Teal
        'Entertainment': '#db2777', // Pink
        'Bills': '#d97706',         // Amber
        'Health': '#e11d48',        // Rose
        'Other': '#64748b'          // Slate
      },
      palette: [
        '#f97316', '#0284c7', '#9333ea', '#0d9488',
        '#db2777', '#d97706', '#e11d48', '#64748b'
      ]
    };
  },

  /**
   * Render Category Breakdown Doughnut Chart
   */
  renderCategoryDoughnut(canvasId, categoryTotals, currencySymbol = '₹', isMini = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const chartKey = isMini ? 'dashboardCategoryChart' : 'categoryChart';
    if (this[chartKey]) {
      this[chartKey].destroy();
      this[chartKey] = null;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const colors = this.getColors(isDark);
    const locale = currencySymbol === '₹' ? 'en-IN' : undefined;

    const labels = Object.keys(categoryTotals).filter(cat => (categoryTotals[cat] || 0) > 0);
    const data = labels.map(cat => categoryTotals[cat]);

    if (labels.length === 0 || data.every(v => v === 0)) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colors.mutedText;
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('No expenses logged yet', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Add a spend to see category distribution', canvas.width / 2, canvas.height / 2 + 12);
      ctx.restore();
      return;
    }

    const backgroundColors = labels.map(cat => colors.categoryColors[cat] || '#64748b');

    this[chartKey] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: isDark ? '#111827' : '#ffffff',
          hoverOffset: isMini ? 4 : 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: isMini ? '68%' : '65%',
        plugins: {
          legend: {
            display: !isMini,
            position: 'bottom',
            labels: {
              color: colors.textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '500' },
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.borderBg,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * Render Daily or Monthly Spending Trend Chart (Bar or Line)
   */
  renderSpendingTrendChart(canvasId, trendData, type = 'bar', currencySymbol = '₹', isMini = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const chartKey = isMini ? 'dashboardTrendChart' : 'trendChart';
    if (this[chartKey]) {
      this[chartKey].destroy();
      this[chartKey] = null;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const colors = this.getColors(isDark);
    const locale = currencySymbol === '₹' ? 'en-IN' : undefined;

    const labels = trendData.map(d => d.label);
    const values = trendData.map(d => d.amount);

    const isLine = type === 'line';

    this[chartKey] = new Chart(canvas, {
      type: isLine ? 'line' : 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Spending',
          data: values,
          backgroundColor: isLine ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.85)',
          borderColor: '#6366f1',
          borderWidth: isLine ? 2.5 : 1,
          borderRadius: isLine ? 0 : 6,
          fill: isLine,
          tension: 0.35,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#ffffff',
          pointRadius: isLine ? 4 : 0,
          pointHoverRadius: 6,
          maxBarThickness: isMini ? 22 : 36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: colors.mutedText,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: isMini ? 10 : 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: colors.gridColor },
            ticks: {
              color: colors.mutedText,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: isMini ? 10 : 11 },
              callback: val => currencySymbol + Number(val).toLocaleString(locale)
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipText,
            bodyColor: colors.tooltipText,
            borderColor: colors.borderBg,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: context => ` Spending: ${currencySymbol}${(context.parsed.y || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          }
        }
      }
    });
  }
};
