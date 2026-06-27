/**
 * Represents a process in the CPU scheduling simulator.
 */
export class Process {
    /**
     * @param {string|number} id - Process identification name/number
     * @param {number} arrivalTime - Time the process arrives in the system
     * @param {number} burstTime - Total CPU CPU cycles required
     * @param {number} priority - Priority value (lower typically represents higher priority)
     */
    constructor(id, arrivalTime, burstTime, priority = 0) {
        this.id = id.toString();
        this.arrivalTime = parseInt(arrivalTime) || 0;
        this.burstTime = parseInt(burstTime) || 0;
        this.priority = parseInt(priority) || 0;

        // Reset variables for simulation execution
        this.reset();
    }

    /**
     * Resets the runtime scheduling variables to their initial state.
     */
    reset() {
        this.remainingTime = this.burstTime;
        this.startTime = -1;
        this.completionTime = -1;
        this.waitingTime = 0;
        this.turnaroundTime = 0;
        this.responseTime = -1;
    }

    /**
     * Clones the process to prevent modifying the original input objects.
     * @returns {Process}
     */
    clone() {
        return new Process(this.id, this.arrivalTime, this.burstTime, this.priority);
    }
}
