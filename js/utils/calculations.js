/**
 * Computes average metrics and system-wide statistics for the scheduled processes.
 * 
 * @param {Array<Process>} scheduledProcesses - Processes containing calculated start, wait, completion times.
 * @param {Array} gantt - The Gantt chart execution intervals
 * @returns {Object} Metric summaries
 */
export function calculateMetrics(scheduledProcesses, gantt) {
    if (!scheduledProcesses || scheduledProcesses.length === 0) {
        return {
            avgWaitingTime: 0,
            avgTurnaroundTime: 0,
            avgResponseTime: 0,
            cpuUtilization: 0,
            throughput: 0,
            totalCompletionTime: 0
        };
    }

    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;
    let totalResponseTime = 0;
    let maxCompletionTime = 0;

    scheduledProcesses.forEach(p => {
        totalWaitingTime += p.waitingTime;
        totalTurnaroundTime += p.turnaroundTime;
        totalResponseTime += p.responseTime;
        if (p.completionTime > maxCompletionTime) {
            maxCompletionTime = p.completionTime;
        }
    });

    const count = scheduledProcesses.length;
    const avgWaitingTime = (totalWaitingTime / count).toFixed(2);
    const avgTurnaroundTime = (totalTurnaroundTime / count).toFixed(2);
    const avgResponseTime = (totalResponseTime / count).toFixed(2);

    // Calculate CPU utilization from Gantt chart
    let busyTime = 0;
    gantt.forEach(block => {
        if (block.pid !== "IDLE") {
            busyTime += (block.end - block.start);
        }
    });

    const cpuUtilization = maxCompletionTime > 0 
        ? ((busyTime / maxCompletionTime) * 100).toFixed(1) 
        : "0.0";

    const throughput = maxCompletionTime > 0 
        ? (count / maxCompletionTime).toFixed(3) 
        : "0.000";

    return {
        avgWaitingTime: parseFloat(avgWaitingTime),
        avgTurnaroundTime: parseFloat(avgTurnaroundTime),
        avgResponseTime: parseFloat(avgResponseTime),
        cpuUtilization: parseFloat(cpuUtilization),
        throughput: parseFloat(throughput),
        totalCompletionTime: maxCompletionTime
    };
}
