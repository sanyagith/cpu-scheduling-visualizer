/**
 * Manages Chart.js visualizations for comparison dashboards.
 */

// Keep track of active chart instances to prevent duplicate rendering bugs
const chartInstances = {
    avgTimes: null,
    cpuUtil: null,
    switches: null,
    throughput: null
};

/**
 * Renders or updates comparison charts using Chart.js
 * 
 * @param {Array} comparisonResults - Array of scheduling runs: [ { algoKey, algoName, metrics, gantt } ]
 */
export function updateComparisonCharts(comparisonResults) {
    if (!comparisonResults || comparisonResults.length === 0) return;

    const labels = comparisonResults.map(r => r.algoName);
    const waitingTimes = comparisonResults.map(r => r.metrics.avgWaitingTime);
    const turnaroundTimes = comparisonResults.map(r => r.metrics.avgTurnaroundTime);
    const responseTimes = comparisonResults.map(r => r.metrics.avgResponseTime);
    
    const cpuUtils = comparisonResults.map(r => r.metrics.cpuUtilization);
    const contextSwitches = comparisonResults.map(r => r.contextSwitches);
    const throughputs = comparisonResults.map(r => r.metrics.throughput);

    // Apply dark/light specific labels color config dynamically
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    const commonOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
                labels: { color: textColor, font: { family: 'Outfit, Inter, sans-serif' } }
            },
            tooltip: {
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                titleColor: isDark ? "#ffffff" : "#0f172a",
                bodyColor: isDark ? "#f8fafc" : "#0f172a",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { family: 'Outfit, Inter, sans-serif' } }
            },
            y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: textColor, font: { family: 'Outfit, Inter, sans-serif' } }
            }
        }
    });

    // 1. Chart: Average Latency (Multi Bar Chart)
    const ctxAvg = document.getElementById("chart-avg-times");
    if (ctxAvg) {
        if (chartInstances.avgTimes) chartInstances.avgTimes.destroy();

        // Custom config for multi bar legend visibility
        const avgOptions = commonOptions("Average Times");
        avgOptions.plugins.legend.display = true;

        chartInstances.avgTimes = new Chart(ctxAvg, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Avg Waiting Time',
                        data: waitingTimes,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    },
                    {
                        label: 'Avg Turnaround Time',
                        data: turnaroundTimes,
                        backgroundColor: '#22c55e',
                        borderRadius: 4
                    },
                    {
                        label: 'Avg Response Time',
                        data: responseTimes,
                        backgroundColor: '#facc15',
                        borderRadius: 4
                    }
                ]
            },
            options: avgOptions
        });
    }

    // 2. Chart: CPU Utilization
    const ctxCpu = document.getElementById("chart-cpu-utilization");
    if (ctxCpu) {
        if (chartInstances.cpuUtil) chartInstances.cpuUtil.destroy();
        chartInstances.cpuUtil = new Chart(ctxCpu, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'CPU Utilization %',
                    data: cpuUtils,
                    backgroundColor: '#a855f7',
                    borderRadius: 6,
                    maxBarThickness: 40
                }]
            },
            options: commonOptions("CPU Utilization")
        });
    }

    // 3. Chart: Context Switches
    const ctxSwitches = document.getElementById("chart-context-switches");
    if (ctxSwitches) {
        if (chartInstances.switches) chartInstances.switches.destroy();
        chartInstances.switches = new Chart(ctxSwitches, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Switches',
                    data: contextSwitches,
                    backgroundColor: '#ef4444',
                    borderRadius: 6,
                    maxBarThickness: 40
                }]
            },
            options: commonOptions("Context Switches")
        });
    }

    // 4. Chart: Throughput
    const ctxThroughput = document.getElementById("chart-throughput");
    if (ctxThroughput) {
        if (chartInstances.throughput) chartInstances.throughput.destroy();
        chartInstances.throughput = new Chart(ctxThroughput, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Throughput',
                    data: throughputs,
                    backgroundColor: '#06b6d4',
                    borderRadius: 6,
                    maxBarThickness: 40
                }]
            },
            options: commonOptions("Throughput")
        });
    }
}
