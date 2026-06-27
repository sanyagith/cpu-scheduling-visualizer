import { scheduleFCFS } from '../algorithms/fcfs.js';
import { scheduleSJF } from '../algorithms/sjf.js';
import { scheduleSRTF } from '../algorithms/srtf.js';
import { schedulePriority } from '../algorithms/priority.js';
import { scheduleRoundRobin } from '../algorithms/roundRobin.js';
import { scheduleHRRN } from '../algorithms/hrrn.js';

export const ALGORITHMS = {
    FCFS: {
        name: "First Come First Serve (FCFS)",
        key: "FCFS",
        strategy: "Non-Preemptive",
        run: (processes) => scheduleFCFS(processes)
    },
    SJF: {
        name: "Shortest Job First (SJF)",
        key: "SJF",
        strategy: "Non-Preemptive",
        run: (processes) => scheduleSJF(processes)
    },
    SRTF: {
        name: "Shortest Remaining Time First (SRTF)",
        key: "SRTF",
        strategy: "Preemptive",
        run: (processes) => scheduleSRTF(processes)
    },
    PriorityNonPreemptive: {
        name: "Priority Scheduling (Non-Preemptive)",
        key: "PriorityNonPreemptive",
        strategy: "Non-Preemptive",
        run: (processes, options) => schedulePriority(processes, { preemptive: false, ...options })
    },
    PriorityPreemptive: {
        name: "Priority Scheduling (Preemptive)",
        key: "PriorityPreemptive",
        strategy: "Preemptive",
        run: (processes, options) => schedulePriority(processes, { preemptive: true, ...options })
    },
    RoundRobin: {
        name: "Round Robin (RR)",
        key: "RoundRobin",
        strategy: "Preemptive",
        run: (processes, options) => scheduleRoundRobin(processes, options)
    },
    HRRN: {
        name: "Highest Response Ratio Next (HRRN)",
        key: "HRRN",
        strategy: "Non-Preemptive",
        run: (processes) => scheduleHRRN(processes)
    }
};

/**
 * Runs the selected CPU scheduling algorithm.
 * 
 * @param {string} algoKey - Algorithm identifier (key of ALGORITHMS)
 * @param {Array<Process>} processes - Array of Process objects
 * @param {Object} options - Additional options like time quantum or priority rules
 * @returns {Object} { gantt, history, processes }
 */
export function runScheduler(algoKey, processes, options = {}) {
    const algo = ALGORITHMS[algoKey];
    if (!algo) {
        throw new Error(`Algorithm ${algoKey} not found.`);
    }
    
    // Reset all processes before executing the scheduling algorithm
    processes.forEach(p => p.reset());

    return algo.run(processes, options);
}
