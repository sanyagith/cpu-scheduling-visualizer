/**
 * Non-Preemptive Shortest Job First (SJF) Scheduling Algorithm.
 * Schedules processes based on their burst times. Once a process gets the CPU,
 * it runs to completion (non-preemptive).
 * 
 * @param {Array} processes - Array of Process objects
 * @returns {Object} { gantt, history, processes }
 */
export function scheduleSJF(processes) {
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
        // 1. Move arrived processes to the ready queue
        for (let i = 0; i < upcoming.length; i++) {
            if (upcoming[i].arrivalTime === t) {
                readyQueue.push(upcoming[i]);
                upcoming.splice(i, 1);
                i--;
            }
        }

        // Sort ready queue by burst time. If burst times are equal, sort by arrival time.
        readyQueue.sort((a, b) => {
            if (a.burstTime !== b.burstTime) {
                return a.burstTime - b.burstTime;
            }
            return a.arrivalTime - b.arrivalTime;
        });

        // 2. Select next process if CPU is idle
        if (currentProcess === null && readyQueue.length > 0) {
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
            readyQueue: readyQueue.map(p => ({ id: p.id, remainingTime: p.remainingTime, priority: p.priority })),
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
