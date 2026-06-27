/**
 * Highest Response Ratio Next (HRRN) Scheduling Algorithm.
 * Non-preemptive algorithm that schedules processes based on their response ratio to prevent starvation.
 * Response Ratio = (Waiting Time + Burst Time) / Burst Time
 * 
 * @param {Array} processes - Array of Process objects
 * @returns {Object} { gantt, history, processes }
 */
export function scheduleHRRN(processes) {
    const procs = processes.map(p => p.clone());
    const gantt = [];
    const history = [];
    
    const upcoming = [...procs].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const readyQueue = [];
    const completed = [];
    let currentProcess = null;
    let t = 0;
    let contextSwitches = 0;
    let lastRunningPid = null;

    while (upcoming.length > 0 || readyQueue.length > 0 || currentProcess !== null) {
        // 1. Move arrived processes to ready queue
        for (let i = 0; i < upcoming.length; i++) {
            if (upcoming[i].arrivalTime === t) {
                readyQueue.push(upcoming[i]);
                upcoming.splice(i, 1);
                i--;
            }
        }

        // Calculate Response Ratios and sort ready queue when scheduler needs to make a decision
        if (currentProcess === null && readyQueue.length > 0) {
            // Sort ready queue by response ratio at current time t
            readyQueue.sort((a, b) => {
                const waitA = t - a.arrivalTime;
                const ratioA = (waitA + a.burstTime) / a.burstTime;
                
                const waitB = t - b.arrivalTime;
                const ratioB = (waitB + b.burstTime) / b.burstTime;

                if (ratioA !== ratioB) {
                    return ratioB - ratioA; // Descending order (highest ratio first)
                }
                return a.arrivalTime - b.arrivalTime; // Tie breaker: FCFS
            });

            currentProcess = readyQueue.shift();
            if (currentProcess.startTime === -1) {
                currentProcess.startTime = t;
                currentProcess.responseTime = t - currentProcess.arrivalTime;
            }

            if (lastRunningPid !== null && lastRunningPid !== currentProcess.id) {
                contextSwitches++;
            }
            lastRunningPid = currentProcess.id;

            gantt.push({
                pid: currentProcess.id,
                start: t,
                end: t
            });
        }

        // 3. Record history snapshot
        history.push({
            time: t,
            runningPid: currentProcess ? currentProcess.id : "IDLE",
            // Include dynamic response ratio in ready queue state for debugging/rendering if needed
            readyQueue: readyQueue.map(p => {
                const w = t - p.arrivalTime;
                const rr = ((w + p.burstTime) / p.burstTime).toFixed(2);
                return { id: p.id, remainingTime: p.remainingTime, priority: p.priority, responseRatio: rr };
            }),
            upcomingPids: upcoming.map(p => p.id),
            completedPids: completed.map(p => p.id),
            contextSwitches: contextSwitches
        });

        // 4. Run current process for 1 tick
        if (currentProcess !== null) {
            currentProcess.remainingTime--;
            gantt[gantt.length - 1].end = t + 1;

            if (currentProcess.remainingTime === 0) {
                currentProcess.completionTime = t + 1;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                completed.push(currentProcess);
                currentProcess = null;
            }
        } else {
            // Idle state
            if (gantt.length === 0 || gantt[gantt.length - 1].pid !== "IDLE") {
                gantt.push({
                    pid: "IDLE",
                    start: t,
                    end: t + 1
                });
            } else {
                gantt[gantt.length - 1].end = t + 1;
            }
        }

        t++;
    }

    history.push({
        time: t,
        runningPid: "IDLE",
        readyQueue: [],
        upcomingPids: [],
        completedPids: completed.map(p => p.id),
        contextSwitches: contextSwitches
    });

    return {
        gantt,
        history,
        processes: procs.map(p => {
            const comp = completed.find(c => c.id === p.id);
            if (comp) {
                p.startTime = comp.startTime;
                p.completionTime = comp.completionTime;
                p.waitingTime = comp.waitingTime;
                p.turnaroundTime = comp.turnaroundTime;
                p.responseTime = comp.responseTime;
            }
            return p;
        })
    };
}
