import { Process } from './core/process.js';
import { runScheduler } from './core/scheduler.js';
import { calculateMetrics } from './utils/calculations.js';

console.log("=========================================");
console.log("     CPU SCHEDULER ALGORITHM TEST SUITE  ");
console.log("=========================================");

// Test Dataset: Standard CPU scheduling textbook case
const createTestData = () => [
    new Process("P1", 0, 8, 3),
    new Process("P2", 1, 4, 1),
    new Process("P3", 2, 9, 4),
    new Process("P4", 3, 5, 2)
];

let failed = false;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        failed = true;
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

// 1. Verify FCFS
try {
    const processes = createTestData();
    const result = runScheduler("FCFS", processes);
    const metrics = calculateMetrics(result.processes, result.gantt);

    assert(metrics.totalCompletionTime === 26, "FCFS Total execution duration should be 26");
    
    const p1 = result.processes.find(p => p.id === "P1");
    const p2 = result.processes.find(p => p.id === "P2");
    const p3 = result.processes.find(p => p.id === "P3");
    const p4 = result.processes.find(p => p.id === "P4");

    assert(p1.startTime === 0 && p1.completionTime === 8, "P1 FCFS execution interval");
    assert(p2.startTime === 8 && p2.completionTime === 12, "P2 FCFS execution interval");
    assert(p3.startTime === 12 && p3.completionTime === 21, "P3 FCFS execution interval");
    assert(p4.startTime === 21 && p4.completionTime === 26, "P4 FCFS execution interval");
    
    assert(metrics.avgWaitingTime === 8.75, `FCFS Average waiting time should be 8.75 (got ${metrics.avgWaitingTime})`);
} catch (err) {
    console.error("Error executing FCFS test:", err);
    failed = true;
}

// 2. Verify Non-Preemptive SJF
try {
    const processes = createTestData();
    const result = runScheduler("SJF", processes);
    const metrics = calculateMetrics(result.processes, result.gantt);

    assert(metrics.totalCompletionTime === 26, "SJF Total execution duration should be 26");

    const p1 = result.processes.find(p => p.id === "P1"); // Arr=0, Burst=8 (runs first because no others have arrived at t=0)
    const p2 = result.processes.find(p => p.id === "P2"); // Arr=1, Burst=4
    const p3 = result.processes.find(p => p.id === "P3"); // Arr=2, Burst=9
    const p4 = result.processes.find(p => p.id === "P4"); // Arr=3, Burst=5

    // At t=8: P1 finishes. Ready: P2 (burst 4), P3 (burst 9), P4 (burst 5)
    // SJF schedules P2 first (ends t=12), then P4 (ends t=17), then P3 (ends t=26)
    assert(p1.startTime === 0 && p1.completionTime === 8, "P1 SJF execution interval");
    assert(p2.startTime === 8 && p2.completionTime === 12, "P2 SJF execution interval");
    assert(p4.startTime === 12 && p4.completionTime === 17, "P4 SJF execution interval");
    assert(p3.startTime === 17 && p3.completionTime === 26, "P3 SJF execution interval");
    
    // Average wait:
    // P1: wait = 0
    // P2: wait = 8 - 1 = 7
    // P3: wait = 17 - 2 = 15
    // P4: wait = 12 - 3 = 9
    // Avg = (0 + 7 + 15 + 9)/4 = 7.75
    assert(metrics.avgWaitingTime === 7.75, `SJF Average waiting time should be 7.75 (got ${metrics.avgWaitingTime})`);
} catch (err) {
    console.error("Error executing SJF test:", err);
    failed = true;
}

// 3. Verify Preemptive SRTF
try {
    const processes = createTestData();
    const result = runScheduler("SRTF", processes);
    const metrics = calculateMetrics(result.processes, result.gantt);

    // Timeline trace:
    // t=0: P1 arrives (burst 8). Starts running.
    // t=1: P2 arrives (burst 4). P1 remaining is 7. P2 is shorter (4 < 7). P1 preempted, P2 starts.
    // t=2: P3 arrives (burst 9). P2 remaining is 3. P2 remains shortest.
    // t=3: P4 arrives (burst 5). P2 remaining is 2. P2 remains shortest.
    // t=5: P2 finishes. Ready: P1 (rem 7), P3 (burst 9), P4 (burst 5). P4 is shortest. Starts.
    // t=10: P4 finishes. Ready: P1 (rem 7), P3 (burst 9). P1 is shortest. Starts.
    // t=17: P1 finishes. P3 starts.
    // t=26: P3 finishes.
    const p1 = result.processes.find(p => p.id === "P1");
    const p2 = result.processes.find(p => p.id === "P2");
    const p3 = result.processes.find(p => p.id === "P3");
    const p4 = result.processes.find(p => p.id === "P4");

    assert(p2.completionTime === 5, "P2 SRTF completion time should be 5");
    assert(p4.completionTime === 10, "P4 SRTF completion time should be 10");
    assert(p1.completionTime === 17, "P1 SRTF completion time should be 17");
    assert(p3.completionTime === 26, "P3 SRTF completion time should be 26");

    // Average wait:
    // P1: wait = 0 (run 1s) + (10 - 1) = 9
    // P2: wait = 0
    // P3: wait = 17 - 2 = 15
    // P4: wait = 5 - 3 = 2
    // Avg = (9 + 0 + 15 + 2)/4 = 6.5
    assert(metrics.avgWaitingTime === 6.5, `SRTF Average waiting time should be 6.5 (got ${metrics.avgWaitingTime})`);
} catch (err) {
    console.error("Error executing SRTF test:", err);
    failed = true;
}

// 4. Verify Round Robin
try {
    const processes = createTestData();
    const result = runScheduler("RoundRobin", processes, { timeQuantum: 2 });
    const metrics = calculateMetrics(result.processes, result.gantt);

    assert(metrics.totalCompletionTime === 26, "Round Robin Total execution duration should be 26");
    
    // Detailed RR execution:
    // t=0: P1 arrives. P1 starts (quantum 2).
    // t=1: P2 arrives.
    // t=2: P1 quantum expires (rem 6). P3 arrives. ReadyQueue: P2, P3, P1. P2 scheduled (quantum 2).
    // t=3: P4 arrives. ReadyQueue: P3, P1, P4.
    // t=4: P2 quantum expires (rem 2). ReadyQueue: P3, P1, P4, P2. P3 scheduled (quantum 2).
    // ...
    // Let's assert a few properties to confirm correct queue sorting
    const p2 = result.processes.find(p => p.id === "P2");
    assert(p2.completionTime === 12, `P2 RR completion time should be 12 (got ${p2.completionTime})`);
} catch (err) {
    console.error("Error executing Round Robin test:", err);
    failed = true;
}

console.log("=========================================");
if (failed) {
    console.log("❌ TEST SUITE COMPLETED WITH ERRORS.");
    process.exit(1);
} else {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
}
